-- Redesign: budgeting moves from "static monthly salary, calendar month"
-- to "payday-to-payday period, actual logged income per period". The old
-- monthly_salary/payments_per_year/holiday_pay_month smoothing model is
-- no longer needed once real per-period amounts are logged directly.

alter table public.income_profiles
  drop column monthly_salary,
  drop column payments_per_year,
  drop column holiday_pay_month,
  add column payday smallint not null default 15 check (payday between 1 and 31);

-- The "Legg til lønn" log, parallel to transactions but for income.
-- Multiple rows can fall in the same pay period (e.g. a correction, or
-- more than one paycheck) -- the period's income is the sum of these.
create table public.income_payments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  amount numeric(12, 2) not null,
  received_on date not null,
  note text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index income_payments_plan_id_received_on_idx on public.income_payments (plan_id, received_on);

alter table public.income_payments enable row level security;

create policy "income_payments_plan_members" on public.income_payments
  for all to authenticated
  using (public.is_plan_member(plan_id))
  with check (public.is_plan_member(plan_id));
