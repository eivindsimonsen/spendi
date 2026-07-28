-- Lets a recurring cost be skipped for a single pay period (e.g. "we
-- didn't have to pay this one this month") without deactivating it
-- permanently -- it's excluded from that period's budget totals but
-- still shows up so it can be brought back.
create table public.recurring_cost_skips (
  id uuid primary key default gen_random_uuid(),
  recurring_cost_id uuid not null references public.recurring_costs (id) on delete cascade,
  period_start date not null,
  created_at timestamptz not null default now(),
  unique (recurring_cost_id, period_start)
);

create index recurring_cost_skips_recurring_cost_id_idx on public.recurring_cost_skips (recurring_cost_id);

alter table public.recurring_cost_skips enable row level security;

-- Visibility/ownership follows the recurring cost's plan membership,
-- same trusted-household CRUD model as recurring_costs itself.
create policy "recurring_cost_skips_all_plan_members" on public.recurring_cost_skips
  for all to authenticated
  using (
    exists (
      select 1 from public.recurring_costs
      where recurring_costs.id = recurring_cost_skips.recurring_cost_id
      and public.is_plan_member(recurring_costs.plan_id)
    )
  )
  with check (
    exists (
      select 1 from public.recurring_costs
      where recurring_costs.id = recurring_cost_skips.recurring_cost_id
      and public.is_plan_member(recurring_costs.plan_id)
    )
  );
