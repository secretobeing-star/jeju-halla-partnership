-- 학생증 꾸미기 · 테두리(Frame) 아이템 카탈로그

alter table public.site_settings
  add column if not exists site_student_card_frames jsonb;

notify pgrst, 'reload schema';
