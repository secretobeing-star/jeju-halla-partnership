-- OS 푸시 알림 아이콘·이미지 커스터마이즈

alter table public.site_settings
  add column if not exists site_push_icon_url text,
  add column if not exists site_push_badge_url text;

alter table public.site_notifications
  add column if not exists icon_url text,
  add column if not exists image_url text;

notify pgrst, 'reload schema';
