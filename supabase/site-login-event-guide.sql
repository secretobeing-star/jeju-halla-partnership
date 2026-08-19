-- 로그인 모달: 이벤트/로그인 안내 문구 추가

alter table public.site_settings
  add column if not exists site_login_event_guide_text text;

notify pgrst, 'reload schema';
