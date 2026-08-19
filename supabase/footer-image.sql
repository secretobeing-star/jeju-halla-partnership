-- Footer image (admin > 메인 하단 문구)

alter table public.site_settings
  add column if not exists footer_image_url text;

notify pgrst, 'reload schema';
