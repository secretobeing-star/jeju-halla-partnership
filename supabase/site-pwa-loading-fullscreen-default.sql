-- PWA 로딩 이미지 전체 화면 표시를 기본값(true)으로 변경
alter table public.site_settings
  alter column site_pwa_loading_image_fullscreen set default true;

update public.site_settings
set site_pwa_loading_image_fullscreen = true
where id = 1;

notify pgrst, 'reload schema';
