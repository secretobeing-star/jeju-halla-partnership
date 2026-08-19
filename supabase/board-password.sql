alter table public.board_posts
  add column if not exists password_hash text;
