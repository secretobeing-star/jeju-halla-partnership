-- ============================================================
-- 제주한라대 제휴 사이트 — Supabase SQL (한 번에 실행)
-- Supabase 대시보드 → SQL Editor → New query → 붙여넣기 → Run
-- 이미 실행한 구문은 IF NOT EXISTS / IF EXISTS 로 건너뜁니다.
-- ============================================================


-- ------------------------------------------------------------
-- 1) partners — 인스타그램 URL
-- ------------------------------------------------------------
alter table partners
  add column if not exists instagram_url text;


-- ------------------------------------------------------------
-- 2) site_settings — 좌·우 광고 / 타이틀 / 모바일 광고
-- ------------------------------------------------------------
alter table site_settings
  add column if not exists banner_image_url text,
  add column if not exists sidebar_left_image_url text,
  add column if not exists sidebar_left_link_url text,
  add column if not exists sidebar_right_image_url text,
  add column if not exists sidebar_right_link_url text,
  add column if not exists header_title_color text,
  add column if not exists header_title_link_url text,
  add column if not exists mobile_ad_below_hero_image_url text,
  add column if not exists mobile_ad_below_hero_link_url text,
  add column if not exists mobile_ad_below_category_image_url text,
  add column if not exists mobile_ad_below_category_link_url text;


-- ------------------------------------------------------------
-- 3) board_posts — 공지 / 자유 / 건의·문의 게시판
-- ------------------------------------------------------------
create table if not exists board_posts (
  id uuid primary key default gen_random_uuid(),
  board_type text not null check (board_type in ('notice', 'free', 'inquiry')),
  title text not null,
  content text not null default '',
  author_name text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists board_posts_type_created_idx
  on board_posts (board_type, created_at desc);

alter table board_posts enable row level security;


-- ------------------------------------------------------------
-- 4) board_posts — RLS 정책
-- ------------------------------------------------------------

-- 누구나: 숨김 처리되지 않은 글만 조회
drop policy if exists "board_posts_public_read" on board_posts;
create policy "board_posts_public_read"
  on board_posts
  for select
  to anon, authenticated
  using (is_hidden = false);

-- 누구나: 자유게시판·건의/문의 글 작성
drop policy if exists "board_posts_public_insert" on board_posts;
create policy "board_posts_public_insert"
  on board_posts
  for insert
  to anon, authenticated
  with check (board_type in ('free', 'inquiry'));

-- 관리자(로그인): 공지 포함 전체 관리
drop policy if exists "board_posts_admin_select" on board_posts;
create policy "board_posts_admin_select"
  on board_posts
  for select
  to authenticated
  using (true);

drop policy if exists "board_posts_admin_insert" on board_posts;
create policy "board_posts_admin_insert"
  on board_posts
  for insert
  to authenticated
  with check (true);

drop policy if exists "board_posts_admin_update" on board_posts;
create policy "board_posts_admin_update"
  on board_posts
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "board_posts_admin_delete" on board_posts;
create policy "board_posts_admin_delete"
  on board_posts
  for delete
  to authenticated
  using (true);


-- ------------------------------------------------------------
-- 5) (선택) site_settings 기본 행 — id=1 이 없을 때만
-- ------------------------------------------------------------
insert into site_settings (
  id,
  header_title,
  header_sub,
  notice_text
)
values (
  1,
  '2026 제주한라대학교 제41대 다온 제휴 리스트',
  '제주한라대 학생을 위한 제주 지역 제휴 혜택을 한곳에서 확인하세요.',
  ''
)
on conflict (id) do nothing;


-- ============================================================
-- 실행 후 확인 (Results 탭에서 오류 없으면 OK)
-- ============================================================
-- select column_name from information_schema.columns
--   where table_name = 'site_settings' order by column_name;
--
-- select * from board_posts limit 5;
-- ============================================================
