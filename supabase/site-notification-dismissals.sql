-- 사용자별 알림 삭제(숨김)

create table if not exists public.site_notification_dismissals (
  notification_id uuid not null references public.site_notifications(id) on delete cascade,
  client_key text not null,
  dismissed_at timestamptz not null default now(),
  primary key (notification_id, client_key)
);

create index if not exists site_notification_dismissals_client_key_idx
  on public.site_notification_dismissals (client_key);

alter table public.site_notification_dismissals enable row level security;

notify pgrst, 'reload schema';
