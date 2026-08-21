-- 도장찍기 버튼 라벨 커스터마이징
-- 관리자가 도장찍기 버튼의 이름을 변경할 수 있도록 site_settings에 컬럼 추가

alter table public.site_settings
add column if not exists stamp_button_label text default '도장찍기';

-- 기존 설정이 없는 경우 기본값 설정
update public.site_settings
set stamp_button_label = '도장찍기'
where stamp_button_label is null;

-- 관리자만 이 설정을 수정할 수 있도록 RLS 정책 추가
drop policy if exists "site_settings_admin_all" on public.site_settings;
create policy "site_settings_admin_all"
  on public.site_settings for all to authenticated
  using (true)
  with check (true);

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read"
  on public.site_settings for select to anon, authenticated
  using (true);

notify pgrst, 'reload schema';