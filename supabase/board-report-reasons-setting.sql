-- Configurable board report reasons (run in Supabase SQL Editor)

alter table public.site_settings
  add column if not exists board_report_reasons jsonb;

update public.site_settings
set board_report_reasons = '["스팸/광고","욕설/비방","음란물","개인정보 노출","기타"]'::jsonb
where id = 1
  and board_report_reasons is null;

notify pgrst, 'reload schema';
