-- Partner benefit status label + numbered board post list with comment count

alter table public.partners
  add column if not exists benefit_status_text text,
  add column if not exists benefit_status_color text,
  add column if not exists benefit_status_bold boolean not null default false,
  add column if not exists benefit_status_italic boolean not null default false,
  add column if not exists benefit_status_underline boolean not null default false;

alter table public.site_settings
  add column if not exists board_post_numbered_list_enabled boolean not null default false;
