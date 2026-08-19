-- Main page settings panel notice text and optional URL (admin > 설정 tab)

alter table public.site_settings
  add column if not exists settings_panel_notice_text text;

alter table public.site_settings
  add column if not exists settings_panel_notice_url text;

alter table public.site_settings
  add column if not exists settings_panel_enabled boolean not null default false;

notify pgrst, 'reload schema';
