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

export const GOLD_SHOP_FILTER_IDS = ["all", "pass", "costume", "coupon", "gacha"] as const;
export type GoldShopFilterId = (typeof GOLD_SHOP_FILTER_IDS)[number];

export type GoldShopFilterTab = {
  id: GoldShopFilterId;
  label: string;
};

export const DEFAULT_GOLD_SHOP_FILTER_TABS: GoldShopFilterTab[] = [
  { id: "all", label: "전체" },
  { id: "pass", label: "패스" },
  { id: "costume", label: "코스튬" },
  { id: "coupon", label: "쿠폰" },
  { id: "gacha", label: "확률" },
];

export function asGoldShopFilterId(value: unknown): GoldShopFilterId | null {
  return (GOLD_SHOP_FILTER_IDS as readonly string[]).includes(String(value))
    ? (value as GoldShopFilterId)
    : null;
}

export function parseGoldShopFilterTabs(value: unknown): GoldShopFilterTab[] {
  const byId = new Map(DEFAULT_GOLD_SHOP_FILTER_TABS.map((tab) => [tab.id, tab.label]));
  const ordered: GoldShopFilterTab[] = [];
  const seen = new Set<GoldShopFilterId>();
  const source = Array.isArray(value) ? value : [];
  for (const item of source) {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const id = asGoldShopFilterId(row.id);
    if (!id || seen.has(id)) continue;
    const label = String(row.label ?? "").trim() || byId.get(id) || id;
    ordered.push({ id, label });
    seen.add(id);
  }
  for (const tab of DEFAULT_GOLD_SHOP_FILTER_TABS) {
    if (seen.has(tab.id)) continue;
    ordered.push(tab);
  }
  return ordered;
}

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
  gold_icon_url: string | null;
  claimed_check_image_url: string | null;
  exp_per_level: number;
  visit_exp: number;
  visit_gold: number;
  attendance_exp: number;
  attendance_gold: number;
  premium_gold_price: number;
  premium_original_price_gold: number;
  premium_badge_label: string;
  gold_shop_enabled: boolean;
  costume_preview_enabled: boolean;
  shop_filter_tabs: GoldShopFilterTab[];
  sort_order: number;
};

export function isGoldShopEnabled(season: Pick<Season, "gold_shop_enabled"> | null | undefined) {
  return Boolean(season) && season?.gold_shop_enabled !== false;
}

export function isCostumeShopPreviewEnabled(
  season: Pick<Season, "costume_preview_enabled"> | null | undefined,
) {
  return season?.costume_preview_enabled !== false;
}

export const GOLD_SHOP_CATALOG_CODE = "gold-shop";

export function isGoldShopCatalogSeason(season: { code?: string | null } | null | undefined) {
  const code = season?.code?.trim() ?? "";
  return code === GOLD_SHOP_CATALOG_CODE || code.startsWith(`${GOLD_SHOP_CATALOG_CODE}-`);
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
  description: string;
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

export type GoldShopItem = {
  id: string;
  season_id: string;
  reward_item_id: string | null;
  name: string;
  item_kind: "reward" | "premium";
  price_gold: number;
  original_price_gold: number;
  badge_label: string;
  stock: number | null;
  per_user_limit: number;
  is_active: boolean;
  sort_order: number;
  reward?: RewardItem | null;
  purchased_count: number;
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
  passEnabled: boolean;
  goldShopEnabled: boolean;
  shopItems: GoldShopItem[];
  gachaBoxes: import("@/lib/gold-shop-gacha").GoldShopGachaBox[];
};

export function isGoldShopOpen(
  state: Pick<SeasonPassWidgetState, "goldShopEnabled" | "season" | "shopItems" | "gachaBoxes"> | null | undefined,
) {
  if (!state) return false;
  return (
    Boolean(state.goldShopEnabled) ||
    isGoldShopEnabled(state.season) ||
    state.shopItems.length > 0 ||
    (state.gachaBoxes?.length ?? 0) > 0
  );
}

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
