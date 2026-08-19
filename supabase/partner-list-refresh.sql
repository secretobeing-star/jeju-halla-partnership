-- 제휴 목록 새로고침 버튼 (admin > 게시글 분류 > 제휴 목록 설정)

alter table public.site_settings
  add column if not exists partner_list_refresh_enabled boolean not null default true;

notify pgrst, 'reload schema';
