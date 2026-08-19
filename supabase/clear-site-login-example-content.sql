-- 로그인 설정에 저장된 예시 문구 제거 (Supabase SQL Editor에서 1회 실행)
update public.site_settings
set site_login_notice_line1 = null
where id = 1
  and site_login_notice_line1 is not null
  and (
    site_login_notice_line1 ilike '%탐나는전%'
    or site_login_notice_line1 ilike '%학생증%'
  );

update public.site_settings
set site_login_status_notice = null
where id = 1
  and site_login_status_notice is not null
  and site_login_status_notice ilike '%로그인 구현%';

notify pgrst, 'reload schema';
