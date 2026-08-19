export type SiteEventCommentRow = {
  id: string;
  tab_id: string;
  author_name: string;
  content: string;
  is_hidden?: boolean;
  is_admin_managed?: boolean;
  admin_action_reason?: string | null;
  created_at: string;
};

export function isAdminManagedEventComment(
  comment: Pick<SiteEventCommentRow, "is_admin_managed" | "author_name">,
): boolean {
  if (comment.is_admin_managed) {
    return true;
  }

  return comment.author_name.trim() === "관리자";
}

export function formatEventCommentDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function mapEventCommentRpcError(message: string) {
  if (
    message.toLowerCase().includes("could not find the function") ||
    message.toLowerCase().includes("pgrst202") ||
    message.toLowerCase().includes("schema cache")
  ) {
    return "이벤트 댓글 SQL이 필요합니다. site-event-comments-parity.sql을 실행해 주세요.";
  }
  if (message.includes("Password must be at least 4")) {
    return "비밀번호는 4자 이상이어야 합니다.";
  }
  if (message.includes("Incorrect password")) {
    return "비밀번호가 일치하지 않습니다.";
  }
  if (message.includes("Author and content are required")) {
    return "닉네임과 댓글 내용을 입력해 주세요.";
  }
  if (
    message.includes("Tab not found") ||
    message.includes("Comment not found")
  ) {
    return "댓글을 찾을 수 없습니다.";
  }
  if (message.includes("Admin-managed")) {
    return "관리자 댓글은 수정·삭제할 수 없습니다.";
  }
  if (message.includes("IP banned")) {
    return "현재 IP에서는 댓글을 작성할 수 없습니다.";
  }
  if (message.includes("Voter key banned") || message.includes("Invalid voter key")) {
    return "현재 기기에서는 댓글을 작성할 수 없습니다.";
  }
  if (message.includes("site_event_comments")) {
    return "댓글 테이블이 없습니다. site-event-comments.sql을 실행해 주세요.";
  }
  return message;
}
