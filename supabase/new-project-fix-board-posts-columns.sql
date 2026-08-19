-- Quick fix: board-hidden-posts-public.sql failed (column is_secret does not exist)
-- Run this, then re-run from "-- >>> BEGIN board-hidden-posts-public.sql" in new-project-full.sql

alter table public.board_posts
  add column if not exists view_count integer not null default 0,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz,
  add column if not exists like_count integer not null default 0,
  add column if not exists dislike_count integer not null default 0,
  add column if not exists is_secret boolean not null default false;

notify pgrst, 'reload schema';
