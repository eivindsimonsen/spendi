-- Lets a plan choose which discretionary-split model (see
-- core/discretionary-split.ts) its "Anbefalt budsjett" recommendation
-- uses, instead of always assuming the 50/30/20 rule.
alter table public.plans
  add column budget_model text not null default 'balanced-50-30-20';

-- No update policy existed on plans yet (only select + delete) -- any
-- accepted member can change this shared setting, consistent with the
-- rest of this app's trusted-household CRUD model (recurring_costs,
-- transactions, income_profiles etc. all allow full CRUD for any member).
create policy "plans_update_members" on public.plans
  for update to authenticated
  using (public.is_plan_member(id))
  with check (public.is_plan_member(id));
