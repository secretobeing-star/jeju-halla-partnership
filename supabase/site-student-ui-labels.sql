-- 학생증 UI 문구(정보 기입 폼·카드 라벨) 커스텀

alter table public.site_settings
  add column if not exists site_student_ui_labels jsonb;

notify pgrst, 'reload schema';
