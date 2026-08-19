-- 후기 관련 마이그레이션 통합 (반환 타입 변경 시 DROP 필요)
-- Supabase SQL Editor에서 이 파일만 실행하면 됩니다.

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

alter table public.partner_reviews
  drop constraint if exists partner_reviews_partner_id_voter_key_key;

create index if not exists partner_reviews_partner_voter_idx
  on public.partner_reviews (partner_id, voter_key);

create or replace function public.create_partner_review(
  p_partner_id uuid,
  p_author_name text,
  p_content text,
  p_password text,
  p_voter_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  new_count integer;
begin
  if char_length(trim(p_voter_key)) < 8 then
    raise exception 'Invalid voter key';
  end if;

  if not exists (
    select 1 from partners where id = p_partner_id and is_active = true
  ) then
    raise exception 'Partner not found';
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  insert into partner_reviews (
    partner_id,
    author_name,
    content,
    password_hash,
    voter_key,
    is_hidden
  )
  values (
    p_partner_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_voter_key,
    false
  )
  returning id into new_id;

  perform public.sync_partner_review_count(p_partner_id);

  select review_count into new_count from partners where id = p_partner_id;

  return jsonb_build_object(
    'id', new_id,
    'review_count', new_count
  );
end;
$$;

update public.partners p
set review_count = (
  select count(*)::integer
  from public.partner_reviews r
  where r.partner_id = p.id
);

grant execute on function public.sync_partner_review_count(uuid) to anon, authenticated;
grant execute on function public.get_partner_reviews(uuid) to anon, authenticated;
grant execute on function public.create_partner_review(uuid, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
