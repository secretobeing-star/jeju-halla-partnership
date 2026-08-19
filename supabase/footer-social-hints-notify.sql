-- 하단 아이콘 링크 힌트(호버·탭) / 클릭 알림(토스트)

alter table public.site_settings
  add column if not exists footer_social_hints_enabled boolean not null default true,
  add column if not exists footer_social_notify_enabled boolean not null default true;

notify pgrst, 'reload schema';
