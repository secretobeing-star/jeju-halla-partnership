-- PWA 로딩 — Fold8 와이드 커버(10:16) · Fold8 Ultra 펼침(10:9)

alter table public.site_settings
  add column if not exists site_pwa_loading_image_url_fold_cover text,
  add column if not exists site_pwa_loading_image_url_tablet_ultra text;

notify pgrst, 'reload schema';
