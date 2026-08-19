-- 공지사항 문구 링크 설정
alter table public.site_settings
  add column if not exists notice_text_link_url text;
