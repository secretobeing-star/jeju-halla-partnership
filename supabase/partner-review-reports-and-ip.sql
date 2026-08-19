-- Partner review reports + IP (run after board-reports-and-comment-ip.sql)

alter table public.partner_reviews
  add column if not exists user_ip inet;

create index if not exists partner_reviews_user_ip_idx
  on public.partner_reviews (user_ip);

alter table public.board_reports
  add column if not exists partner_review_id uuid references public.partner_reviews(id) on delete cascade;

alter table public.board_reports
  drop constraint if exists board_reports_target_check;

alter table public.board_reports
  add constraint board_reports_target_check check (
    (
      post_id is not null
      and comment_id is null
      and partner_review_id is null
    )
    or (
      comment_id is not null
      and partner_review_id is null
    )
    or (
      partner_review_id is not null
      and comment_id is null
      and post_id is null
    )
  );

create unique index if not exists board_reports_unique_partner_review_reporter
  on public.board_reports (partner_review_id, reporter_ip)
  where partner_review_id is not null and reporter_ip is not null;

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
  user_ip inet,
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
    r.user_ip,
    r.created_at
  from partner_reviews r
  join partners p on p.id = r.partner_id
  where p_partner_id is null or r.partner_id = p_partner_id
  order by r.created_at desc;
$$;

grant execute on function public.create_partner_review(uuid, text, text, text, text, inet) to anon, authenticated;
grant execute on function public.admin_list_partner_reviews(uuid) to authenticated;

notify pgrst, 'reload schema';
