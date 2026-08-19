-- 사이트 크기 +/- 플로ating 버튼 (admin > 개발자 모드 > 설정)

alter table public.site_settings
  add column if not exists main_site_size_floating_enabled boolean not null default false;

notify pgrst, 'reload schema';
