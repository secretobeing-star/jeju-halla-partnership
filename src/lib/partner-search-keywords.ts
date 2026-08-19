import { SiteSettings } from "@/lib/supabase";

export type PartnerSearchKeywordGroup = {
  id: string;
  trigger: string;
  keywords: string[];
};

const MAX_SEARCH_KEYWORD_GROUPS = 30;
const MAX_TRIGGER_LENGTH = 20;
const MAX_KEYWORDS_PER_GROUP = 40;
const MAX_KEYWORD_LENGTH = 30;

export function normalizePartnerSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export const DEFAULT_PARTNER_SEARCH_KEYWORD_GROUPS: PartnerSearchKeywordGroup[] = [
  {
    id: "search-meat",
    trigger: "고기",
    keywords: [
      "삼겹",
      "삼겹살",
      "갈비",
      "갈비살",
      "흑돼지",
      "돼지",
      "소고기",
      "한우",
      "양고기",
      "곱창",
      "막창",
      "바베큐",
      "bbq",
      "구이",
      "숯불",
      "목살",
      "등심",
      "불고기",
      "육회",
      "스테이크",
      "steak",
    ],
  },
  {
    id: "search-cafe",
    trigger: "카페",
    keywords: [
      "커피",
      "coffee",
      "디저트",
      "베이커리",
      "케이크",
      "빵",
      "라떼",
      "아메리카노",
      "브런치",
      "마카롱",
    ],
  },
  {
    id: "search-bar",
    trigger: "술",
    keywords: [
      "주점",
      "호프",
      "펍",
      "pub",
      "bar",
      "와인",
      "맥주",
      "이자카야",
      "포차",
      "칵테일",
      "cocktail",
    ],
  },
  {
    id: "search-beauty",
    trigger: "미용",
    keywords: [
      "헤어",
      "네일",
      "뷰티",
      "피부",
      "왁싱",
      "속눈썹",
      "네일아트",
      "펌",
      "염색",
    ],
  },
  {
    id: "search-medical",
    trigger: "병원",
    keywords: ["치과", "약국", "한의원", "한의", "피부과", "정형외과", "내과", "외과"],
  },
  {
    id: "search-dental",
    trigger: "치과",
    keywords: ["치과의원", "치아", "교정", "임플란트"],
  },
];

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase().slice(0, MAX_KEYWORD_LENGTH);
}

function normalizeTrigger(value: string, fallback: string): string {
  const trimmed = value.trim().slice(0, MAX_TRIGGER_LENGTH);
  return trimmed || fallback;
}

function cloneDefaultGroups(): PartnerSearchKeywordGroup[] {
  return DEFAULT_PARTNER_SEARCH_KEYWORD_GROUPS.map((group) => ({
    id: group.id,
    trigger: group.trigger,
    keywords: [...group.keywords],
  }));
}

export function normalizePartnerSearchKeywordGroups(raw: unknown): PartnerSearchKeywordGroup[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return cloneDefaultGroups();
  }

  const seenTriggers = new Set<string>();
  const groups: PartnerSearchKeywordGroup[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Partial<PartnerSearchKeywordGroup>;
    const trigger = normalizeTrigger(String(record.trigger ?? ""), "");
    if (!trigger) {
      continue;
    }

    const triggerKey = trigger.toLowerCase();
    if (seenTriggers.has(triggerKey)) {
      continue;
    }

    const keywordSource = Array.isArray(record.keywords) ? record.keywords : [];
    const keywords: string[] = [];
    const seenKeywords = new Set<string>([triggerKey]);

    for (const keywordItem of keywordSource) {
      if (typeof keywordItem !== "string") {
        continue;
      }

      const keyword = normalizeKeyword(keywordItem);
      if (!keyword || seenKeywords.has(keyword)) {
        continue;
      }

      seenKeywords.add(keyword);
      keywords.push(keyword);

      if (keywords.length >= MAX_KEYWORDS_PER_GROUP) {
        break;
      }
    }

    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `search-keyword-${triggerKey}-${groups.length}`;

    seenTriggers.add(triggerKey);
    groups.push({ id, trigger, keywords });

    if (groups.length >= MAX_SEARCH_KEYWORD_GROUPS) {
      break;
    }
  }

  return groups.length > 0 ? groups : cloneDefaultGroups();
}

export function getPartnerSearchKeywordGroups(
  settings?: Partial<SiteSettings> | null,
): PartnerSearchKeywordGroup[] {
  return normalizePartnerSearchKeywordGroups(settings?.partner_search_keyword_groups);
}

export function buildPartnerSearchKeywordExpansionGroups(
  groups: readonly PartnerSearchKeywordGroup[],
): string[][] {
  return groups.map((group) => {
    const trigger = normalizeKeyword(group.trigger);
    const terms = new Set<string>([trigger]);

    for (const keyword of group.keywords) {
      const normalized = normalizeKeyword(keyword);
      if (normalized) {
        terms.add(normalized);
      }
    }

    return [...terms];
  });
}

export function parsePartnerSearchKeywordsInput(value: string): string[] {
  return value
    .split(/[,，、|\n/]+/)
    .map((item) => normalizeKeyword(item))
    .filter(Boolean);
}

export function formatPartnerSearchKeywordsInput(keywords: readonly string[]): string {
  return keywords.join(", ");
}
