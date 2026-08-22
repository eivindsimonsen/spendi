-- Same cleanup the earlier hardening migrations did for is_plan_member
-- and friends: the project's default privileges grant EXECUTE on every
-- new function to `anon` explicitly, so `revoke ... from public` in the
-- migration that created these two left that grant standing and
-- `supabase db advisors --type security` flagged shares_plan_with.
--
-- Both rely on auth.uid(), which is null for anon requests anyway --
-- revoking removes exposed surface neither function has a use for.
revoke execute on function public.shares_plan_with(uuid) from anon;
revoke execute on function public.list_plan_recurring_costs(uuid) from anon;
