-- Run in Supabase SQL Editor

alter table public.site_settings
  add column if not exists admin_comment_delete_protected boolean not null default true;

alter table public.board_comments
  add column if not exists is_admin_managed boolean not null default false;

update public.board_comments
set is_admin_managed = true
where password_hash = 'admin-managed';

create or replace function public.delete_user_board_comment(
  p_id uuid,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
begin
  select password_hash into stored_hash from board_comments where id = p_id and is_hidden = false;

  if stored_hash is null then
    raise exception 'Incorrect password';
  end if;

  if stored_hash = 'admin-managed' then
    raise exception 'Cannot delete admin comment';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  delete from board_comments where id = p_id;
  return true;
end;
$$;

grant execute on function public.delete_user_board_comment(uuid, text) to anon, authenticated;

create or replace function public.update_user_board_comment(
  p_id uuid,
  p_password text,
  p_author_name text,
  p_content text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
  comment_admin_managed boolean;
begin
  select password_hash, coalesce(is_admin_managed, false)
  into stored_hash, comment_admin_managed
  from board_comments
  where id = p_id and is_hidden = false;

  if stored_hash is null then
    raise exception 'Incorrect password';
  end if;

  if stored_hash = 'admin-managed' or comment_admin_managed then
    raise exception 'Cannot update admin comment';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  update board_comments
  set
    author_name = trim(p_author_name),
    content = trim(p_content),
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
  where id = p_id;

  return true;
end;
$$;

grant execute on function public.update_user_board_comment(uuid, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
