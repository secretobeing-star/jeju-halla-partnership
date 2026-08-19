-- 이벤트 상단 메뉴: 아이콘 + 이름 + 힌트 + 클릭 알림
alter table public.site_settings
  add column if not exists site_events_icon_url text,
  add column if not exists site_events_label text,
  add column if not exists site_events_hint text,
  add column if not exists site_events_notify_message text;

notify pgrst, 'reload schema';
