-- 제휴 자세히 보기: 섹션 문구 · 팝업 너비

alter table public.site_settings
  add column if not exists partner_detail_section_label text,
  add column if not exists partner_map_section_label text,
  add column if not exists partner_detail_popup_max_width_rem integer not null default 78;

notify pgrst, 'reload schema';
