/**
 * 관리자 보상 지급 감사 로그.
 */

export type RewardAuditRewardType = "FRAME" | "COUPON" | "ITEM";

export interface RewardDistributionLog {
  logId: string;
  adminId: string;
  adminName: string;
  targetUserId: string;
  targetUserName?: string;
  rewardType: RewardAuditRewardType;
  rewardId: string;
  rewardName: string;
  reason: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

/** DB row (snake_case) */
export type RewardDistributionLogRow = {
  id: string;
  admin_id: string;
  admin_name: string | null;
  target_user_id: string;
  target_user_name: string | null;
  reward_type: string;
  reward_id: string;
  reward_name: string | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export function toRewardDistributionLog(
  row: RewardDistributionLogRow,
): RewardDistributionLog {
  const rewardTypeRaw = (row.reward_type || "FRAME").toUpperCase();
  const rewardType: RewardAuditRewardType =
    rewardTypeRaw === "COUPON" || rewardTypeRaw === "ITEM"
      ? rewardTypeRaw
      : "FRAME";

  return {
    logId: row.id,
    adminId: row.admin_id,
    adminName: row.admin_name?.trim() || row.admin_id,
    targetUserId: row.target_user_id,
    targetUserName: row.target_user_name?.trim() || undefined,
    rewardType,
    rewardId: row.reward_id,
    rewardName: row.reward_name?.trim() || row.reward_id,
    reason: row.reason?.trim() || "",
    ipAddress: row.ip_address?.trim() || "",
    userAgent: row.user_agent?.trim() || "",
    createdAt: row.created_at,
  };
}
