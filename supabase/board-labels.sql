alter table public.site_settings
  add column if not exists board_notice_label text not null default '공지',
  add column if not exists board_free_label text not null default '자유게시판',
  add column if not exists board_inquiry_label text not null default '건의/문의';
