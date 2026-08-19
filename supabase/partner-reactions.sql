-- 제휴 업체 추천/비추천 + 추천순 정렬

alter table public.partners
  add column if not exists like_count integer not null default 0,
  add column if not exists dislike_count integer not null default 0;

alter table public.site_settings
  add column if not exists partner_reactions_enabled boolean not null default true,
  add column if not exists partner_sort_recommended_enabled boolean not null default true;

create table if not exists public.partner_votes (
  partner_id uuid not null references public.partners(id) on delete cascade,
  voter_key text not null,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  primary key (partner_id, voter_key)
);

alter table public.partner_votes enable row level security;

drop policy if exists "partner_votes_public_read" on public.partner_votes;
create policy "partner_votes_public_read"
  on public.partner_votes for select to anon, authenticated using (true);

drop function if exists public.react_partner(uuid, text, text);
drop function if exists public.react_partner(bigint, text, text);

create or replace function public.react_partner(
  p_partner_id uuid,
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

  if not exists (
    select 1 from partners where id = p_partner_id and is_active = true
  ) then
    raise exception 'Partner not found';
  end if;

  select reaction into prev_reaction
  from partner_votes
  where partner_id = p_partner_id and voter_key = p_voter_key;

  if prev_reaction is null then
    insert into partner_votes (partner_id, voter_key, reaction)
    values (p_partner_id, p_voter_key, p_reaction);

    if p_reaction = 'like' then
      update partners set like_count = like_count + 1 where id = p_partner_id;
    else
      update partners set dislike_count = dislike_count + 1 where id = p_partner_id;
    end if;
  elsif prev_reaction = p_reaction then
    delete from partner_votes
    where partner_id = p_partner_id and voter_key = p_voter_key;

    if p_reaction = 'like' then
      update partners set like_count = greatest(like_count - 1, 0) where id = p_partner_id;
    else
      update partners set dislike_count = greatest(dislike_count - 1, 0) where id = p_partner_id;
    end if;
  else
    update partner_votes
    set reaction = p_reaction
    where partner_id = p_partner_id and voter_key = p_voter_key;

    if p_reaction = 'like' then
      update partners
      set like_count = like_count + 1, dislike_count = greatest(dislike_count - 1, 0)
      where id = p_partner_id;
    else
      update partners
      set dislike_count = dislike_count + 1, like_count = greatest(like_count - 1, 0)
      where id = p_partner_id;
    end if;
  end if;

  select like_count, dislike_count
  into new_likes, new_dislikes
  from partners
  where id = p_partner_id;

  return jsonb_build_object(
    'like_count', new_likes,
    'dislike_count', new_dislikes,
    'reaction', (
      select reaction from partner_votes
      where partner_id = p_partner_id and voter_key = p_voter_key
    )
  );
end;
$$;

grant execute on function public.react_partner(uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
