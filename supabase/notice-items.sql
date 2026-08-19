-- 메인 공지 캐러셀 항목
alter table public.site_settings
  add column if not exists notice_text_link_url text,
  add column if not exists notice_items jsonb not null default '[]'::jsonb;
update public.site_settings
set notice_items = jsonb_build_array(
  jsonb_build_object(
    'id', 'notice-1',
    'tag', null,
    'text', notice_text,
    'link_url', notice_text_link_url,
    'enabled', true
  )
)
where id = 1
  and (
    notice_items is null
    or notice_items = '[]'::jsonb
    or jsonb_array_length(notice_items) = 0
  )
  and coalesce(trim(notice_text), '') <> '';
