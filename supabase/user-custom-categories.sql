-- 내 카테고리: 학번 로그인 계정에 저장해 기기 간 연동
create table if not exists public.user_custom_categories (
  user_id text primary key,
  categories jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_custom_categories enable row level security;

notify pgrst, 'reload schema';
