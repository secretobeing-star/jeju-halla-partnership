import type { PromptOptions } from "@/components/PromptModalProvider";

export const BOARD_POST_STATUS = {
  normal: 1,
  warning: 2,
  tempHidden: 3,
  permanentHidden: 4,
} as const;

export type BoardPostModerationStatus =
  (typeof BOARD_POST_STATUS)[keyof typeof BOARD_POST_STATUS];

export const BOARD_POST_STATUS_LABELS: Record<BoardPostModerationStatus, string> = {
  1: "정상",
  2: "1차 경고",
  3: "2차 임시숨김",
  4: "3차 영구숨김",
};

export function normalizeBoardPostStatus(value: unknown): BoardPostModerationStatus {
  const parsed = typeof value === "number" ? value : Number(value);
  if (parsed === 2 || parsed === 3 || parsed === 4) {
    return parsed;
  }
  return BOARD_POST_STATUS.normal;
}

export function getBoardPostStatusLabel(status: number | null | undefined): string {
  return BOARD_POST_STATUS_LABELS[normalizeBoardPostStatus(status)] ?? "정상";
}

export function shouldHideBoardPostByStatus(status: number | null | undefined): boolean {
  return normalizeBoardPostStatus(status) >= BOARD_POST_STATUS.tempHidden;
}

export function mapBoardPostCreateError(message: string): string {
  if (message.includes("Voter key banned")) {
    return "현재 기기에서는 작성할 수 없습니다.";
  }

  if (message.includes("IP banned")) {
    return "현재 IP에서는 게시글을 작성할 수 없습니다.";
  }

  if (message.includes("Client IP is required")) {
    return "접속 IP를 확인할 수 없어 게시글을 등록하지 못했습니다.";
  }

  return message;
}

export type BannedIpRow = {
  id: number;
  ip_address: string;
  reason: string | null;
  created_at: string;
};

export function getIpBanPromptOptions(): PromptOptions {
  return {
    title: "IP 차단 사유",
    description:
      "입력한 사유는 차단된 IP에서 글·댓글·후기 작성 시 사용자에게 팝업으로 표시됩니다. 비우면 저장하지 않습니다.",
    placeholder: "차단 사유 입력",
    multiline: true,
    confirmLabel: "차단",
    cancelLabel: "취소",
    allowEmpty: true,
  };
}

export async function requestIpBanReason(
  prompt: (options: PromptOptions) => Promise<string | null>,
): Promise<string | null> {
  return prompt(getIpBanPromptOptions());
}

export async function isBoardIpModerationEnabledForServer(
  admin: { rpc: (name: string) => PromiseLike<{ data: unknown; error: unknown }> },
): Promise<boolean> {
  const { data, error } = await admin.rpc("is_board_ip_moderation_enabled");

  if (error) {
    return false;
  }

  return Boolean(data);
}
