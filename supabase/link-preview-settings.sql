-- 링크 미리보기(카카오톡·SNS 공유) 전용 설정
alter table public.site_settings
  add column if not exists link_preview_title text,
  add column if not exists link_preview_description text,
  add column if not exists link_preview_image_url text;

notify pgrst, 'reload schema';
