alter table public.site_settings
  add column if not exists error_pages_enabled boolean not null default true;

alter table public.site_settings
  add column if not exists error_page_logo_url text;

alter table public.site_settings
  add column if not exists error_page_bg_color text;

alter table public.site_settings
  add column if not exists error_page_text_color text;

alter table public.site_settings
  add column if not exists error_page_button_bg_color text;

alter table public.site_settings
  add column if not exists error_page_button_text_color text;

alter table public.site_settings
  add column if not exists error_page_button_label text;

alter table public.site_settings
  add column if not exists error_page_not_found_title text;

alter table public.site_settings
  add column if not exists error_page_not_found_message text;

alter table public.site_settings
  add column if not exists error_page_server_error_title text;

alter table public.site_settings
  add column if not exists error_page_server_error_message text;

notify pgrst, 'reload schema';
