alter table public.site_settings
  add column if not exists free_board_enabled boolean not null default true,
  add column if not exists inquiry_board_enabled boolean not null default true,
  add column if not exists notice_text_enabled boolean not null default false,
  add column if not exists admin_comment_delete_protected boolean not null default true,
  add column if not exists partner_benefit_min_height_mobile integer not null default 150,
  add column if not exists partner_benefit_min_height_desktop integer not null default 200,
  add column if not exists board_notice_label text not null default '공지',
  add column if not exists board_free_label text not null default '자유게시판',
  add column if not exists board_inquiry_label text not null default '건의/문의',
  add column if not exists board_definitions jsonb not null default '[]'::jsonb;
