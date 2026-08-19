-- 이벤트 댓글 관리자: 목록 / 숨김 / 삭제 (+ IP·기기 키 노출)
create extension if not exists pgcrypto with schema extensions;

alter table public.site_event_comments
  add column if not exists voter_key text,
  add column if not exists user_ip inet,
  add column if not exists is_admin_managed boolean not null default false,
  add column if not exists admin_action_reason text,
  add column if not exists updated_at timestamptz not null default now();

drop function if exists public.admin_list_event_comments(uuid);
drop function if exists public.admin_list_event_comments(uuid, uuid);

create or replace function public.admin_list_event_comments(
  p_event_id uuid default null
)
returns table (
  id uuid,
  tab_id uuid,
  event_id uuid,
  event_title text,
  tab_label text,
  author_name text,
  content text,
  is_hidden boolean,
  admin_action_reason text,
  user_ip text,
  voter_key text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id,
    c.tab_id,
    e.id as event_id,
    e.title as event_title,
    t.label as tab_label,
    c.author_name,
    c.content,
    c.is_hidden,
    c.admin_action_reason,
    host(c.user_ip) as user_ip,
    c.voter_key,
    c.created_at
  from public.site_event_comments c
  join public.site_event_tabs t on t.id = c.tab_id
  join public.site_events e on e.id = t.event_id
  where p_event_id is null or e.id = p_event_id
  order by c.created_at desc;
$$;

drop function if exists public.admin_set_event_comment_hidden(uuid, boolean);
drop function if exists public.admin_set_event_comment_hidden(uuid, boolean, text);

create or replace function public.admin_set_event_comment_hidden(
  p_comment_id uuid,
  p_hidden boolean,
  p_admin_action_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.site_event_comments
  set
    is_hidden = p_hidden,
    admin_action_reason = case
      when p_hidden then nullif(trim(p_admin_action_reason), '')
      else null
    end,
    updated_at = now()
  where id = p_comment_id;

  if not found then
    raise exception 'Comment not found';
  end if;
end;
$$;

create or replace function public.admin_delete_event_comment(
  p_comment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.site_event_comments
  where id = p_comment_id;

  if not found then
    raise exception 'Comment not found';
  end if;
end;
$$;

grant execute on function public.admin_list_event_comments(uuid) to authenticated;
grant execute on function public.admin_set_event_comment_hidden(uuid, boolean, text) to authenticated;
grant execute on function public.admin_delete_event_comment(uuid) to authenticated;

notify pgrst, 'reload schema';
