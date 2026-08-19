-- Quick fix: notice-items.sql failed (notice_text_link_url missing)

alter table public.site_settings
  add column if not exists notice_text_link_url text;

notify pgrst, 'reload schema';
