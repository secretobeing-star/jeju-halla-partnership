-- 이벤트 카드 UI용 필드 (기간·썸네일·목록 타입)
alter table public.site_events
  add column if not exists thumbnail_url text,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists list_type text not null default 'event';

-- list_type: event | winners
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_events_list_type_check'
  ) then
    alter table public.site_events
      add constraint site_events_list_type_check
      check (list_type in ('event', 'winners'));
  end if;
end $$;

notify pgrst, 'reload schema';
