-- Global system categories, available to every plan (plan_id is null).
insert into public.categories (is_system, plan_id, name, icon, color) values
  (true, null, 'Bolig', '🏠', '#8b5cf6'),
  (true, null, 'Strøm', '⚡', '#f59e0b'),
  (true, null, 'Abonnementer', '📺', '#ec4899'),
  (true, null, 'Dagligvarer', '🛒', '#16a34a'),
  (true, null, 'Transport', '🚗', '#0ea5e9'),
  (true, null, 'Forsikring', '🛡️', '#6366f1'),
  (true, null, 'Underholdning', '🎉', '#f43f5e'),
  (true, null, 'Annet', '📦', '#6b7280');
