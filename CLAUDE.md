# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck (`vue-tsc -b`) then production build
- `npm run typecheck` — `vue-tsc -b --noEmit` only
- `npm run test` — run the full vitest suite once
- `npm run test:watch` — vitest in watch mode
- Run a single test file: `npx vitest run src/core/pay-schedule.test.ts`
- `npm run lint` — ESLint (flat config, `eslint.config.js`)
- `npm run format` — Prettier, writes in place

Supabase (project is linked locally, no re-auth needed from this checkout):

- `npx supabase migration new <name>` — new migration file under `supabase/migrations/`
- `npx supabase db push --linked` — apply pending migrations to the live project
- `npx supabase db query --linked "<sql>"` — ad-hoc query against the live database
- `npx supabase db advisors --linked --type security` — Supabase's security linter (RLS/privilege issues)

## Architecture

Spendi is a Vue 3 + TypeScript + Supabase budgeting PWA for a household of two. Plain CSS only (no Tailwind/CSS-in-JS/UI library), mobile-first throughout. All identifiers and comments are in English; user-facing UI text is in Norwegian (Bokmål) — this is intentional, not inconsistent.

### Layering and data flow

Strict one-way dependency chain, enforced by convention (not by a lint rule):

```
views/components → stores (Pinia) → services → src/lib/supabase.ts
```

- **`src/services/*.service.ts`** — the only files that import `@supabase/supabase-js` calls. One file per DB table/domain (e.g. `transactions.service.ts`, `categories.service.ts`). Never call `supabase` directly from a component or store — always through a service, and never let a service file grow to cover more than one entity (this repo was deliberately structured to avoid a single do-everything Supabase file).
- **`src/stores/*.store.ts`** — Pinia setup stores. Call services, hold reactive state, expose actions. Not strictly 1:1 with DB tables (e.g. `plans.store.ts` also owns plan-membership/invite state) where that groups related UI-facing state more sensibly.
- **`src/core/*.ts`** — pure, framework-agnostic TypeScript. No Vue imports, no Supabase imports. This is where all budget/savings/stats math lives, so it's unit-testable without mocking anything. Every `*.ts` file here has a matching `*.test.ts`.
- **`src/composables/*.ts`** — thin Vue-specific glue where a store alone is awkward to consume directly in a component (e.g. `useCurrentPlan`, `useCategoryLabel`).

### The explainability pattern

This is the app's signature UX requirement: every calculated/estimated value shown to the user has an info icon that explains exactly how it was produced. Concretely:

- `src/core/types/calculation-result.ts` defines `CalculationResult<T>` — `{ value, model, summary, steps[] }`. Every pure function in `src/core/` that produces a user-facing number returns this shape instead of a bare number, _including_ trivial manual-entry values (tagged `model: 'manual-entry'`) — so the UI never has to special-case "was this calculated or not."
- `src/components/common/ExplainableValue.vue` renders a formatted value plus an info icon; tapping it opens `ExplainModal.vue` (built on the generic `BaseModal.vue` bottom-sheet), which walks through the `steps[]` trace. One `CalculationResult` per displayed number, not one per page/section.
- When adding a new calculated figure anywhere in the app, it must go through this same pattern — return a `CalculationResult`, don't just compute and display a number.

### Domain model

