-- The old plans SELECT policy only allowed *accepted* members to read a
-- plan (via is_plan_member, which filters status = 'accepted'). That
-- means a user with a pending Spendiplan invite couldn't see the plan's
-- name to decide "Ja/Nei" on it. Widen it to anyone with ANY
-- plan_members row (pending or accepted) for that plan.
drop policy "plans_select_members" on public.plans;

create policy "plans_select_own_membership" on public.plans
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_members
      where plan_members.plan_id = plans.id
        and plan_members.profile_id = auth.uid()
    )
  );
