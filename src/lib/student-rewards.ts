export type StudentRewardStatus = "pending" | "claimed";

export type StudentRewardRow = {
  id: string;
  student_id: string;
  reward_type: string;
  frame_id: string | null;
  coupon_code?: string | null;
  gold_amount?: number | null;
  title: string | null;
  message: string | null;
  status: StudentRewardStatus;
  created_by: string | null;
  created_at: string;
  claimed_at: string | null;
  expires_at?: string | null;
};

export type StudentRewardPublic = {
  id: string;
  rewardType: string;
  frameId: string | null;
  frameName: string | null;
  frameImageUrl: string | null;
  goldAmount: number | null;
  couponCode: string | null;
  title: string;
  message: string;
  status: StudentRewardStatus;
  createdAt: string;
  claimedAt: string | null;
  expiresAt: string | null;
};

export function parseStudentIds(raw: string): string[] {
  const parts = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

export function isStudentRewardExpired(expiresAt?: string | null, now = Date.now()) {
  if (!expiresAt) {
    return false;
  }
  const end = new Date(expiresAt).getTime();
  return Number.isFinite(end) && end <= now;
}

export function resolveRewardExpiresAt(options: {
  validDays?: number | string | null;
  expiresAt?: string | null;
  from?: Date;
}): string | null {
  const explicit = String(options.expiresAt ?? "").trim();
  if (explicit) {
    const parsed = new Date(explicit);
    if (Number.isFinite(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const days = Math.floor(Number(options.validDays) || 0);
  if (days < 1) {
    return null;
  }

  const from = options.from ?? new Date();
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}
