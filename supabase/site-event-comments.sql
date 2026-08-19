-- 이벤트 탭 댓글
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.site_event_comments (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid not null references public.site_event_tabs(id) on delete cascade,
  author_name text not null,
  content text not null,
  password_hash text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists site_event_comments_tab_created_idx
  on public.site_event_comments (tab_id, created_at asc);

alter table public.site_event_comments enable row level security;

drop policy if exists "site_event_comments_public_read" on public.site_event_comments;
create policy "site_event_comments_public_read"
  on public.site_event_comments
  for select
  to anon, authenticated
  using (is_hidden = false);

drop policy if exists "site_event_comments_admin_all" on public.site_event_comments;
create policy "site_event_comments_admin_all"
  on public.site_event_comments
  for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.create_user_event_comment(
  p_tab_id uuid,
  p_author_name text,
  p_content text,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  tab_ok boolean;
begin
  select exists (
    select 1
    from public.site_event_tabs t
    join public.site_events e on e.id = t.event_id
    where t.id = p_tab_id
      and t.is_active = true
      and e.is_active = true
  ) into tab_ok;

  if not tab_ok then
    raise exception 'Tab not found';
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  insert into site_event_comments (tab_id, author_name, content, password_hash)
  values (
    p_tab_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf'))
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.delete_user_event_comment(
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
  select password_hash into stored_hash
  from site_event_comments
  where id = p_id and is_hidden = false;

  if stored_hash is null then
    raise exception 'Incorrect password';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  update site_event_comments
  set is_hidden = true
  where id = p_id;

  return true;
end;
$$;

grant execute on function public.create_user_event_comment(uuid, text, text, text) to anon, authenticated;
grant execute on function public.delete_user_event_comment(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
