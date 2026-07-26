-- Lets a user create an additional individual plan on demand (previously
-- the only individual plan was the one auto-created at signup). Mirrors
-- handle_new_user's plan-creation logic, callable any time.
create or replace function public.create_individual_plan(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
begin
  insert into public.plans (name, type, created_by)
  values (p_name, 'individual', auth.uid())
  returning id into v_plan_id;

  insert into public.plan_members (plan_id, profile_id, role, status, invited_by)
  values (v_plan_id, auth.uid(), 'owner', 'accepted', auth.uid());

  return v_plan_id;
end;
$$;

revoke execute on function public.create_individual_plan(text) from public;
grant execute on function public.create_individual_plan(text) to authenticated;

-- Plans previously had no delete policy at all (default-deny). Only the
-- plan's owner can delete it; every other table's plan_id foreign key is
-- already `on delete cascade`, so this cleanly removes all of that
-- plan's recurring costs, transactions, income, and savings goals too.
create policy "plans_delete_owner" on public.plans
  for delete to authenticated
  using (
    exists (
      select 1 from public.plan_members
      where plan_members.plan_id = plans.id
        and plan_members.profile_id = auth.uid()
        and plan_members.role = 'owner'
        and plan_members.status = 'accepted'
    )
  );
