-- Partner benefit box colors (admin > 혜택 tab)

alter table public.site_settings
  add column if not exists partner_benefit_box_bg_color text;

alter table public.site_settings
  add column if not exists partner_benefit_box_border_color text;

notify pgrst, 'reload schema';
