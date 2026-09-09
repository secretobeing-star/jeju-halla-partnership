-- 회원 탈퇴 기능 활성화 여부

alter table public.site_settings
  add column if not exists site_member_withdraw_enabled boolean not null default true;

notify pgrst, 'reload schema';
