-- 크롬 탭 / PWA 태스크바 테마 분리 + 태블릿·폴드 펼침 로딩 이미지

alter table public.site_settings
  add column if not exists site_pwa_chrome_tab_theme_color text,
  add column if not exists site_pwa_taskbar_theme_color text,
  add column if not exists site_pwa_loading_image_url_tablet text;

notify pgrst, 'reload schema';
