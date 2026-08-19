-- 이벤트 댓글: 제휴 후기·게시판과 동일한 수정/신고/차단 필드
create extension if not exists pgcrypto with schema extensions;

alter table public.site_event_comments
  add column if not exists voter_key text,
  add column if not exists user_ip inet,
  add column if not exists is_admin_managed boolean not null default false,
  add column if not exists admin_action_reason text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists site_event_comments_tab_voter_idx
  on public.site_event_comments (tab_id, voter_key);

create index if not exists site_event_comments_user_ip_idx
  on public.site_event_comments (user_ip);

-- 신고 대상에 이벤트 댓글 추가
alter table public.board_reports
  add column if not exists event_comment_id uuid references public.site_event_comments(id) on delete cascade;

alter table public.board_reports
  drop constraint if exists board_reports_target_check;

alter table public.board_reports
  add constraint board_reports_target_check check (
    (
      post_id is not null
      and comment_id is null
      and partner_review_id is null
      and event_comment_id is null
    )
    or (
      comment_id is not null
      and partner_review_id is null
      and event_comment_id is null
    )
    or (
      partner_review_id is not null
      and comment_id is null
      and post_id is null
      and event_comment_id is null
    )
    or (
      event_comment_id is not null
      and comment_id is null
      and partner_review_id is null
      and post_id is null
    )
  );

create unique index if not exists board_reports_unique_event_comment_reporter
  on public.board_reports (event_comment_id, reporter_ip)
  where event_comment_id is not null and reporter_ip is not null;

drop function if exists public.create_user_event_comment(uuid, text, text, text);
drop function if exists public.create_user_event_comment(uuid, text, text, text, text);
drop function if exists public.create_user_event_comment(uuid, text, text, text, text, inet);

create or replace function public.create_user_event_comment(
  p_tab_id uuid,
  p_author_name text,
  p_content text,
  p_password text,
  p_voter_key text,
  p_user_ip inet default null
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
  if char_length(trim(p_voter_key)) < 8 then
    raise exception 'Invalid voter key';
  end if;

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

  insert into site_event_comments (
    tab_id,
    author_name,
    content,
    password_hash,
    voter_key,
    user_ip,
    is_hidden
  )
  values (
    p_tab_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_voter_key,
    p_user_ip,
    false
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.update_user_event_comment(
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
  managed boolean;
begin
  select password_hash, coalesce(is_admin_managed, false)
  into stored_hash, managed
  from site_event_comments
  where id = p_id and is_hidden = false;

  if stored_hash is null then
    raise exception 'Comment not found';
  end if;

  if managed then
    raise exception 'Admin-managed comment';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  update site_event_comments
  set
    author_name = trim(p_author_name),
    content = trim(p_content),
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    updated_at = now()
  where id = p_id;

  return true;
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
  managed boolean;
begin
  select password_hash, coalesce(is_admin_managed, false)
  into stored_hash, managed
  from site_event_comments
  where id = p_id and is_hidden = false;

  if stored_hash is null then
    raise exception 'Incorrect password';
  end if;

  if managed then
    raise exception 'Admin-managed comment';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  update site_event_comments
  set
    is_hidden = true,
    updated_at = now()
  where id = p_id;

  return true;
end;
$$;

grant execute on function public.create_user_event_comment(uuid, text, text, text, text, inet) to anon, authenticated;
grant execute on function public.update_user_event_comment(uuid, text, text, text) to anon, authenticated;
grant execute on function public.delete_user_event_comment(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
