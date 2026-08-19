-- Add 관리자 권한 tab permission flag

alter table public.admin_user_permissions
  add column if not exists can_permissions boolean not null default false;

create or replace function public.has_admin_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_user_permissions p
    where p.user_id = auth.uid()
      and p.is_active = true
      and (
        p.role = 'developer'
        or case p_permission
          when 'settings' then p.can_settings
          when 'ads' then p.can_ads
          when 'partners' then p.can_partners
          when 'board-settings' then p.can_board_settings
          when 'boards' then p.can_boards
          when 'posts' then p.can_posts
          when 'developer' then p.can_developer
          when 'permissions' then p.can_permissions
          else false
        end
      )
  );
$$;
