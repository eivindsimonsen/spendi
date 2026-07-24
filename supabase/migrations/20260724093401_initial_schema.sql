-- Core domain tables for Spendi.
-- gen_random_uuid() is built into Postgres 13+, no extension needed.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- A budget/spending plan: either a user's own individual plan, or a
-- shared "Spendiplan" between two or more plan_members.
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('individual', 'shared')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Doubles as plan membership AND a pending shared-plan invite: proposing
-- a Spendiplan inserts the inviter as accepted/owner and the invitee as
-- pending, so accept/decline is a single UPDATE on this table.
create table public.plan_members (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'accepted' check (status in ('pending', 'accepted', 'declined')),
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (plan_id, profile_id)
);

-- A shareable code a user generates and sends to someone they already
-- know; redeeming it (via the redeem_invite_code function) creates a
-- friendship directly, with no separate pending/accept step.
create table public.friend_invite_codes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  redeemed_by uuid references public.profiles (id),
  redeemed_at timestamptz
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

-- Prevents duplicate/reversed friendship rows for the same pair.
create unique index friendships_unique_pair on public.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);

-- System categories are global (plan_id null); custom categories belong
-- to exactly one plan, so their visibility follows plan membership with
-- no extra rules needed.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans (id) on delete cascade,
  is_system boolean not null default false,
  name text not null,
  icon text,
  color text,
  created_at timestamptz not null default now(),
  check ((is_system and plan_id is null) or (not is_system and plan_id is not null))
);

create table public.recurring_costs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  name text not null,
  amount numeric(12, 2),
  is_variable boolean not null default false,
  active boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The "Legg til utgift" entries: actual logged spending. This is the
-- source data for both variable-cost rolling averages and history/stats.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  recurring_cost_id uuid references public.recurring_costs (id) on delete set null,
  amount numeric(12, 2) not null,
  occurred_on date not null,
  note text,
  paid_by uuid not null references public.profiles (id),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- One active salary/pay-schedule configuration per plan.
create table public.income_profiles (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null unique references public.plans (id) on delete cascade,
  monthly_salary numeric(12, 2) not null,
  payments_per_year numeric(4, 1) not null default 10.5,
  holiday_pay_month smallint not null default 6 check (holiday_pay_month between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  name text not null,
  target_amount numeric(12, 2) not null,
  target_date date not null,
  created_at timestamptz not null default now()
);

-- Goal progress is sum(amount) computed on read, never a stored running
-- total, so there's only one source of truth for "how much is saved."
create table public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.savings_goals (id) on delete cascade,
  amount numeric(12, 2) not null,
  occurred_on date not null,
  note text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index plan_members_profile_id_idx on public.plan_members (profile_id);
create index plan_members_plan_id_idx on public.plan_members (plan_id);
create index transactions_plan_id_occurred_on_idx on public.transactions (plan_id, occurred_on);
create index transactions_category_id_occurred_on_idx on public.transactions (category_id, occurred_on);
create index recurring_costs_plan_id_idx on public.recurring_costs (plan_id);
create index categories_plan_id_idx on public.categories (plan_id);
create index savings_contributions_goal_id_idx on public.savings_contributions (goal_id);

-- Keeps updated_at fresh without every service call setting it manually.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.recurring_costs
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.income_profiles
  for each row execute function public.set_updated_at();
