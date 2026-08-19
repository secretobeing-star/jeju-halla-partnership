alter table public.site_settings
  add column if not exists site_pwa_permission_notification_request_title_ios text,
  add column if not exists site_pwa_permission_notification_request_message_ios text,
  add column if not exists site_pwa_permission_notification_denied_title_ios text,
  add column if not exists site_pwa_permission_notification_denied_message_ios text,
  add column if not exists site_pwa_permission_location_request_title_ios text,
  add column if not exists site_pwa_permission_location_request_message_ios text,
  add column if not exists site_pwa_permission_location_denied_title_ios text,
  add column if not exists site_pwa_permission_location_denied_message_ios text,
  add column if not exists site_pwa_permission_app_notification_denied_message_ios text,
  add column if not exists site_pwa_permission_app_location_denied_message_ios text;

notify pgrst, 'reload schema';
