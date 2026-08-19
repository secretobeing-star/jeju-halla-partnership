-- 제휴 후기 관리자 비밀번호 표시 (개발자 모드)

alter table public.site_settings
  add column if not exists admin_partner_review_password_visible boolean not null default false;

alter table public.partner_reviews
  add column if not exists admin_visible_password text;

create or replace function public.is_admin_partner_review_password_visible()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select admin_partner_review_password_visible from public.site_settings where id = 1 limit 1),
    false
  );
$$;

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
  store_admin_password boolean;
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

  store_admin_password := public.is_admin_partner_review_password_visible();

  insert into partner_reviews (
    partner_id,
    author_name,
    content,
    password_hash,
    voter_key,
    is_hidden,
    admin_visible_password
  )
  values (
    p_partner_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_voter_key,
    false,
    case when store_admin_password then p_password else null end
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

create or replace function public.update_user_partner_review(
  p_id uuid,
  p_password text,
  p_author_name text,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
  target_partner_id uuid;
  new_count integer;
  store_admin_password boolean;
begin
  select password_hash, partner_id
  into stored_hash, target_partner_id
  from partner_reviews
  where id = p_id and is_hidden = false;

  if stored_hash is null then
    raise exception 'Review not found';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  store_admin_password := public.is_admin_partner_review_password_visible();

  update partner_reviews
  set
    author_name = trim(p_author_name),
    content = trim(p_content),
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    admin_visible_password = case when store_admin_password then p_password else null end,
    updated_at = now()
  where id = p_id;

  select review_count into new_count from partners where id = target_partner_id;

  return jsonb_build_object('review_count', new_count);
end;
$$;

drop function if exists public.admin_list_partner_reviews(uuid);

create function public.admin_list_partner_reviews(p_partner_id uuid default null)
returns table (
  id uuid,
  partner_id uuid,
  partner_name text,
  author_name text,
  content text,
  is_hidden boolean,
  admin_visible_password text,
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
    r.admin_visible_password,
    r.created_at
  from partner_reviews r
  join partners p on p.id = r.partner_id
  where p_partner_id is null or r.partner_id = p_partner_id
  order by r.created_at desc;
$$;

grant execute on function public.is_admin_partner_review_password_visible() to anon, authenticated;
grant execute on function public.create_partner_review(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.update_user_partner_review(uuid, text, text, text) to anon, authenticated;
grant execute on function public.admin_list_partner_reviews(uuid) to authenticated;

notify pgrst, 'reload schema';
