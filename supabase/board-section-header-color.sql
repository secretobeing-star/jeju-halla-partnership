-- 게시판 헤더(게시판/접기 영역) 색상 설정
alter table public.site_settings
  add column if not exists board_section_header_color text;
