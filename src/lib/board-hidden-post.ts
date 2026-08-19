import type { SiteSettings } from "@/lib/supabase";

export const DEFAULT_ADMIN_HIDDEN_POST_TITLE = "관리자에 의해 숨김처리가 되었습니다.";
export const DEFAULT_ADMIN_HIDDEN_POST_MESSAGE = "관리자에 의해 숨김처리가 되었습니다.";

/** @deprecated Use getHiddenPostDisplay().title */
export const ADMIN_HIDDEN_POST_MESSAGE = DEFAULT_ADMIN_HIDDEN_POST_MESSAGE;

export type HiddenPostDisplay = {
  title: string;
  message: string;
};

export function getHiddenPostDisplay(
  settings?: Partial<SiteSettings> | null,
): HiddenPostDisplay {
  const title = settings?.board_hidden_post_title?.trim();
  const message = settings?.board_hidden_post_message?.trim();

  return {
    title: title || DEFAULT_ADMIN_HIDDEN_POST_TITLE,
    message: message || DEFAULT_ADMIN_HIDDEN_POST_MESSAGE,
  };
}

export function isAdminHiddenBoardPost(post: { is_hidden?: boolean | null } | null | undefined) {
  return Boolean(post?.is_hidden);
}

export function isMissingBoardRpcError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("could not find the function") ||
    lower.includes("pgrst202") ||
    lower.includes("schema cache")
  );
}
