-- 제휴 즐겨찾기(기기 localStorage) 표시·문구 설정

alter table public.site_settings
  add column if not exists partner_favorites_enabled boolean not null default true,
  add column if not exists partner_favorites_label text,
  add column if not exists partner_favorites_empty_message text;

notify pgrst, 'reload schema';
