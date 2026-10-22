-- Unforeseen expenses ("transactions") move from being scoped to one plan
-- to being owned by whoever paid, following them into every plan they're
-- a member of -- the same move recurring costs made in
-- 20260822092426_global_recurring_costs.
--
-- Money you spent is gone no matter which budget you're looking at, so
-- logging it in only the plan that happened to be active left every
-- other budget overstating what's left. `paid_by` already records whose
-- expense it is, so it becomes the owner outright and `plan_id` goes
-- away; a plan's expenses are now the union of its accepted members'.

-- Anyone who logged the same expense into more than one plan to work
-- around the old model now holds copies that would double-count in every
-- budget. A copy is a row with the same payer, category, amount, date and
-- note in a *different* plan; identical rows within one plan are separate
-- purchases and stay. Categories are compared by name, not id: a custom
-- category belongs to one plan, so the same "Gave" in two plans is two
-- category rows. Numbering each plan's identical rows (1st, 2nd, ...) and
-- keeping only the oldest 1st, the oldest 2nd, and so on keeps as many as
-- the plan that logged the most of them.
with fingerprinted as (
  select
    transactions.id,
    transactions.created_at,
    transactions.plan_id,
    transactions.paid_by,
    transactions.amount,
    transactions.occurred_on,
    lower(trim(categories.name)) as category_name,
    lower(trim(coalesce(transactions.note, ''))) as normalized_note
  from public.transactions
  join public.categories on categories.id = transactions.category_id
),
numbered as (
  select
    *,
    row_number() over (
      partition by paid_by, category_name, amount, occurred_on, normalized_note, plan_id
      order by created_at
    ) as nth_in_plan
  from fingerprinted
),
copies as (
  select
    id,
    row_number() over (
      partition by paid_by, category_name, amount, occurred_on, normalized_note, nth_in_plan
      order by created_at
    ) as copy_number
  from numbered
)
delete from public.transactions
using copies
where copies.id = transactions.id
  and copies.copy_number > 1;

-- The note was doing a name's job all along ("Bompenger", "Tannlege"),
-- and the budget now lists each expense by it, so it becomes a required
-- name. Any expense logged without one is named after its category.
alter table public.transactions rename column note to name;

update public.transactions
set name = categories.name
from public.categories
where categories.id = transactions.category_id
  and (transactions.name is null or trim(transactions.name) = '');

alter table public.transactions alter column name set not null;

-- The old policy reads plan_id, so it has to go before the column can.
drop policy "transactions_plan_members" on public.transactions;

drop index if exists public.transactions_plan_id_occurred_on_idx;
alter table public.transactions drop column plan_id;
create index transactions_paid_by_occurred_on_idx on public.transactions (paid_by, occurred_on);

-- Same rules as recurring costs: your plan partners can see your expenses
-- (their shared budget is built from them), but only you can add, change
-- or remove one -- removing it there would take it out of your own
-- individual plan too.
create policy "transactions_select_own_or_plan_peer" on public.transactions
  for select to authenticated
  using (public.shares_plan_with(paid_by));

create policy "transactions_insert_own" on public.transactions
  for insert to authenticated
  with check (paid_by = auth.uid());

create policy "transactions_update_own" on public.transactions
  for update to authenticated
  using (paid_by = auth.uid())
  with check (paid_by = auth.uid());

create policy "transactions_delete_own" on public.transactions
  for delete to authenticated
  using (paid_by = auth.uid());

-- The expenses that apply to one plan: every accepted member's own,
-- merged. Security invoker like list_plan_recurring_costs, so RLS does
-- the gating. Returns rows rather than taking date/category arguments:
-- PostgREST filters and orders a set-returning function's result like a
-- table, so callers narrow it with the usual .gte()/.eq()/.order().
create or replace function public.list_plan_transactions(p_plan_id uuid)
returns setof public.transactions
language sql
set search_path = public
stable
as $$
  select transactions.*
  from public.transactions
  join public.plan_members on plan_members.profile_id = transactions.paid_by
  where plan_members.plan_id = p_plan_id
    and plan_members.status = 'accepted';
$$;

-- Default privileges grant EXECUTE to anon explicitly, so revoking from
-- public alone isn't enough (see 20260822093910_harden_recurring_cost_functions).
revoke execute on function public.list_plan_transactions(uuid) from public;
revoke execute on function public.list_plan_transactions(uuid) from anon;
grant execute on function public.list_plan_transactions(uuid) to authenticated;
