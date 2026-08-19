export type IpActivityLogType = "post" | "comment" | "review";

export type IpActivityLogRow = {
  id: number;
  activity_type: IpActivityLogType;
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

export type IpActivitySummaryRow = {
  ip: string;
  post_count: number;
  comment_count: number;
  review_count: number;
  max_status: number;
  last_seen_at: string;
};

export const IP_ACTIVITY_TYPE_LABELS: Record<IpActivityLogType, string> = {
  post: "게시글",
  comment: "댓글",
  review: "제휴 후기",
};

export function isMissingIpActivityLogError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("ip_activity_log") ||
    lower.includes("admin_list_ip_activity_summary") ||
    lower.includes("admin_list_ip_activity_for_ip") ||
    lower.includes("admin_dismiss_ip_activity_log")
  );
}
