-- 게시판 목록을 스크린샷처럼 커뮤니티형(번호·제목·글쓴이·조회·추천) + 공지 표시로 켭니다.
-- Supabase SQL Editor에서 한 번 실행하세요.

update public.site_settings
set
  board_post_numbered_list_enabled = true,
  board_pinned_post_large_enabled = true,
  board_post_views_enabled = true
where id = 1;
