-- Board reports admin fields (run after board-reports-and-comment-ip.sql)

alter table public.board_reports
  add column if not exists admin_action_reason text,
  add column if not exists is_admin_created boolean not null default false;

create index if not exists board_reports_admin_created_idx
  on public.board_reports (is_admin_created, created_at desc);

notify pgrst, 'reload schema';
