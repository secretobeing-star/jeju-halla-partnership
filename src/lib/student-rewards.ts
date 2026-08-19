export type StudentRewardStatus = "pending" | "claimed";

export type StudentRewardRow = {
  id: string;
  student_id: string;
  reward_type: string;
  frame_id: string | null;
  title: string | null;
  message: string | null;
  status: StudentRewardStatus;
  created_by: string | null;
  created_at: string;
  claimed_at: string | null;
};

export type StudentRewardPublic = {
  id: string;
  rewardType: string;
  frameId: string | null;
  frameName: string | null;
  frameImageUrl: string | null;
  title: string;
  message: string;
  status: StudentRewardStatus;
  createdAt: string;
  claimedAt: string | null;
};

export function parseStudentIds(raw: string): string[] {
  const parts = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
}
