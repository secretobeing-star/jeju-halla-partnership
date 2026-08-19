-- Footer inline link (admin > 설정 > 메인 하단 문구)

alter table public.site_settings
  add column if not exists footer_link_label text,
  add column if not exists footer_link_url text;

notify pgrst, 'reload schema';
