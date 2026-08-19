-- Run in Supabase SQL Editor (after board-comments.sql)

alter table public.board_comments
  add column if not exists parent_id uuid references public.board_comments(id) on delete cascade;

create index if not exists board_comments_parent_created_idx
  on public.board_comments (parent_id, created_at asc);

drop function if exists public.create_user_board_comment(uuid, text, text, text);
drop function if exists public.create_user_board_comment(uuid, text, text, text, uuid);

create or replace function public.create_user_board_comment(
  p_post_id uuid,
  p_author_name text,
  p_content text,
  p_password text,
  p_parent_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  post_hidden boolean;
  parent_post_id uuid;
  parent_hidden boolean;
begin
  select is_hidden into post_hidden from board_posts where id = p_post_id;

  if post_hidden is null or post_hidden then
    raise exception 'Post not found';
  end if;

  if p_parent_id is not null then
    select post_id, is_hidden
    into parent_post_id, parent_hidden
    from board_comments
    where id = p_parent_id;

    if parent_post_id is null or parent_hidden then
      raise exception 'Parent comment not found';
    end if;

    if parent_post_id <> p_post_id then
      raise exception 'Parent comment not found';
    end if;
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  insert into board_comments (post_id, parent_id, author_name, content, password_hash)
  values (
    p_post_id,
    p_parent_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf'))
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.create_user_board_comment(uuid, text, text, text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
