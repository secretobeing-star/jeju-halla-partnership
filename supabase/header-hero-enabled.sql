-- 메인 초록 히어로 영역(배지·타이틀·서브 설명) 표시 on/off
alter table public.site_settings
  add column if not exists header_hero_enabled boolean not null default true;

notify pgrst, 'reload schema';
