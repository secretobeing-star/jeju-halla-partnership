export type GachaAnalyticsKind = "costume" | "gold" | "coupon";

export type GachaAnalyticsItem = {
  boxId: string;
  boxName: string;
  rewardId: string;
  name: string;
  kind: GachaAnalyticsKind;
  count: number;
  goldSpent: number;
  designedProbability: number;
};

export type GachaAnalyticsBox = {
  id: string;
  name: string;
  pullCount: number;
};

export type GachaAnalyticsSummary = {
  periodLabel: string;
  pullCount: number;
  goldSpent: number;
  boxes: GachaAnalyticsBox[];
  items: GachaAnalyticsItem[];
};

export function gachaKindLabel(kind: string) {
  if (kind === "gold") return "골드";
  if (kind === "coupon") return "쿠폰";
  return "코스튬";
}
