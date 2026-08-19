-- 로그인·알림·푸시 (탐나는전 연동 준비)

alter table public.site_settings
  add column if not exists site_login_enabled boolean not null default false,
  add column if not exists site_notifications_enabled boolean not null default false,
  add column if not exists site_push_enabled boolean not null default false,
  add column if not exists site_login_preview_enabled boolean not null default false,
  add column if not exists site_login_modal_title text,
  add column if not exists site_login_notice_line1 text,
  add column if not exists site_login_notice_line2 text,
  add column if not exists site_login_button_label text,
  add column if not exists site_login_provider_label text;

create table if not exists public.site_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  link_url text,
  is_active boolean not null default true,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  push_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.site_notification_reads (
  notification_id uuid not null references public.site_notifications(id) on delete cascade,
  client_key text not null,
  read_at timestamptz not null default now(),
  primary key (notification_id, client_key)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_key text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists site_notifications_active_idx
  on public.site_notifications (published_at desc)
  where is_active = true;

create index if not exists push_subscriptions_client_key_idx
  on public.push_subscriptions (client_key);

alter table public.site_notifications enable row level security;
alter table public.site_notification_reads enable row level security;
alter table public.push_subscriptions enable row level security;

notify pgrst, 'reload schema';
