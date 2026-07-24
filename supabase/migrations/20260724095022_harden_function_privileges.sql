-- Addresses warnings from `supabase db advisors --linked --type security`
-- after the initial schema was pushed:
--   - set_updated_at had a mutable search_path.
--   - handle_new_user (trigger-only, never called directly by clients),
--     is_plan_member, redeem_invite_code and propose_shared_plan were all
--     executable by `anon`, which none of them need.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger functions are invoked by the trigger mechanism itself, not via
-- a client-facing RPC call, so no role needs direct EXECUTE here.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Used internally by RLS policies (which run as `authenticated`), so
-- that role must keep EXECUTE; `anon` never reaches a policy that calls
-- it, since every policy using it is already scoped `to authenticated`.
revoke execute on function public.is_plan_member(uuid) from anon;

-- Both rely on auth.uid(), which is null for anon requests anyway -
-- revoking removes the unused exposed surface the advisor flagged.
revoke execute on function public.redeem_invite_code(text) from anon;
revoke execute on function public.propose_shared_plan(text, uuid) from anon;
