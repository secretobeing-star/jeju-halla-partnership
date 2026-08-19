-- Partner benefit text style (admin > 제휴업체 > 혜택)

alter table public.partners
  add column if not exists benefit_color text,
  add column if not exists benefit_bold boolean not null default false,
  add column if not exists benefit_italic boolean not null default false,
  add column if not exists benefit_underline boolean not null default false,
  add column if not exists benefit_strikethrough boolean not null default false;

notify pgrst, 'reload schema';
