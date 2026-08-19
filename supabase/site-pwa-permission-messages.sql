alter table public.site_settings
  add column if not exists site_pwa_permission_notification_request_title text,
  add column if not exists site_pwa_permission_notification_request_message text,
  add column if not exists site_pwa_permission_notification_denied_title text,
  add column if not exists site_pwa_permission_notification_denied_message text,
  add column if not exists site_pwa_permission_location_request_title text,
  add column if not exists site_pwa_permission_location_request_message text,
  add column if not exists site_pwa_permission_location_denied_title text,
  add column if not exists site_pwa_permission_location_denied_message text,
  add column if not exists site_pwa_permission_app_notification_denied_message text,
  add column if not exists site_pwa_permission_app_location_denied_message text;

notify pgrst, 'reload schema';
