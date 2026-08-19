-- Run AFTER creating admin user in Supabase Authentication.
-- Dashboard → Authentication → Users → copy User UID

-- Replace these two values:
--   YOUR_ADMIN_USER_ID  → Authentication user UUID
--   your@email.com      → same email as Auth user

insert into public.admin_user_permissions (
  user_id,
  email,
  role,
  is_active,
  can_settings,
  can_ads,
  can_partners,
  can_board_settings,
  can_boards,
  can_posts,
  can_developer,
  can_permissions
)
values (
  'YOUR_ADMIN_USER_ID'::uuid,
  'edsf4444@naver.com',
  'developer',
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true
)
on conflict (user_id) do update set
  email = excluded.email,
  role = excluded.role,
  is_active = excluded.is_active,
  can_settings = excluded.can_settings,
  can_ads = excluded.can_ads,
  can_partners = excluded.can_partners,
  can_board_settings = excluded.can_board_settings,
  can_boards = excluded.can_boards,
  can_posts = excluded.can_posts,
  can_developer = excluded.can_developer,
  can_permissions = excluded.can_permissions,
  updated_at = now();

notify pgrst, 'reload schema';
