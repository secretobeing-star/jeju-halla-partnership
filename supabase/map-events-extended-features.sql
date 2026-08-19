-- 확장 기능: 마커 뱃지 커스터마이징, 보상 섹션, 로그인 안내문구
-- 선행: supabase/map-events.sql 실행 후 이 파일을 실행하세요.

-- 1. 이벤트 테이블 확장: 마커 뱃지 및 보상 설정 필드
alter table public.events
  add column if not exists favorite_badge_emoji text,
  add column if not exists favorite_badge_img text,
  add column if not exists favorite_countdown_emoji text,
  add column if not exists favorite_countdown_img text,
  add column if not exists random_reward_section_title text default '확률 보상',
  add column if not exists random_reward_section_desc text,
  add column if not exists random_reward_bg_color text,
  add column if not exists random_reward_bg_img text,
  add column if not exists random_reward_thumbnail text,
  add column if not exists guaranteed_reward_section_title text default '최종 완주 보상',
  add column if not exists guaranteed_reward_section_desc text,
  add column if not exists guaranteed_reward_bg_color text,
  add column if not exists guaranteed_reward_bg_img text,
  add column if not exists guaranteed_reward_thumbnail text,
  add column if not exists login_notice_text text;

-- 2. user_gifts 테이블 RLS 정책 추가 (삭제 권한)
drop policy if exists "user_gifts_delete_own" on public.user_gifts;
create policy "user_gifts_delete_own"
  on public.user_gifts for delete to authenticated
  using (user_id = (select auth.uid()::text));

-- 사용자가 자신의 선물 조회할 수 있도록
drop policy if exists "user_gifts_select_own" on public.user_gifts;
create policy "user_gifts_select_own"
  on public.user_gifts for select to authenticated
  using (user_id = (select auth.uid()::text));

-- 3. user_favorites 테이블 RLS 정책: 자신의 즐겨찾기만 관리
drop policy if exists "user_favorites_select_own" on public.user_favorites;
create policy "user_favorites_select_own"
  on public.user_favorites for select to authenticated
  using (user_id = (select auth.uid()::text));

drop policy if exists "user_favorites_insert_own" on public.user_favorites;
create policy "user_favorites_insert_own"
  on public.user_favorites for insert to authenticated
  with check (user_id = (select auth.uid()::text));

drop policy if exists "user_favorites_delete_own" on public.user_favorites;
create policy "user_favorites_delete_own"
  on public.user_favorites for delete to authenticated
  using (user_id = (select auth.uid()::text));

notify pgrst, 'reload schema';
