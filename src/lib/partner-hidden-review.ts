import type { SiteSettings } from "@/lib/supabase";

export const DEFAULT_PARTNER_HIDDEN_REVIEW_TITLE = "관리자에 의해 숨김처리가 되었습니다.";
export const DEFAULT_PARTNER_HIDDEN_REVIEW_MESSAGE =
  "관리자에 의해 숨김처리가 되었습니다.";

export type HiddenReviewDisplay = {
  title: string;
  message: string;
};

export function getHiddenReviewDisplay(
  settings?: Partial<SiteSettings> | null,
): HiddenReviewDisplay {
  const title = settings?.partner_hidden_review_title?.trim();
  const message = settings?.partner_hidden_review_message?.trim();

  return {
    title: title || DEFAULT_PARTNER_HIDDEN_REVIEW_TITLE,
    message: message || DEFAULT_PARTNER_HIDDEN_REVIEW_MESSAGE,
  };
}
