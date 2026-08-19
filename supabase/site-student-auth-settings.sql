-- 학생증 · 제주한라대 학생 인증 설정

alter table public.site_settings
  add column if not exists site_student_id_enabled boolean not null default false,
  add column if not exists site_student_id_pwa_swipe_enabled boolean not null default true,
  add column if not exists site_student_id_card_title text,
  add column if not exists site_student_auth_guide_title text,
  add column if not exists site_student_auth_guide_body text,
  add column if not exists site_student_auth_guide_image_url text,
  add column if not exists site_student_auth_button_label text,
  add column if not exists site_student_sheets_spreadsheet_id text,
  add column if not exists site_student_sheets_log_tab text,
  add column if not exists site_student_sheets_approval_tab text,
  add column if not exists site_student_pending_message text;

notify pgrst, 'reload schema';
