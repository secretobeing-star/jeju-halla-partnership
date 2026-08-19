-- 학생증 카드 브랜딩(학교 로고·이름·중앙 이미지·뒷배경)

alter table public.site_settings
  add column if not exists site_student_card_school_logo_url text,
  add column if not exists site_student_card_school_name text,
  add column if not exists site_student_card_center_image_url text,
  add column if not exists site_student_card_center_image_opacity double precision,
  add column if not exists site_student_card_background_url text,
  add column if not exists site_student_card_background_opacity double precision;

notify pgrst, 'reload schema';
