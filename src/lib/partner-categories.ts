import { SiteSettings } from "@/lib/supabase";

export const DEFAULT_PARTNER_CATEGORIES = [
  "음식점",
  "요리주점/바(BAR)",
  "카페/디저트",
  "뷰티/헤어",
  "생활/의료/기타",
] as const;

const MAX_PARTNER_CATEGORIES = 20;
const MAX_PARTNER_CATEGORY_LENGTH = 30;

export function normalizePartnerCategoryLabel(
  value: string | null | undefined,
  fallback = "새 카테고리",
): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, MAX_PARTNER_CATEGORY_LENGTH);
}

export function normalizePartnerCategories(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_PARTNER_CATEGORIES];
  }

  const seen = new Set<string>();
  const categories: string[] = [];

  for (const item of raw) {
    if (typeof item !== "string") {
      continue;
    }

    const label = normalizePartnerCategoryLabel(item, "");
    if (!label || seen.has(label)) {
      continue;
    }

    seen.add(label);
    categories.push(label);

    if (categories.length >= MAX_PARTNER_CATEGORIES) {
      break;
    }
  }

  return categories.length > 0 ? categories : [...DEFAULT_PARTNER_CATEGORIES];
}

export function getPartnerCategories(
  settings?: Partial<SiteSettings> | null,
): string[] {
  return normalizePartnerCategories(settings?.partner_categories);
}

export function normalizeStoredPartnerCategory(
  category: string,
  categories: string[],
): string {
  const trimmed = category.trim();

  if (trimmed === "요리주점" && categories.includes("요리주점/바(BAR)")) {
    return "요리주점/바(BAR)";
  }

  if (categories.includes(trimmed)) {
    return trimmed;
  }

  return categories[0] ?? DEFAULT_PARTNER_CATEGORIES[0];
}

export function partnerMatchesCategory(
  partnerCategory: string,
  selectedCategory: string,
): boolean {
  if (partnerCategory === selectedCategory) {
    return true;
  }

  if (selectedCategory === "요리주점/바(BAR)" && partnerCategory === "요리주점") {
    return true;
  }

  return false;
}
