export const GOLD_LEDGER_SOURCES = [
  "attendance",
  "visit",
  "quest",
  "claim",
  "shop_spend",
  "shop_reward",
  "gacha",
  "premium",
  "admin",
] as const;

export type GoldLedgerSource = (typeof GOLD_LEDGER_SOURCES)[number];

export const GOLD_SOURCE_LABELS: Record<GoldLedgerSource, string> = {
  attendance: "출석",
  visit: "제휴 방문",
  quest: "퀘스트",
  claim: "시즌패스 보상",
  shop_spend: "골드상점 구매",
  shop_reward: "상점 골드 상품",
  gacha: "뽑기",
  premium: "프리미엄 패스",
  admin: "관리자 지급",
};

export type GoldAnalyticsDaily = {
  date: string;
  gained: number;
  spent: number;
};

export type GoldAnalyticsSourceRow = {
  source: GoldLedgerSource;
  label: string;
  gained: number;
  spent: number;
};

export type GoldAnalyticsSummary = {
  periodLabel: string;
  averageLabel: string;
  gained: number;
  spent: number;
  net: number;
  daily: GoldAnalyticsDaily[];
  sources: GoldAnalyticsSourceRow[];
};

export function emptyGoldDaily(date: string): GoldAnalyticsDaily {
  return { date, gained: 0, spent: 0 };
}

export function emptyGoldSources(): GoldAnalyticsSourceRow[] {
  return GOLD_LEDGER_SOURCES.map((source) => ({
    source,
    label: GOLD_SOURCE_LABELS[source],
    gained: 0,
    spent: 0,
  }));
}

export function asGoldLedgerSource(value: string): GoldLedgerSource | null {
  return (GOLD_LEDGER_SOURCES as readonly string[]).includes(value)
    ? (value as GoldLedgerSource)
    : null;
}
