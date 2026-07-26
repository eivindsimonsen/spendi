-- Payday becomes per-user-per-plan: in a shared Spendiplan, each member
-- can be paid on a different day (e.g. one partner on the 12th, the
-- other on the 15th), so each person now sets their own.
alter table public.income_profiles
  add column profile_id uuid references public.profiles (id);

-- Backfill existing rows onto the plan's owner, the only reasonable
-- guess for who a pre-existing single payday belonged to.
update public.income_profiles ip
set profile_id = (
  select pm.profile_id
  from public.plan_members pm
  where pm.plan_id = ip.plan_id and pm.role = 'owner'
  limit 1
)
where profile_id is null;

alter table public.income_profiles
  alter column profile_id set not null;

alter table public.income_profiles
  drop constraint income_profiles_plan_id_key;

alter table public.income_profiles
  add constraint income_profiles_plan_id_profile_id_key unique (plan_id, profile_id);

-- Any plan member can see everyone's payday, but only the owning
-- profile can set/change their own.
drop policy "income_profiles_plan_members" on public.income_profiles;

create policy "income_profiles_select_plan_members" on public.income_profiles
  for select to authenticated
  using (public.is_plan_member(plan_id));

create policy "income_profiles_write_own" on public.income_profiles
  for all to authenticated
  using (profile_id = auth.uid() and public.is_plan_member(plan_id))
  with check (profile_id = auth.uid() and public.is_plan_member(plan_id));

-- Categorize where logged income came from (Lønn/Bonus/Gave/...), and
-- make it easy to see who logged it via the existing created_by column.
alter table public.income_payments
  add column income_type text not null default 'Lønn';

-- A theme drives a savings goal's motivational icon + gradient on the
-- dashboard (e.g. vacation, wedding) -- no image upload/storage needed.
alter table public.savings_goals
  add column theme text not null default 'other'
  check (theme in ('vacation', 'wedding', 'home', 'car', 'education', 'other'));
