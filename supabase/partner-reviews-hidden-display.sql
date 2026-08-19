-- 숨김 후기도 목록에 포함(본문은 노출하지 않음). 게시글 숨김과 동일하게 메인 안내 문구 표시용.

create or replace function public.sync_partner_review_count(p_partner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update partners
  set review_count = (
    select count(*)::integer
    from partner_reviews
    where partner_id = p_partner_id
  )
  where id = p_partner_id;
end;
$$;

drop function if exists public.get_partner_reviews(uuid);

create function public.get_partner_reviews(p_partner_id uuid)
returns table (
  id uuid,
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
  select r.id, r.author_name, r.content, r.is_hidden, r.created_at
  from partner_reviews r
  join partners p on p.id = r.partner_id
  where r.partner_id = p_partner_id
    and p.is_active = true
  order by r.created_at desc;
$$;

grant execute on function public.get_partner_reviews(uuid) to anon, authenticated;

-- 기존 review_count를 숨김 포함 전체 건수로 맞춤
update public.partners p
set review_count = (
  select count(*)::integer
  from public.partner_reviews r
  where r.partner_id = p.id
);

notify pgrst, 'reload schema';
