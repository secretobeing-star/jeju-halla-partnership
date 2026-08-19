-- 하단 우측 소셜/외부 아이콘 링크 + 밝은/어두운 배경

alter table public.site_settings
  add column if not exists footer_dark_background_enabled boolean not null default false,
  add column if not exists footer_social_links jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
