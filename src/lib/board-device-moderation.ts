import type { PromptOptions } from "@/components/PromptModalProvider";

export function mapDeviceBanCreateError(message: string): string {
  if (message.includes("Voter key banned")) {
    return "현재 기기에서는 작성할 수 없습니다.";
  }

  return message;
}

export type BannedVoterKeyRow = {
  id: number;
  voter_key: string;
  reason: string | null;
  created_at: string;
};

export function formatVoterKeyLabel(voterKey: string): string {
  const trimmed = voterKey.trim();
  if (trimmed.length <= 16) {
    return trimmed;
  }

  return `${trimmed.slice(0, 8)}…${trimmed.slice(-4)}`;
}

export function getDeviceBanPromptOptions(): PromptOptions {
  return {
    title: "기기 차단 사유",
    description:
      "입력한 사유는 차단된 기기에서 글·댓글·후기 작성 시 사용자에게 팝업으로 표시됩니다. 비우면 저장하지 않습니다.",
    placeholder: "차단 사유 입력",
    multiline: true,
    confirmLabel: "차단",
    cancelLabel: "취소",
    allowEmpty: true,
  };
}

export async function requestDeviceBanReason(
  prompt: (options: PromptOptions) => Promise<string | null>,
): Promise<string | null> {
  return prompt(getDeviceBanPromptOptions());
}

export async function isBoardDeviceModerationEnabledForServer(
  admin: { rpc: (name: string) => PromiseLike<{ data: unknown; error: unknown }> },
): Promise<boolean> {
  const { data, error } = await admin.rpc("is_board_device_moderation_enabled");

  if (error) {
    return false;
  }

  return Boolean(data);
}
