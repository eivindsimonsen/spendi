-- Supabase's default privileges grant new functions EXECUTE to `anon`
-- directly (not just via PUBLIC), so the previous migration's
-- `revoke ... from public` didn't fully close this off -- same fix as
-- applied to is_plan_member/redeem_invite_code/propose_shared_plan
-- earlier.
revoke execute on function public.create_individual_plan(text) from anon;
