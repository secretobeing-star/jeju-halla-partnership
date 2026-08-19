alter table public.site_settings
  add column if not exists site_kakao_in_app_guide_safari_button_label text;

notify pgrst, 'reload schema';
