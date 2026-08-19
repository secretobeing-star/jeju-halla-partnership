-- 카카오톡 인앱 안내 — Android 삼성 인터넷 열기 버튼

alter table public.site_settings
  add column if not exists site_kakao_in_app_guide_samsung_button_label text;

notify pgrst, 'reload schema';
