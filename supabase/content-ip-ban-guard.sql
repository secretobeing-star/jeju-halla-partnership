-- IP 차단 목록은 IP 기록·단계 제재 설정과 무관하게 모든 사용자 작성에 적용

drop function if exists public.create_partner_review(uuid, text, text, text, text);
drop function if exists public.create_partner_review(uuid, text, text, text, text, inet);

create or replace function public.create_partner_review(
  p_partner_id uuid,
  p_author_name text,
  p_content text,
  p_password text,
  p_voter_key text,
  p_user_ip inet default null
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
  ip_enabled boolean;
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

  if p_user_ip is not null and public.is_ip_banned(p_user_ip) then
    raise exception 'IP banned';
  end if;

  ip_enabled := public.is_board_ip_moderation_enabled();
  store_admin_password := public.is_admin_partner_review_password_visible();

  insert into partner_reviews (
    partner_id,
    author_name,
    content,
    password_hash,
    voter_key,
    is_hidden,
    admin_visible_password,
    user_ip
  )
  values (
    p_partner_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_voter_key,
    false,
    case when store_admin_password then p_password else null end,
    case when ip_enabled then p_user_ip else null end
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

drop function if exists public.create_user_board_post(text, text, text, text, text);
drop function if exists public.create_user_board_post(text, text, text, text, text, boolean);
drop function if exists public.create_user_board_post(text, text, text, text, text, boolean, inet);

create or replace function public.create_user_board_post(
  p_board_type text,
  p_title text,
  p_author_name text,
  p_content text,
  p_password text,
  p_is_secret boolean default false,
  p_user_ip inet default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  store_admin_password boolean;
  secret_enabled boolean;
  ip_enabled boolean;
  next_status integer;
  hide_post boolean;
begin
  if not public.is_user_writable_board(p_board_type) then
    raise exception 'Invalid board type';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  secret_enabled := public.is_board_secret_posts_enabled();
  if coalesce(p_is_secret, false) and not secret_enabled then
    raise exception 'Secret posts are disabled';
  end if;

  if p_user_ip is not null and public.is_ip_banned(p_user_ip) then
    raise exception 'IP banned';
  end if;

  ip_enabled := public.is_board_ip_moderation_enabled();

  if ip_enabled then
    if p_user_ip is null then
      raise exception 'Client IP is required';
    end if;

    next_status := public.resolve_board_post_status_for_ip(p_user_ip);
  else
    next_status := 1;
  end if;

  hide_post := next_status >= 3;

  store_admin_password := public.is_admin_user_password_visible();

  insert into board_posts (
    board_type,
    title,
    author_name,
    content,
    password_hash,
    admin_visible_password,
    is_secret,
    user_ip,
    status,
    is_hidden
  )
  values (
    p_board_type,
    trim(p_title),
    trim(p_author_name),
    p_content,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    case when store_admin_password then p_password else null end,
    case when secret_enabled then coalesce(p_is_secret, false) else false end,
    case when ip_enabled then p_user_ip else null end,
    next_status,
    hide_post
  )
  returning id into new_id;

  return new_id;
end;
$$;

drop function if exists public.create_user_board_comment(uuid, text, text, text);
drop function if exists public.create_user_board_comment(uuid, text, text, text, uuid);
drop function if exists public.create_user_board_comment(uuid, text, text, text, uuid, boolean);
drop function if exists public.create_user_board_comment(uuid, text, text, text, uuid, boolean, inet);

create or replace function public.create_user_board_comment(
  p_post_id uuid,
  p_author_name text,
  p_content text,
  p_password text,
  p_parent_id uuid default null,
  p_is_secret boolean default false,
  p_user_ip inet default null
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
  store_admin_password boolean;
  secret_enabled boolean;
  ip_enabled boolean;
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

  secret_enabled := public.is_board_secret_comments_enabled();
  if coalesce(p_is_secret, false) and not secret_enabled then
    raise exception 'Secret comments are disabled';
  end if;

  if p_user_ip is not null and public.is_ip_banned(p_user_ip) then
    raise exception 'IP banned';
  end if;

  ip_enabled := public.is_board_ip_moderation_enabled();
  store_admin_password := public.is_admin_user_password_visible();

  insert into board_comments (
    post_id,
    parent_id,
    author_name,
    content,
    password_hash,
    admin_visible_password,
    is_secret,
    user_ip
  )
  values (
    p_post_id,
    p_parent_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    case when store_admin_password then p_password else null end,
    case when secret_enabled then coalesce(p_is_secret, false) else false end,
    case when ip_enabled then p_user_ip else null end
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.create_partner_review(uuid, text, text, text, text, inet) to anon, authenticated;
grant execute on function public.create_user_board_post(text, text, text, text, text, boolean, inet) to anon, authenticated;
grant execute on function public.create_user_board_comment(uuid, text, text, text, uuid, boolean, inet) to anon, authenticated;

notify pgrst, 'reload schema';
