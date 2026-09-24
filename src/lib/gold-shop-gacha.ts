export const GACHA_REWARD_KINDS = ["costume", "gold", "coupon"] as const;
export type GachaRewardKind = (typeof GACHA_REWARD_KINDS)[number];

export type GoldShopGachaReward = {
  id: string;
  box_id: string;
  kind: GachaRewardKind;
  name: string;
  probability: number;
  gold_amount: number;
  frame_id: string | null;
  coupon_code: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export type GachaOpenPlace = "shop" | "inventory";

export type GoldShopGachaBox = {
  id: string;
  season_id: string | null;
  name: string;
  price_gold: number;
  original_price_gold: number;
  badge_label: string;
  fx_enabled: boolean;
  idle_image_url: string | null;
  burst_image_url: string | null;
  open_place: GachaOpenPlace;
  layout_count: number;
  confirm_popup: boolean;
  is_active: boolean;
  sort_order: number;
  rewards: GoldShopGachaReward[];
};

export function asGachaOpenPlace(value: unknown): GachaOpenPlace {
  return value === "inventory" ? "inventory" : "shop";
}

export function asGachaRewardKind(value: unknown): GachaRewardKind {
  return value === "gold" || value === "coupon" ? value : "costume";
}

export function mapGachaReward(row: Record<string, unknown>): GoldShopGachaReward {
  return {
    id: String(row.id ?? ""),
    box_id: String(row.box_id ?? ""),
    kind: asGachaRewardKind(row.kind),
    name: String(row.name ?? "").trim(),
    probability: Math.max(0, Number(row.probability) || 0),
    gold_amount: Math.max(0, Number(row.gold_amount) || 0),
    frame_id: String(row.frame_id ?? "").trim() || null,
    coupon_code: String(row.coupon_code ?? "").trim() || null,
    image_url: String(row.image_url ?? "").trim() || null,
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order) || 0,
  };
}

export function mapGachaBox(
  row: Record<string, unknown>,
  rewards: GoldShopGachaReward[] = [],
): GoldShopGachaBox {
  return {
    id: String(row.id ?? ""),
    season_id: String(row.season_id ?? "").trim() || null,
    name: String(row.name ?? "").trim() || "확률 상자",
    price_gold: Math.max(0, Number(row.price_gold) || 0),
    original_price_gold: Math.max(0, Number(row.original_price_gold) || 0),
    badge_label: String(row.badge_label ?? "").trim(),
    fx_enabled: row.fx_enabled !== false,
    idle_image_url: String(row.idle_image_url ?? "").trim() || null,
    burst_image_url: String(row.burst_image_url ?? "").trim() || null,
    open_place: asGachaOpenPlace(row.open_place),
    layout_count: Math.max(1, Math.min(20, Math.floor(Number(row.layout_count) || 1))),
    confirm_popup: row.confirm_popup !== false,
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order) || 0,
    rewards,
  };
}

export function clampGachaPullCount(value: unknown, maxRaw = 20) {
  const max = Math.max(1, Math.min(20, Math.floor(Number(maxRaw) || 1)));
  return Math.max(1, Math.min(max, Math.floor(Number(value) || 1)));
}

export function pickGachaReward(rewards: GoldShopGachaReward[]): GoldShopGachaReward | null {
  const active = rewards.filter((item) => item.is_active && item.probability > 0);
  if (active.length === 0) {
    return null;
  }
  const total = active.reduce((sum, item) => sum + item.probability, 0);
  let cursor = Math.random() * total;
  for (const item of active) {
    cursor -= item.probability;
    if (cursor <= 0) {
      return item;
    }
  }
  return active[active.length - 1] ?? null;
}

export function gachaProbabilityTotal(rewards: GoldShopGachaReward[], kind?: GachaRewardKind) {
  return rewards
    .filter((item) => item.is_active && (!kind || item.kind === kind))
    .reduce((sum, item) => sum + item.probability, 0);
}
