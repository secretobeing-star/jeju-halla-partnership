-- Footer business info + copyright (admin > 메인 하단 문구)

alter table public.site_settings
  add column if not exists footer_business_line1 text,
  add column if not exists footer_business_line2 text,
  add column if not exists footer_copyright text;

notify pgrst, 'reload schema';
