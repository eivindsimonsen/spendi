-- A one-time, self-expiring "my pay arrived early" override for the
-- current pay period only (e.g. payday falls on a weekend and the
-- employer pays the working day before). Written only to the owning
-- member's own row -- see income_profiles_write_own -- so it can never
-- affect another Spendiplan member's own period.
alter table public.income_profiles
  add column period_override_start date;
