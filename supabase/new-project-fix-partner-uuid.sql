-- Quick fix: partner_votes FK failed (partner_id bigint vs partners.id uuid)
-- Run this, then re-run from "-- >>> BEGIN partner-reactions.sql" in new-project-full.sql

drop table if exists public.partner_votes cascade;
drop table if exists public.partner_reviews cascade;

drop function if exists public.react_partner(bigint, text, text);
drop function if exists public.react_partner(uuid, text, text);
drop function if exists public.sync_partner_review_count(bigint);
drop function if exists public.sync_partner_review_count(uuid);
drop function if exists public.get_partner_reviews(bigint);
drop function if exists public.get_partner_reviews(uuid);
drop function if exists public.create_partner_review(bigint, text, text, text, text);
drop function if exists public.create_partner_review(uuid, text, text, text, text);
drop function if exists public.admin_list_partner_reviews(bigint);
drop function if exists public.admin_list_partner_reviews(uuid);

notify pgrst, 'reload schema';
