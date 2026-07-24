-- On signup: create the profile and an auto-owned individual plan, so
-- the app never has to handle "user exists but has no plan yet".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
  v_display_name text;
begin
  v_display_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));

  insert into public.profiles (id, display_name)
  values (new.id, v_display_name);

  insert into public.plans (name, type, created_by)
  values ('Mitt budsjett', 'individual', new.id)
  returning id into v_plan_id;

  insert into public.plan_members (plan_id, profile_id, role, status, invited_by)
  values (v_plan_id, new.id, 'owner', 'accepted', new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Redeeming a friend's invite code creates the friendship directly (no
-- pending state) since sharing/redeeming a code is itself the mutual
-- opt-in. security definer lets this bypass the owner-only RLS policy
-- on friend_invite_codes so the redeemer (who isn't the code's owner)
-- can mark it used, all inside one transaction to avoid a race on
-- double-redeeming the same code.
create or replace function public.redeem_invite_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.friend_invite_codes%rowtype;
  v_friendship_id uuid;
begin
  select * into v_invite
  from public.friend_invite_codes
  where code = p_code
    and redeemed_by is null
    and (expires_at is null or expires_at > now())
  for update;

  if not found then
    raise exception 'Invalid or already-used invite code';
  end if;

  if v_invite.owner_id = auth.uid() then
    raise exception 'You cannot redeem your own invite code';
  end if;

  update public.friend_invite_codes
  set redeemed_by = auth.uid(), redeemed_at = now()
  where id = v_invite.id;

  insert into public.friendships (requester_id, addressee_id)
  values (v_invite.owner_id, auth.uid())
  returning id into v_friendship_id;

  return v_friendship_id;
end;
$$;

grant execute on function public.redeem_invite_code(text) to authenticated;

-- Proposing a Spendiplan creates the shared plan and both membership
-- rows (inviter accepted/owner, invitee pending) atomically. Requires an
-- existing friendship so a plan can't be proposed to a stranger.
create or replace function public.propose_shared_plan(p_name text, p_invitee_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
  v_are_friends boolean;
begin
  select exists (
    select 1 from public.friendships
    where (requester_id = auth.uid() and addressee_id = p_invitee_id)
       or (requester_id = p_invitee_id and addressee_id = auth.uid())
  ) into v_are_friends;

  if not v_are_friends then
    raise exception 'You can only start a Spendiplan with a friend';
  end if;

  insert into public.plans (name, type, created_by)
  values (p_name, 'shared', auth.uid())
  returning id into v_plan_id;

  insert into public.plan_members (plan_id, profile_id, role, status, invited_by)
  values (v_plan_id, auth.uid(), 'owner', 'accepted', auth.uid());

  insert into public.plan_members (plan_id, profile_id, role, status, invited_by)
  values (v_plan_id, p_invitee_id, 'member', 'pending', auth.uid());

  return v_plan_id;
end;
$$;

grant execute on function public.propose_shared_plan(text, uuid) to authenticated;
