-- Footer settings (run once in Supabase SQL Editor)
-- admin > 메인 설정 > 메인 하단 문구

alter table public.site_settings
  add column if not exists footer_privacy_policy_url text,
  add column if not exists footer_terms_url text,
  add column if not exists footer_business_line1 text,
  add column if not exists footer_business_line2 text,
  add column if not exists footer_copyright text,
  add column if not exists footer_image_url text,
  add column if not exists footer_image2_url text;

notify pgrst, 'reload schema';
