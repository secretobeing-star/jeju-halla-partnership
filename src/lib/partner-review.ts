export type PartnerReview = {
  id: string;
  author_name: string;
  content: string;
  is_hidden?: boolean;
  is_admin_managed?: boolean;
  admin_action_reason?: string | null;
  created_at: string;
};

export function isAdminManagedPartnerReview(
  review: Pick<PartnerReview, "is_admin_managed" | "author_name">,
): boolean {
  if (review.is_admin_managed) {
    return true;
  }

  return review.author_name.trim() === "관리자";
}

export function formatPartnerReviewDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function mapPartnerReviewRpcError(message: string) {
  if (
    message.toLowerCase().includes("could not find the function") ||
    message.toLowerCase().includes("pgrst202") ||
    message.toLowerCase().includes("schema cache")
  ) {
    return "후기 기능 SQL이 Supabase에 아직 없습니다. partner-reviews.sql을 실행해 주세요.";
  }
  if (message.includes("Password must be at least 4")) {
    return "비밀번호는 4자 이상이어야 합니다.";
  }
  if (message.includes("Incorrect password")) {
    return "비밀번호가 일치하지 않습니다.";
  }
  if (message.includes("Author and content are required")) {
    return "닉네임과 후기 내용을 입력해 주세요.";
  }
  if (message.includes("Partner not found") || message.includes("Review not found")) {
    return "후기를 찾을 수 없습니다.";
  }
  if (message.includes("IP banned")) {
    return "현재 IP에서는 후기를 작성할 수 없습니다.";
  }
  if (message.includes("Voter key banned")) {
    return "현재 기기에서는 후기를 작성할 수 없습니다.";
  }
  return message;
}
