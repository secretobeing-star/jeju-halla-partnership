-- Footer and settings panel notice text colors

alter table public.site_settings
  add column if not exists footer_text_color text,
  add column if not exists settings_panel_notice_color text;

notify pgrst, 'reload schema';
