alter table public.site_settings
  add column if not exists site_kakao_in_app_guide_ios_popup_title text,
  add column if not exists site_kakao_in_app_guide_ios_popup_message text,
  add column if not exists site_kakao_in_app_guide_ios_popup_steps text,
  add column if not exists site_kakao_in_app_guide_ios_safari_open_label text;

notify pgrst, 'reload schema';
