-- 게시판별 신고 사유 + 제휴 후기 신고 사유 + 신고 완료 안내 문구

alter table public.site_settings
  add column if not exists board_report_reasons_by_board jsonb,
  add column if not exists partner_review_report_reasons jsonb,
  add column if not exists board_report_success_message text;

notify pgrst, 'reload schema';
