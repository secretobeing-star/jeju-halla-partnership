-- Developer mode: non-member device (voter key) management toggle
-- Run after device-voter-key-ban.sql

alter table public.site_settings
  add column if not exists board_device_moderation_enabled boolean not null default false;

create or replace function public.is_board_device_moderation_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select board_device_moderation_enabled from public.site_settings where id = 1 limit 1),
    false
  );
$$;

grant execute on function public.is_board_device_moderation_enabled() to anon, authenticated;

notify pgrst, 'reload schema';
