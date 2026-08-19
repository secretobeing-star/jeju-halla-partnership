alter table public.site_settings
  add column if not exists notice_carousel_auto_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists notice_carousel_auto_interval_seconds integer not null default 5;

update public.site_settings
set notice_carousel_auto_interval_seconds = 5
where id = 1
  and (
    notice_carousel_auto_interval_seconds is null
    or notice_carousel_auto_interval_seconds < 3
    or notice_carousel_auto_interval_seconds > 30
  );
