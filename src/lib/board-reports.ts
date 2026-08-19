import type { PromptOptions } from "@/components/PromptModalProvider";
import type { SiteSettings } from "@/lib/supabase";

export const DEFAULT_BOARD_REPORT_REASONS = [
  "스팸/광고",
  "욕설/비방",
  "음란물",
  "개인정보 노출",
  "기타",
] as const;

export const DEFAULT_BOARD_REPORT_SUCCESS_MESSAGE = "신고 완료했습니다.";

export type BoardReportReasonsByBoard = Record<string, string[]>;

export type BoardReport = {
  id: number;
  post_id: string | null;
  comment_id: string | null;
  partner_review_id: string | null;
  event_comment_id?: string | null;
  reason: string;
  reporter_ip: string | null;
  is_reviewed: boolean;
  is_admin_created: boolean;
  admin_action_reason: string | null;
  created_at: string;
};

export function normalizeBoardReportReasons(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_BOARD_REPORT_REASONS];
  }

  const reasons = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, 20);

  return reasons.length > 0 ? reasons : [...DEFAULT_BOARD_REPORT_REASONS];
}

export function normalizeBoardReportReasonsByBoard(value: unknown): BoardReportReasonsByBoard {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: BoardReportReasonsByBoard = {};

  for (const [boardId, reasons] of Object.entries(value)) {
    const trimmedId = boardId.trim();
    if (!trimmedId) {
      continue;
    }

    const normalized = normalizeBoardReportReasons(reasons);
    if (normalized.length > 0) {
      result[trimmedId] = normalized;
    }
  }

  return result;
}

export function getBoardReportReasons(settings?: Partial<SiteSettings> | null): string[] {
  return normalizeBoardReportReasons(settings?.board_report_reasons);
}

export function getBoardReportReasonsForBoard(
  settings: Partial<SiteSettings> | null | undefined,
  _boardId?: string | null,
): string[] {
  return getBoardReportReasons(settings);
}

export function getPartnerReviewReportReasons(settings?: Partial<SiteSettings> | null): string[] {
  return getBoardReportReasons(settings);
}

export function getBoardReportSuccessMessage(settings?: Partial<SiteSettings> | null): string {
  const message = settings?.board_report_success_message?.trim();
  return message || DEFAULT_BOARD_REPORT_SUCCESS_MESSAGE;
}

export async function alertReportSuccess(
  alert: (options: import("@/components/PromptModalProvider").AlertOptions) => Promise<void>,
  settings?: Partial<SiteSettings> | null,
): Promise<void> {
  await alert({
    title: "신고 완료",
    message: getBoardReportSuccessMessage(settings),
  });
}

export function getBoardReportPromptOptions(reasons: readonly string[]): PromptOptions {
  return {
    title: "신고하기",
    description: "신고 사유를 선택하거나 입력해 주세요.",
    placeholder:
      reasons.length > 0 ? `번호(1~${reasons.length}) 또는 사유 입력` : "신고 사유 입력",
    presetOptions: reasons,
    confirmLabel: "신고 접수",
    cancelLabel: "취소",
  };
}

export function getAdminSuspensionPromptOptions(actionLabel = "정지"): PromptOptions {
  return {
    title: `${actionLabel} 사유`,
    description: "입력한 사유는 숨김 처리된 글·댓글·후기에 사용자에게 표시됩니다. 비우면 저장하지 않습니다.",
    placeholder: `${actionLabel} 사유 입력`,
    multiline: true,
    confirmLabel: "확인",
    cancelLabel: "취소",
    allowEmpty: true,
  };
}

export async function requestBoardReportReason(
  prompt: (options: PromptOptions) => Promise<string | null>,
  reasons: readonly string[],
): Promise<string | null> {
  const raw = await prompt(getBoardReportPromptOptions(reasons));
  if (raw === null) {
    return null;
  }

  return resolveBoardReportReason(raw, reasons);
}

