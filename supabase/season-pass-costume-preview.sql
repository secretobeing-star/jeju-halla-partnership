-- 골드상점 코스튬 미리보기 on/off

alter table if exists public.seasons
  add column if not exists costume_preview_enabled boolean not null default true;

notify pgrst, 'reload schema';
