-- 제휴 업체 후기 (텍스트 리뷰)

alter table public.partners
  add column if not exists review_count integer not null default 0;

alter table public.site_settings
  add column if not exists partner_reviews_enabled boolean not null default true;

create table if not exists public.partner_reviews (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  author_name text not null,
  content text not null,
  password_hash text not null,
  voter_key text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_reviews_partner_voter_idx
  on public.partner_reviews (partner_id, voter_key);

create index if not exists partner_reviews_partner_created_idx
  on public.partner_reviews (partner_id, created_at desc);

alter table public.partner_reviews enable row level security;

drop policy if exists "partner_reviews_public_read" on public.partner_reviews;
create policy "partner_reviews_public_read"
  on public.partner_reviews for select to anon, authenticated
  using (is_hidden = false);

drop policy if exists "partner_reviews_admin_all" on public.partner_reviews;
create policy "partner_reviews_admin_all"
  on public.partner_reviews for all to authenticated
  using (true)
  with check (true);

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

  update partner_reviews
  set
    author_name = trim(p_author_name),
    content = trim(p_content),
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    updated_at = now()
  where id = p_id;

  select review_count into new_count from partners where id = target_partner_id;

  return jsonb_build_object('review_count', new_count);
end;
$$;

create or replace function public.delete_user_partner_review(
  p_id uuid,
  p_password text
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

  delete from partner_reviews where id = p_id;

  perform public.sync_partner_review_count(target_partner_id);

  select review_count into new_count from partners where id = target_partner_id;

  return jsonb_build_object('review_count', new_count);
end;
$$;

grant execute on function public.sync_partner_review_count(uuid) to anon, authenticated;
grant execute on function public.get_partner_reviews(uuid) to anon, authenticated;
grant execute on function public.create_partner_review(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.update_user_partner_review(uuid, text, text, text) to anon, authenticated;
grant execute on function public.delete_user_partner_review(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
