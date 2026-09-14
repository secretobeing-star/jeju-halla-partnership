export const SEASON_PASS_ITEM_TYPES = ["gold", "coupon", "costume"] as const;
export type SeasonPassItemType = (typeof SEASON_PASS_ITEM_TYPES)[number];

export const SEASON_PASS_QUEST_TYPES = ["partner_visit", "attendance"] as const;
export type SeasonPassQuestType = (typeof SEASON_PASS_QUEST_TYPES)[number];

export function asSeasonPassQuestType(value: unknown): SeasonPassQuestType {
  return value === "attendance" ? "attendance" : "partner_visit";
}

export function seasonPassQuestTypeLabel(value: string) {
  return value === "attendance" ? "출석 체크" : "제휴 방문";
}

export const SEASON_PASS_TRACKS = ["free", "premium"] as const;
export type SeasonPassTrack = (typeof SEASON_PASS_TRACKS)[number];

export type Season = {
  id: string;
  code: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  bg_image_url: string | null;
  ui_image_url: string | null;
  track_image_url: string | null;
  premium_badge_url: string | null;
  free_pass_image_url: string | null;
  premium_pass_image_url: string | null;
  exp_per_level: number;
  visit_exp: number;
  visit_gold: number;
  attendance_exp: number;
  attendance_gold: number;
  premium_gold_price: number;
  gold_shop_enabled: boolean;
  sort_order: number;
};

export function isGoldShopEnabled(season: Pick<Season, "gold_shop_enabled"> | null | undefined) {
  return Boolean(season) && season?.gold_shop_enabled !== false;
}

export type RewardItem = {
  id: string;
  name: string;
  item_type: SeasonPassItemType;
  image_url: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
};

export type SeasonPassLevel = {
  id: string;
  season_id: string;
  level: number;
  required_exp: number;
  free_reward_item_id: string | null;
  premium_reward_item_id: string | null;
  free_reward?: RewardItem | null;
  premium_reward?: RewardItem | null;
};

export type UserSeasonProgress = {
  id?: string;
  user_id: string;
  season_id: string;
  level: number;
  exp: number;
  gold: number;
  is_premium: boolean;
};

export type SeasonQuest = {
  id: string;
  season_id: string;
  title: string;
  quest_type: string;
  target_count: number;
  reward_exp: number;
  reward_gold: number;
  is_active: boolean;
  sort_order: number;
};

export type SeasonPassClaim = {
  level: number;
  track: SeasonPassTrack;
  reward_item_id: string | null;
  claimed_at: string;
};

export type SeasonPassWidgetState = {
  season: Season | null;
  progress: UserSeasonProgress | null;
  levels: SeasonPassLevel[];
  claims: SeasonPassClaim[];
  quests: Array<SeasonQuest & { progress: number; is_completed: boolean }>;
  attendedToday: boolean;
  currentLevel: number;
  currentExp: number;
  nextLevelExp: number;
  expIntoLevel: number;
  expForLevel: number;
  isPremium: boolean;
};

export function isSeasonLive(season: Pick<Season, "starts_at" | "ends_at">, now = Date.now()) {
  const start = season.starts_at ? Date.parse(season.starts_at) : Number.NaN;
  const end = season.ends_at ? Date.parse(season.ends_at) : Number.NaN;
  if (Number.isFinite(start) && now < start) return false;
  if (Number.isFinite(end) && now > end) return false;
  return true;
}

export function asRewardMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function computeLevelFromExp(
  exp: number,
  levels: Pick<SeasonPassLevel, "level" | "required_exp">[],
  expPerLevel: number,
) {
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  if (sorted.length === 0) {
    const level = Math.max(1, 1 + Math.floor(Math.max(0, exp) / Math.max(1, expPerLevel)));
    const into = Math.max(0, exp) % Math.max(1, expPerLevel);
    return {
      level,
      expIntoLevel: into,
      expForLevel: Math.max(1, expPerLevel),
      nextLevelExp: level * Math.max(1, expPerLevel),
    };
  }

  let current = sorted[0];
  for (const row of sorted) {
    if (exp >= row.required_exp) {
      current = row;
    }
  }

  const next = sorted.find((row) => row.level > current.level) ?? null;
  const floorExp = current.required_exp;
  const ceilExp = next?.required_exp ?? floorExp + Math.max(1, expPerLevel);
  const span = Math.max(1, ceilExp - floorExp);

  return {
    level: current.level,
    expIntoLevel: Math.min(span, Math.max(0, exp - floorExp)),
    expForLevel: span,
    nextLevelExp: ceilExp,
  };
}
