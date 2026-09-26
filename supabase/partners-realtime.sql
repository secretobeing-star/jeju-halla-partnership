-- 제휴 목록이 새로고침 없이 바로 갱신되도록 Realtime 구독
alter table public.partners replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'partners'
  ) then
    execute 'alter publication supabase_realtime add table public.partners';
  end if;
end $$;
