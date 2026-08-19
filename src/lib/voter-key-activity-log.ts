export type VoterKeyActivityLogType = "post" | "comment" | "review";

export type VoterKeyActivityLogRow = {
  id: number;
  activity_type: VoterKeyActivityLogType;
  source_id: string;
  board_type: string | null;
  post_id: string | null;
  post_title: string | null;
  partner_id: string | null;
  partner_name: string | null;
  author_name: string;
  title: string | null;
  content_preview: string;
  status: number | null;
  is_hidden: boolean;
  source_deleted: boolean;
  created_at: string;
};

export type VoterKeyActivitySummaryRow = {
  voter_key: string;
  post_count: number;
  comment_count: number;
  review_count: number;
  max_status: number;
  last_seen_at: string;
};

export const VOTER_KEY_ACTIVITY_TYPE_LABELS: Record<VoterKeyActivityLogType, string> = {
  post: "게시글",
  comment: "댓글",
  review: "제휴 후기",
};

export function isMissingVoterKeyActivityLogError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("voter_key_activity_log") ||
    lower.includes("admin_list_voter_key_activity_summary") ||
    lower.includes("admin_list_voter_key_activity_for_key") ||
    lower.includes("admin_dismiss_voter_key_activity_log") ||
    lower.includes("banned_voter_keys")
  );
}
