-- Quick fix: board-secret-comments.sql failed (is_board_admin_secret_comments_main_visible_enabled missing)
-- Run this, then re-run from "-- >>> BEGIN board-secret-comments.sql" in new-project-full.sql

alter table public.board_posts
  add column if not exists admin_visible_password text;

alter table public.board_comments
  add column if not exists admin_visible_password text;

create or replace function public.is_admin_user_password_visible()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select false;
$$;

create or replace function public.is_board_admin_secret_comments_main_visible_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select false;
$$;

notify pgrst, 'reload schema';
