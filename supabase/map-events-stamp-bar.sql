-- 스탬프 바 배경/완주 뱃지 커스텀
-- 선행: supabase/map-events.sql

alter table public.events
  add column if not exists stamp_bar_bg_img text,
  add column if not exists stamp_bar_bg_color text,
  add column if not exists completion_badge_img text;

notify pgrst, 'reload schema';