export async function requestAdminSuspensionReason(
  prompt: (options: PromptOptions) => Promise<string | null>,
  actionLabel = "정지",
): Promise<string | null> {
  return prompt(getAdminSuspensionPromptOptions(actionLabel));
}

export type ReportBanType = "ip" | "device";

export function getReportBanTypePromptOptions(
  canBanIp: boolean,
  canBanDevice: boolean,
): PromptOptions {
  const presetOptions: string[] = [];
  if (canBanIp) {
    presetOptions.push("IP 차단");
  }
  if (canBanDevice) {
    presetOptions.push("기기 차단");
  }

  return {
    title: "차단 방식 선택",
    description:
      presetOptions.length > 1
        ? "신고 대상 작성자에 적용할 차단 방식을 선택하세요. 예: 1 — IP 차단, 2 — 기기 차단"
        : "신고 대상 작성자에 적용할 차단 방식을 선택하세요.",
    placeholder: presetOptions.length > 1 ? "1 또는 2 입력" : "1 입력",
    presetOptions,
    confirmLabel: "다음",
    cancelLabel: "취소",
  };
}

export function resolveReportBanType(
  input: string,
  canBanIp: boolean,
  canBanDevice: boolean,
): ReportBanType | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const numbered = trimmed.match(/^(\d+)$/);
  if (numbered) {
    const index = Number(numbered[1]) - 1;
    const options: ReportBanType[] = [];
    if (canBanIp) {
      options.push("ip");
    }
    if (canBanDevice) {
      options.push("device");
    }
    return options[index] ?? null;
  }

  if (trimmed.includes("IP")) {
    return canBanIp ? "ip" : null;
  }

  if (trimmed.includes("기기")) {
    return canBanDevice ? "device" : null;
  }

  return null;
}

export async function requestReportBanType(
  prompt: (options: PromptOptions) => Promise<string | null>,
  canBanIp: boolean,
  canBanDevice: boolean,
): Promise<ReportBanType | null> {
  const raw = await prompt(getReportBanTypePromptOptions(canBanIp, canBanDevice));
  if (raw === null) {
    return null;
  }

  return resolveReportBanType(raw, canBanIp, canBanDevice);
}

export function resolveBoardReportReason(
  input: string,
  reasons: readonly string[],
): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const numbered = trimmed.match(/^(\d+)$/);
  if (numbered) {
    const index = Number(numbered[1]) - 1;
    return reasons[index] ?? null;
  }

  const matched = reasons.find((reason) => reason === trimmed);
  if (matched) {
    return matched;
  }

  if (trimmed.length > 200) {
    return trimmed.slice(0, 200);
  }

  return trimmed;
}

export function mapBoardReportError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("duplicate") ||
    lower.includes("unique") ||
    lower.includes("already reported")
  ) {
    return "이미 신고한 항목입니다.";
  }

  if (lower.includes("board_reports") && lower.includes("does not exist")) {
    return "신고 기능 SQL이 필요합니다. Supabase에서 board-reports-and-comment-ip.sql을 실행해 주세요.";
  }

  if (lower.includes("reason")) {
    return "신고 사유를 입력해 주세요.";
  }

  if (lower.includes("not found")) {
    return "신고 대상을 찾을 수 없습니다.";
  }

  if (lower.includes("admin-managed") || lower.includes("cannot be reported")) {
    return "관리자가 작성한 항목은 신고할 수 없습니다.";
  }

  return message;
}

export async function submitBoardReport(payload: {
  postId?: string;
  commentId?: string;
  partnerReviewId?: string;
  eventCommentId?: string;
  reason: string;
}) {
  const response = await fetch("/api/board/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      post_id: payload.postId ?? null,
      comment_id: payload.commentId ?? null,
      partner_review_id: payload.partnerReviewId ?? null,
      event_comment_id: payload.eventCommentId ?? null,
      reason: payload.reason,
    }),
  });

  const body = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(mapBoardReportError(body.error ?? "신고 접수에 실패했습니다."));
  }
}
