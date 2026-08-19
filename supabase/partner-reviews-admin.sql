-- 제휴 후기 관리자 RPC + 숨김 안내 문구 설정

alter table public.site_settings
  add column if not exists partner_hidden_review_title text,
  add column if not exists partner_hidden_review_message text;

drop function if exists public.admin_list_partner_reviews(uuid);

create function public.admin_list_partner_reviews(p_partner_id uuid default null)
returns table (
  id uuid,
  partner_id uuid,
  partner_name text,
  author_name text,
  content text,
  is_hidden boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.id,
    r.partner_id,
    p.name as partner_name,
    r.author_name,
    r.content,
    r.is_hidden,
    r.created_at
  from partner_reviews r
  join partners p on p.id = r.partner_id
  where p_partner_id is null or r.partner_id = p_partner_id
  order by r.created_at desc;
$$;

create or replace function public.admin_set_partner_review_hidden(
  p_review_id uuid,
  p_hidden boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update partner_reviews
  set
    is_hidden = p_hidden,
    updated_at = now()
  where id = p_review_id;

  if not found then
    raise exception 'Review not found';
  end if;
end;
$$;

create or replace function public.admin_delete_partner_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_partner_id uuid;
begin
  select partner_id into target_partner_id
  from partner_reviews
  where id = p_review_id;

  if target_partner_id is null then
    raise exception 'Review not found';
  end if;

  delete from partner_reviews where id = p_review_id;

  perform public.sync_partner_review_count(target_partner_id);
end;
$$;

grant execute on function public.admin_list_partner_reviews(uuid) to authenticated;
grant execute on function public.admin_set_partner_review_hidden(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_partner_review(uuid) to authenticated;

notify pgrst, 'reload schema';
