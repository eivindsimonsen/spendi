-- Recurring costs move from being scoped to one plan to being owned by
-- one person and following them into every plan they're a member of.
--
-- The old model forced you to re-enter the same rent/subscriptions in
-- each plan you belong to, even though what you actually pay every month
-- doesn't change with which budget you're looking at. `created_by`
-- already recorded whose cost it is, so it becomes the owner outright and
-- `plan_id` goes away; a plan's budget is now the union of its accepted
-- members' costs.

alter table public.recurring_costs rename column created_by to owner_id;

-- Anyone who had entered the same cost in more than one plan now holds
-- duplicates that would double-count in every budget. Keep the oldest of
-- each same-named set and retire the rest -- deactivated rather than
-- deleted, so the transactions that reference them keep their link.
with duplicates as (
  select
    id,
    row_number() over (
      partition by owner_id, lower(trim(name))
      order by created_at
    ) as copy_number
  from public.recurring_costs
  where active
)
update public.recurring_costs
set active = false
from duplicates
where duplicates.id = recurring_costs.id
  and duplicates.copy_number > 1;

-- Both policies read plan_id (the skips one through a subquery), so they
-- have to go before the column they depend on can be dropped.
drop policy "recurring_costs_plan_members" on public.recurring_costs;
drop policy "recurring_cost_skips_all_plan_members" on public.recurring_cost_skips;

drop index if exists public.recurring_costs_plan_id_idx;
alter table public.recurring_costs drop column plan_id;
create index recurring_costs_owner_id_idx on public.recurring_costs (owner_id);

-- "Do this person's costs concern me?" -- true for yourself, and for
-- anyone you share an accepted plan with. Same security definer + fixed
-- search_path reasoning as is_plan_member: it's called from policies on
-- tables the caller can't necessarily read directly.
create or replace function public.shares_plan_with(p_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_profile_id = auth.uid()
    or exists (
      select 1
      from public.plan_members mine
      join public.plan_members theirs on theirs.plan_id = mine.plan_id
      where mine.profile_id = auth.uid()
        and mine.status = 'accepted'
        and theirs.profile_id = p_profile_id
        and theirs.status = 'accepted'
    );
$$;

revoke execute on function public.shares_plan_with(uuid) from public;
grant execute on function public.shares_plan_with(uuid) to authenticated;

-- A cost is now personal property: your plan partners can see it (their
-- shared budget is built from it) but only you can add, change or remove
-- it -- unlike the plan-scoped rows around it, editing yours would
-- follow you into your own individual plan too.
create policy "recurring_costs_select_own_or_plan_peer" on public.recurring_costs
  for select to authenticated
  using (public.shares_plan_with(owner_id));

create policy "recurring_costs_insert_own" on public.recurring_costs
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "recurring_costs_update_own" on public.recurring_costs
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "recurring_costs_delete_own" on public.recurring_costs
  for delete to authenticated
  using (owner_id = auth.uid());

-- Skips stay a household action, not a personal one: "we didn't pay this
-- one this period" is something either partner can record about a cost in
-- a plan they share. A skip now follows the cost rather than a plan, so
-- it applies in every plan whose period starts on the same date -- which
-- matches what a skip means: the bill went unpaid, once.
create policy "recurring_cost_skips_owner_or_plan_peer" on public.recurring_cost_skips
  for all to authenticated
  using (
    exists (
      select 1 from public.recurring_costs
      where recurring_costs.id = recurring_cost_skips.recurring_cost_id
      and public.shares_plan_with(recurring_costs.owner_id)
    )
  )
  with check (
    exists (
      select 1 from public.recurring_costs
      where recurring_costs.id = recurring_cost_skips.recurring_cost_id
      and public.shares_plan_with(recurring_costs.owner_id)
    )
  );

-- The costs that apply to one plan: every accepted member's own list,
-- merged. Left as security invoker on purpose -- RLS then does the
-- gating, so a plan id you're not a member of simply matches nothing.
create or replace function public.list_plan_recurring_costs(p_plan_id uuid)
returns setof public.recurring_costs
language sql
set search_path = public
stable
as $$
  select recurring_costs.*
  from public.recurring_costs
  join public.plan_members on plan_members.profile_id = recurring_costs.owner_id
  where plan_members.plan_id = p_plan_id
    and plan_members.status = 'accepted'
    and recurring_costs.active
  order by recurring_costs.name;
$$;

revoke execute on function public.list_plan_recurring_costs(uuid) from public;
grant execute on function public.list_plan_recurring_costs(uuid) to authenticated;
