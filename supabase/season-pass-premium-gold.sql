-- 골드 상점 프리미엄 패스 가격. 기존 seasons 테이블에 실행하세요.
alter table public.seasons
  add column if not exists premium_gold_price integer not null default 0;

alter table public.seasons
  add column if not exists gold_shop_enabled boolean not null default true;
