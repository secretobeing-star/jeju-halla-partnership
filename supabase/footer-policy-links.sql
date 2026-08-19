-- Footer policy links: privacy policy + terms of service

alter table public.site_settings
  add column if not exists footer_privacy_policy_url text,
  add column if not exists footer_terms_url text;

notify pgrst, 'reload schema';
