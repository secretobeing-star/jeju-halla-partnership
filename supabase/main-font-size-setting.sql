-- 메인 글씨 크기 설정 (개발자 모드 → 메인 설정 패널)

alter table public.site_settings
  add column if not exists main_font_size_enabled boolean not null default false;

notify pgrst, 'reload schema';
