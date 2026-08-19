alter table public.site_settings
  add column if not exists notice_badge_label text;

update public.site_settings
set notice_badge_label = '공지'
where id = 1
  and coalesce(trim(notice_badge_label), '') = '';
