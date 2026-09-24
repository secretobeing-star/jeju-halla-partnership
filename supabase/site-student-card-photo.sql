-- 학생증 사진 URL — 기기 간 동기화

alter table if exists public.site_student_card_settings
  add column if not exists photo_url text;

notify pgrst, 'reload schema';
