-- 상단 메뉴 아이콘 힌트(호버·탭) / 클릭 알림(토스트)
-- site_nav_links JSON 항목에 hint, notify_message 필드를 추가로 저장합니다.

alter table public.site_settings
  add column if not exists site_nav_hints_enabled boolean not null default true,
  add column if not exists site_nav_notify_enabled boolean not null default true;

notify pgrst, 'reload schema';
