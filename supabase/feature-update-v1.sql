-- Feature update v1: ads, title toggles, reactions, partner dates, board settings

alter table public.site_settings
  add column if not exists header_title_enabled boolean not null default true,
  add column if not exists banner_image_only boolean not null default false,
  add column if not exists bottom_pc_ad_image_url text,
  add column if not exists bottom_pc_ad_link_url text,
  add column if not exists post_reactions_enabled boolean not null default true,
  add column if not exists board_sort_latest_enabled boolean not null default true,
  add column if not exists board_sort_recommended_enabled boolean not null default true,
  add column if not exists board_collapsible_enabled boolean not null default true,
  add column if not exists partner_sort_old_enabled boolean not null default true,
  add column if not exists partner_sort_new_enabled boolean not null default true,
  add column if not exists pagination_scroll_top_enabled boolean not null default true,
  add column if not exists partners_per_page integer not null default 8;

alter table public.partners
  add column if not exists benefit_start_date date,
  add column if not exists benefit_end_date date;

alter table public.board_posts
  add column if not exists like_count integer not null default 0,
  add column if not exists dislike_count integer not null default 0;

create table if not exists public.board_post_votes (
  post_id uuid not null references public.board_posts(id) on delete cascade,
  voter_key text not null,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  primary key (post_id, voter_key)
);

alter table public.board_post_votes enable row level security;

drop policy if exists "board_post_votes_public_read" on public.board_post_votes;
create policy "board_post_votes_public_read"
  on public.board_post_votes for select to anon, authenticated using (true);

create or replace function public.react_board_post(
  p_post_id uuid,
  p_reaction text,
  p_voter_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  prev_reaction text;
  new_likes integer;
  new_dislikes integer;
begin
  if p_reaction not in ('like', 'dislike') then
    raise exception 'Invalid reaction';
  end if;

  if char_length(trim(p_voter_key)) < 8 then
    raise exception 'Invalid voter key';
  end if;

  if not exists (select 1 from board_posts where id = p_post_id and is_hidden = false) then
    raise exception 'Post not found';
  end if;

  select reaction into prev_reaction
  from board_post_votes
  where post_id = p_post_id and voter_key = p_voter_key;

  if prev_reaction is null then
    insert into board_post_votes (post_id, voter_key, reaction)
    values (p_post_id, p_voter_key, p_reaction);

    if p_reaction = 'like' then
      update board_posts set like_count = like_count + 1 where id = p_post_id;
    else
      update board_posts set dislike_count = dislike_count + 1 where id = p_post_id;
    end if;
  elsif prev_reaction = p_reaction then
    delete from board_post_votes where post_id = p_post_id and voter_key = p_voter_key;

    if p_reaction = 'like' then
      update board_posts set like_count = greatest(like_count - 1, 0) where id = p_post_id;
    else
      update board_posts set dislike_count = greatest(dislike_count - 1, 0) where id = p_post_id;
    end if;
  else
    update board_post_votes
    set reaction = p_reaction
    where post_id = p_post_id and voter_key = p_voter_key;

    if p_reaction = 'like' then
      update board_posts
      set like_count = like_count + 1, dislike_count = greatest(dislike_count - 1, 0)
      where id = p_post_id;
    else
      update board_posts
      set dislike_count = dislike_count + 1, like_count = greatest(like_count - 1, 0)
      where id = p_post_id;
    end if;
  end if;

  select like_count, dislike_count
  into new_likes, new_dislikes
  from board_posts
  where id = p_post_id;

  return jsonb_build_object(
    'like_count', new_likes,
    'dislike_count', new_dislikes,
    'reaction', (
      select reaction from board_post_votes
      where post_id = p_post_id and voter_key = p_voter_key
    )
  );
end;
$$;

grant execute on function public.react_board_post(uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
