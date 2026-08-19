alter table public.site_settings
  add column if not exists site_events_label text,
  add column if not exists site_events_hint text,
  add column if not exists site_events_notify_message text;

notify pgrst, 'reload schema';
