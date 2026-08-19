-- Pinned board posts (admin toggle in 게시글 관리)

alter table public.board_posts
  add column if not exists is_pinned boolean not null default false;

alter table public.board_posts
  add column if not exists pinned_at timestamptz;

create index if not exists board_posts_pinned_idx
  on public.board_posts (board_type, is_pinned desc, pinned_at desc nulls last, created_at desc);
