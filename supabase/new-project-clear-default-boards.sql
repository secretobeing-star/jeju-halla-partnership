-- Remove default notice/free/inquiry boards from site_settings (new project or after import)

update public.site_settings
set board_definitions = '[]'::jsonb
where id = 1;

notify pgrst, 'reload schema';
