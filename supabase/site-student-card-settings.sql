-- 학생별 카드 테두리(프레임) 설정 — 기기 간 동기화

create table if not exists public.site_student_card_settings (
  student_id text primary key,
  equipped_frame_id text,
  unlocked_ids jsonb not null default '[]'::jsonb,
  sources jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists site_student_card_settings_updated_idx
  on public.site_student_card_settings (updated_at desc);

-- 회원 탈퇴 후 14일 재가입 차단

create table if not exists public.site_member_withdrawal_blocks (
  student_id text primary key,
  student_name text,
  withdrawn_at timestamptz not null default now(),
  rejoin_allowed_at timestamptz not null
);

create index if not exists site_member_withdrawal_blocks_rejoin_idx
  on public.site_member_withdrawal_blocks (rejoin_allowed_at);

notify pgrst, 'reload schema';

-- service role / API에서 읽기·쓰기가 막히지 않도록 RLS 비활성 (학생 학번 키 기반)
alter table if exists public.site_student_card_settings disable row level security;
alter table if exists public.site_member_withdrawal_blocks disable row level security;
