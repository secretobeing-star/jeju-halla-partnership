-- 공지사항 문구 색상 설정
alter table public.site_settings
  add column if not exists notice_text_color text;
