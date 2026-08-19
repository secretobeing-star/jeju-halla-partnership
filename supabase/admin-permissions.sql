-- Admin user permissions (Supabase Authentication users)

create table if not exists public.admin_user_permissions (
  user_id uuid primary key,
  email text not null,
  role text not null default 'admin' check (role in ('developer', 'admin')),
  is_active boolean not null default true,
  can_settings boolean not null default false,
  can_ads boolean not null default false,
  can_partners boolean not null default false,
  can_board_settings boolean not null default false,
  can_boards boolean not null default false,
  can_posts boolean not null default false,
  can_developer boolean not null default false,
  can_permissions boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_user_permissions_email_idx
  on public.admin_user_permissions (email);

create or replace function public.is_admin_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_user_permissions
    where user_id = auth.uid()
      and is_active = true
      and role = 'developer'
  );
$$;

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

alter table public.admin_user_permissions enable row level security;

drop policy if exists "admin_permissions_read_own" on public.admin_user_permissions;
create policy "admin_permissions_read_own"
  on public.admin_user_permissions
  for select
  to authenticated
  using (user_id = auth.uid());

grant execute on function public.is_admin_developer() to authenticated;
grant execute on function public.has_admin_permission(text) to authenticated;

alter table public.site_settings
  add column if not exists developer_user_id uuid,
  add column if not exists admin_developer_email text;

update public.site_settings
set admin_developer_email = 'secretobeing@gmail.com'
where id = 1
  and (admin_developer_email is null or admin_developer_email = '');
