-- Admin-managed board posts (hide user password edit/delete on public site)

alter table public.board_posts
  add column if not exists is_admin_managed boolean not null default false;

update public.board_posts
set is_admin_managed = true
where password_hash is null;

notify pgrst, 'reload schema';
