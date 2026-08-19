-- 메인 화면 제휴 업체 지도

alter table public.site_settings
  add column if not exists main_partner_map_enabled boolean not null default false,
  add column if not exists main_partner_map_title text,
  add column if not exists main_partner_map_default_expanded boolean not null default true;

notify pgrst, 'reload schema';
