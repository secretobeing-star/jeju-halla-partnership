import type { AlertOptions, ConfirmOptions } from "@/components/PromptModalProvider";
import { isProfanityBlockedError, PROFANITY_BLOCKED_MESSAGE } from "@/lib/profanity-filter";

type Alerter = (options: AlertOptions) => Promise<void>;
type Confirmer = (options: ConfirmOptions) => Promise<boolean>;

export function isWrongPasswordError(message: string): boolean {
  return (
    message.includes("Incorrect password") || message.includes("비밀번호가 일치하지 않습니다")
  );
}

export function isDeviceBannedError(message: string): boolean {
  return (
    message.includes("Voter key banned") ||
    message.includes("현재 기기에서는 게시글을 작성할 수 없습니다") ||
    message.includes("현재 기기에서는 후기를 작성할 수 없습니다") ||
    message.includes("현재 기기에서는 작성할 수 없습니다")
  );
}

export function isIpBannedError(message: string): boolean {
  return (
    message.includes("IP banned") ||
    message.includes("현재 IP에서는 게시글을 작성할 수 없습니다") ||
    message.includes("현재 IP에서는 후기를 작성할 수 없습니다") ||
    message.includes("현재 IP에서는 작성할 수 없습니다")
  );
}

export async function alertWrongPassword(alert: Alerter): Promise<void> {
  await alert({
    title: "비밀번호 확인",
    message: "비밀번호가 일치하지 않습니다.",
  });
}

export async function alertDeviceBan(alert: Alerter, reason?: string | null): Promise<void> {
  let message = "현재 기기에서는 작성할 수 없습니다.";
  const trimmedReason = reason?.trim();
  if (trimmedReason) {
    message += `\n\n차단 사유\n${trimmedReason}`;
  }

  await alert({
    title: "작성 제한",
    message,
  });
}

export async function alertIpBan(alert: Alerter, reason?: string | null): Promise<void> {
  let message = "현재 IP에서는 작성할 수 없습니다.";
  const trimmedReason = reason?.trim();
  if (trimmedReason) {
    message += `\n\n차단 사유\n${trimmedReason}`;
  }

  await alert({
    title: "작성 제한",
    message,
  });
}

export async function alertProfanityBlocked(alert: Alerter): Promise<void> {
  await alert({
    title: "등록 안내",
    message: PROFANITY_BLOCKED_MESSAGE,
  });
}

export async function confirmDeletion(confirm: Confirmer, message: string): Promise<boolean> {
  return confirm({
    title: "삭제 확인",
    message,
    confirmLabel: "삭제",
    cancelLabel: "취소",
    destructive: true,
  });
}

export async function maybeAlertPasswordError(alert: Alerter, message: string): Promise<boolean> {
  if (!isWrongPasswordError(message)) {
    return false;
  }

  await alertWrongPassword(alert);
  return true;
}

export type BoardWriteAccess = {
  allowed: boolean;
  reason: string | null;
  ban_type?: "ip" | "device" | null;
};

export async function alertWriteAccessDenied(
  alert: Alerter,
  access: Pick<BoardWriteAccess, "reason" | "ban_type">,
): Promise<void> {
  if (access.ban_type === "device") {
    await alertDeviceBan(alert, access.reason);
    return;
  }

  await alertIpBan(alert, access.reason);
}

export async function resolveBoardActionError(
  alert: Alerter,
  message: string,
  banReason?: string | null,
  banType?: "ip" | "device" | null,
): Promise<boolean> {
  if (isProfanityBlockedError(message)) {
    await alertProfanityBlocked(alert);
    return true;
  }

  if (isWrongPasswordError(message)) {
    await alertWrongPassword(alert);
    return true;
  }

  if (isDeviceBannedError(message)) {
    await alertDeviceBan(alert, banReason);
    return true;
  }

  if (isIpBannedError(message)) {
    await alertIpBan(alert, banReason);
    return true;
  }

  if (banType === "device") {
    await alertDeviceBan(alert, banReason);
    return true;
  }

  if (banType === "ip") {
    await alertIpBan(alert, banReason);
    return true;
  }

  return false;
}

export async function fetchBoardWriteAccess(voterKey?: string): Promise<BoardWriteAccess> {
  try {
    const query =
      voterKey && voterKey.trim().length >= 8
        ? `?voter_key=${encodeURIComponent(voterKey.trim())}`
        : "";
    const response = await fetch(`/api/board/write-access${query}`);
    if (!response.ok) {
      return { allowed: true, reason: null, ban_type: null };
    }

    const body = (await response.json()) as Partial<BoardWriteAccess>;
    const banType = body.ban_type === "device" || body.ban_type === "ip" ? body.ban_type : null;
    return {
      allowed: body.allowed !== false,
      reason: typeof body.reason === "string" ? body.reason : null,
      ban_type: banType,
    };
  } catch {
    return { allowed: true, reason: null, ban_type: null };
  }
}
