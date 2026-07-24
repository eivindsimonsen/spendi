-- Row Level Security: every table holds financial data scoped to a plan,
-- so access is gated by plan membership from day one.

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.friend_invite_codes enable row level security;
alter table public.friendships enable row level security;
alter table public.categories enable row level security;
alter table public.recurring_costs enable row level security;
alter table public.transactions enable row level security;
alter table public.income_profiles enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_contributions enable row level security;

-- security definer + a fixed search_path let this run as the function
-- owner (bypassing RLS) so checking plan_members from within a policy
-- ON plan_members doesn't trigger "infinite recursion detected in policy".
create or replace function public.is_plan_member(p_plan_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.plan_members
    where plan_id = p_plan_id
      and profile_id = auth.uid()
      and status = 'accepted'
  );
$$;

grant execute on function public.is_plan_member(uuid) to authenticated;

-- profiles: just a display name, so read access is open to any signed-in
-- user rather than requiring a heavier friendship/membership join.
create policy "profiles_select_any_authenticated" on public.profiles
  for select to authenticated
  using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
-- No insert policy: rows are created only by the handle_new_user trigger.

-- plans / plan_members: no client-facing insert policies. Every plan and
-- membership row is created by a security definer function
-- (handle_new_user for the individual plan, propose_shared_plan for a
-- shared one), so there's no client insert path to gate here.
create policy "plans_select_members" on public.plans
  for select to authenticated
  using (public.is_plan_member(id));

create policy "plan_members_select_own_or_fellow_member" on public.plan_members
  for select to authenticated
  using (profile_id = auth.uid() or public.is_plan_member(plan_id));

create policy "plan_members_respond_to_own_invite" on public.plan_members
  for update to authenticated
  using (profile_id = auth.uid() and status = 'pending')
  with check (profile_id = auth.uid());

-- friend_invite_codes: a user manages the codes they generate; redeeming
-- someone else's code goes through the redeem_invite_code function, not
-- a direct client update, so no cross-user policy is needed here.
create policy "friend_invite_codes_owner_manages" on public.friend_invite_codes
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- friendships: read-only for clients. Rows are only ever created by
-- redeem_invite_code.
create policy "friendships_select_own" on public.friendships
  for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));

-- categories: system categories are global reference data; custom ones
-- are scoped to a plan, so visibility/ownership follows plan membership.
create policy "categories_select_system_or_member" on public.categories
  for select to authenticated
  using (is_system or public.is_plan_member(plan_id));

create policy "categories_insert_custom" on public.categories
  for insert to authenticated
  with check (not is_system and public.is_plan_member(plan_id));

create policy "categories_update_custom" on public.categories
  for update to authenticated
  using (not is_system and public.is_plan_member(plan_id))
  with check (not is_system and public.is_plan_member(plan_id));

create policy "categories_delete_custom" on public.categories
  for delete to authenticated
  using (not is_system and public.is_plan_member(plan_id));

-- recurring_costs / transactions / income_profiles / savings_goals: full
-- CRUD for any accepted plan member. Not restricted to created_by --
-- this is a trusted household context, so partners can edit each
-- other's entries without friction.
create policy "recurring_costs_plan_members" on public.recurring_costs
  for all to authenticated
  using (public.is_plan_member(plan_id))
  with check (public.is_plan_member(plan_id));

create policy "transactions_plan_members" on public.transactions
  for all to authenticated
  using (public.is_plan_member(plan_id))
  with check (public.is_plan_member(plan_id));

create policy "income_profiles_plan_members" on public.income_profiles
  for all to authenticated
  using (public.is_plan_member(plan_id))
  with check (public.is_plan_member(plan_id));

create policy "savings_goals_plan_members" on public.savings_goals
  for all to authenticated
  using (public.is_plan_member(plan_id))
  with check (public.is_plan_member(plan_id));

create policy "savings_contributions_plan_members" on public.savings_contributions
  for all to authenticated
  using (public.is_plan_member((select plan_id from public.savings_goals where id = goal_id)))
  with check (public.is_plan_member((select plan_id from public.savings_goals where id = goal_id)));