- **Plans** (`plans` table) are the unit budgets/income/savings are scoped to (recurring costs and transactions are the exception — see below). Every user gets an `individual` plan auto-created at signup (via the `handle_new_user` Postgres trigger). A `shared` plan ("Spendiplan") can be proposed between friends (`propose_shared_plan` RPC) and is accepted/declined via a row in `plan_members`.
- `plans.store.ts` tracks `myPlans` (every plan the user belongs to) and `activePlanId`/`activePlan` — there is one active-plan concept for the whole app (switched via the shared `PlanPicker` on `OverviewView` and `SavingsView`), not a separate plan state per feature. `useCurrentPlan()` composable exposes `activePlan` as `currentPlan` for views to consume.
- **Income is logged per pay period, not a static monthly salary.** `income_profiles` just stores a `payday` (day-of-month); `core/pay-schedule.ts` computes the pay-period window (`getPayPeriod`) from it. Actual income for a period comes from summing `income_payments` rows logged by the user for that period (`core/budget-recommendation.ts` takes this sum as `loggedIncomeAmount` — there is no salary estimate/fallback by deliberate product decision).
- **Recurring costs** (`recurring_costs`) are owned by a person (`owner_id`), not a plan — what you pay every month doesn't change with which budget you're looking at, so one list follows you into every plan you're a member of. A plan's budget is the union of its accepted members' costs, fetched via the `list_plan_recurring_costs` RPC; `RecurringCostsView` edits only your own (`listMine`). Hence the two lists in `recurring-costs.store.ts` (`myCosts` / `planCosts`). A cost can be fixed (`amount`) or `is_variable` (e.g. electricity), in which case `core/variable-cost-estimator.ts` averages the last N calendar months of actual `transactions` in that category, falling back to the manual `amount` when there's no history yet.
- **Transactions** are manually logged one-off expenses ("Uforutsett utgift" in the UI) — the only way spending data enters the app (no bank sync). Like recurring costs they're owned by a person (`paid_by`), not a plan, so one expense counts in every plan you're a member of; a plan's expenses are its accepted members' union, fetched via the `list_plan_transactions` RPC (its result is filtered/ordered client-side like a table). Each has a required `name`. They feed the variable-cost rolling average, the History view's stats, and the budget: `core/unforeseen-expenses.ts` picks the current period's expenses (minus those in a variable cost's category, which its average already counts), and `buildBudgetRecommendation` deducts them before the discretionary split.
- **Categories** are either system-wide (`is_system = true`, `plan_id = null`, seeded once via migration) or custom per plan. `categoriesService.listVisible()` deliberately takes no plan filter: a recurring cost follows you between plans, so its category has to resolve in all of them, and the select policy already scopes rows to system + your plans.
- RLS gates everything by plan membership via a `security definer` helper `is_plan_member(plan_id)` (checks `plan_members.status = 'accepted'`); recurring costs, their skips and transactions use the sibling helper `shares_plan_with(profile_id)` instead, since they're personal rather than plan-scoped — a plan partner can read your costs and expenses (and skip a cost for a period), but only you can add, edit or remove them. Friend-invite redemption and shared-plan proposals go through `security definer` RPC functions (`redeem_invite_code`, `propose_shared_plan`) rather than raw client inserts, so the more complex multi-row/multi-table logic doesn't need permissive client-facing insert policies.

### Rewards (milestones, streak, badges)

Savings motivation is derived, never stored: `core/savings-milestones.ts` (25/50/75/100 % per goal), `core/savings-streak.ts` (pay periods in a row with a contribution — a `CalculationResult` with `unit: 'perioder'`, so it gets an info icon like any other figure), `core/achievements.ts` (badges as predicates over `SavingsStats`) and `core/motivation.ts` (the Overview's daily line) all compute from the active plan's goals/contributions plus its payday. Badges are per plan and count the whole household's savings, never who contributed what — deliberately cooperative, not competitive. `useSavingsProgress()` ties them together and its `withCelebrations(action, goalId?)` diffs before/after an action to queue confetti (`celebration.store.ts` → `CelebrationOverlay.vue`), so a celebration only fires for something that just happened on that screen. Short confirmations ("… er lagt til") go through `toast.store.ts` → `AppToast.vue` instead.

### Design tokens & CSS

`src/styles/tokens.css` (custom properties: `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`) → `base.css` (reset + generic reusable classes: `.form`, `.button-primary`, `.card`, `.progress-track`/`.progress-fill`, `.button-danger-link`, etc.) → `global.css` (imports both, the only stylesheet `main.ts` imports). Prefer adding a shared class in `base.css` over duplicating styles across view `<style scoped>` blocks — several existing patterns (progress bars, card layout, danger-link buttons) were consolidated this way after appearing in 3+ places.

Mobile-first: unprefixed rules are the mobile layout, `@media (min-width: …)` progressively enhances upward — never the reverse.

### Testing

Vitest is configured with `pool: 'threads'` in `vitest.config.ts` (the default `forks` pool times out spawning workers in some environments). Priority for what's worth unit testing: the `src/core/*` calculation functions (pure, high-value, easy to get subtly wrong — date-boundary and edge-case bugs especially). Services and stores are thin pass-through layers and aren't unit tested.

### PWA

`vite-plugin-pwa` precaches only the built app shell (`workbox.globPatterns` in `vite.config.ts`) — deliberately no `runtimeCaching` for Supabase API calls, since offline-first was descoped and showing stale financial data offline would be worse than requiring network. App icons are generated from an inline SVG via `scripts/generate-icons.mjs` (needs `sharp` installed temporarily, it's not a project dependency — see the script's header comment).
