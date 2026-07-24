-- The previous migration's `revoke ... from anon` didn't clear the
-- advisor warning because Postgres grants new functions EXECUTE via the
-- PUBLIC pseudo-role by default -- anon inherits through PUBLIC
-- regardless of a role-specific revoke. Revoking from PUBLIC actually
-- closes it; the existing explicit grants to `authenticated` (added
-- when each function was created) still stand independently.
revoke execute on function public.is_plan_member(uuid) from public;
revoke execute on function public.redeem_invite_code(text) from public;
revoke execute on function public.propose_shared_plan(text, uuid) from public;
