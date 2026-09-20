-- AI 챗봇 설정 · 사이트 이용 분석
-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.ai_chatbot_settings (
  id integer primary key default 1,
  enabled boolean not null default true,
  name text not null default '안내 봇',
  welcome_message text not null default '안녕하세요. 제휴·혜택·이벤트에 대해 물어보세요.',
  profile_bio text not null default '제휴·혜택을 안내합니다.',
  icon_url text,
  provider text not null default 'openai' check (provider in ('openai', 'gemini')),
  api_key text,
  updated_at timestamptz not null default now()
);

insert into public.ai_chatbot_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.ai_chatbot_settings
  add column if not exists profile_bio text not null default '제휴·혜택을 안내합니다.';

alter table public.ai_chatbot_settings
  add column if not exists lessons jsonb not null default '[]'::jsonb;

alter table public.ai_chatbot_settings
  add column if not exists login_greeting text not null default '{name}님 안녕하세요';

create table if not exists public.site_analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'page_view',
    'pwa_view',
    'link_share',
    'board_view',
    'board_write',
    'board_comment',
    'chatbot_open',
    'chatbot_message',
    'stamp_join'
  )),
  path text,
  created_at timestamptz not null default now()
);

create index if not exists site_analytics_events_created_idx
  on public.site_analytics_events (created_at desc);

create index if not exists site_analytics_events_type_created_idx
  on public.site_analytics_events (event_type, created_at desc);

alter table public.ai_chatbot_settings enable row level security;
alter table public.site_analytics_events enable row level security;

drop policy if exists "ai_chatbot_settings_public_read" on public.ai_chatbot_settings;

alter table public.site_analytics_events
  drop constraint if exists site_analytics_events_event_type_check;

alter table public.site_analytics_events
  add constraint site_analytics_events_event_type_check
  check (event_type in (
    'page_view',
    'pwa_view',
    'link_share',
    'board_view',
    'board_write',
    'board_comment',
    'chatbot_open',
    'chatbot_message',
    'stamp_join'
  ));

notify pgrst, 'reload schema';
