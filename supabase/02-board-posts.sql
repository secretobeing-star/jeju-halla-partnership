-- ============================================================
-- [2단계] 1단계 성공 후 실행
-- ============================================================

create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  board_type text not null check (board_type in ('notice', 'free', 'inquiry')),
  title text not null,
  content text not null default '',
  author_name text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists board_posts_type_created_idx
  on public.board_posts (board_type, created_at desc);

alter table public.board_posts enable row level security;

drop policy if exists "board_posts_public_read" on public.board_posts;
create policy "board_posts_public_read"
  on public.board_posts for select to anon, authenticated
  using (is_hidden = false);

drop policy if exists "board_posts_public_insert" on public.board_posts;
create policy "board_posts_public_insert"
  on public.board_posts for insert to anon, authenticated
  with check (board_type in ('free', 'inquiry'));

drop policy if exists "board_posts_admin_select" on public.board_posts;
create policy "board_posts_admin_select"
  on public.board_posts for select to authenticated using (true);

drop policy if exists "board_posts_admin_insert" on public.board_posts;
create policy "board_posts_admin_insert"
  on public.board_posts for insert to authenticated with check (true);

drop policy if exists "board_posts_admin_update" on public.board_posts;
create policy "board_posts_admin_update"
  on public.board_posts for update to authenticated using (true) with check (true);

drop policy if exists "board_posts_admin_delete" on public.board_posts;
create policy "board_posts_admin_delete"
  on public.board_posts for delete to authenticated using (true);
