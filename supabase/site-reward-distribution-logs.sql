-- 관리자 보상 지급 감사 로그

create table if not exists public.site_reward_distribution_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id text not null,
  admin_name text,
  target_user_id text not null,
  target_user_name text,
  reward_type text not null default 'FRAME',
  reward_id text not null,
  reward_name text,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists site_reward_distribution_logs_created_idx
  on public.site_reward_distribution_logs (created_at desc);

create index if not exists site_reward_distribution_logs_admin_idx
  on public.site_reward_distribution_logs (admin_id, created_at desc);

create index if not exists site_reward_distribution_logs_target_idx
  on public.site_reward_distribution_logs (target_user_id, created_at desc);

notify pgrst, 'reload schema';
