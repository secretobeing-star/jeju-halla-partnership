import { partnerMatchesCategory } from "@/lib/partner-categories";
import {
  buildPartnerSearchKeywordExpansionGroups,
  getPartnerSearchKeywordGroups,
  normalizePartnerSearchQuery,
  type PartnerSearchKeywordGroup,
} from "@/lib/partner-search-keywords";
import { Partner, SiteSettings } from "@/lib/supabase";

export { normalizePartnerSearchQuery } from "@/lib/partner-search-keywords";

export function getPartnerSearchableTexts(partner: Partner): string[] {
  return [
    partner.name,
    partner.category,
    partner.address,
    partner.benefit,
    partner.region ?? "",
    partner.business_info ?? "",
    partner.detail_description ?? "",
  ].map((field) => field.toLowerCase());
}

function getPartnerContentSearchTexts(partner: Partner): string[] {
  return [
    partner.name,
    partner.address,
    partner.benefit,
    partner.region ?? "",
    partner.business_info ?? "",
    partner.detail_description ?? "",
  ].map((field) => field.toLowerCase());
}

function splitCategoryLabelSegments(categoryLabel: string): string[] {
  return categoryLabel
    .toLowerCase()
    .split(/[/|,()]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function categoryLabelMatchesSearchQuery(
  categoryLabel: string,
  query: string,
): boolean {
  const normalizedLabel = categoryLabel.toLowerCase();
  if (normalizedLabel.includes(query)) {
    return true;
  }

  return splitCategoryLabelSegments(categoryLabel).some((segment) => segment.includes(query));
}

function expandSearchTerms(
  query: string,
  keywordGroups: readonly PartnerSearchKeywordGroup[],
): string[] {
  const terms = new Set<string>([query]);
  const expansionGroups = buildPartnerSearchKeywordExpansionGroups(keywordGroups);

  for (const group of expansionGroups) {
    if (!group.includes(query)) {
      continue;
    }

    for (const term of group) {
      terms.add(term);
    }
  }

  return [...terms];
}

function partnerMatchesDirectQuery(partner: Partner, query: string): boolean {
  const texts = getPartnerSearchableTexts(partner);
  return texts.some((text) => text.includes(query));
}

function partnerMatchesExpandedTerms(
  partner: Partner,
  query: string,
  keywordGroups: readonly PartnerSearchKeywordGroup[],
): boolean {
  const terms = expandSearchTerms(query, keywordGroups).filter((term) => term !== query);
  if (terms.length === 0) {
    return false;
  }

  const texts = getPartnerContentSearchTexts(partner);
  return terms.some((term) => texts.some((text) => text.includes(term)));
}

function partnerMatchesCategorySearch(
  partner: Partner,
  query: string,
  partnerCategories: readonly string[],
): boolean {
  for (const categoryLabel of partnerCategories) {
    if (
      categoryLabelMatchesSearchQuery(categoryLabel, query) &&
      partnerMatchesCategory(partner.category, categoryLabel)
    ) {
      return true;
    }
  }

  return categoryLabelMatchesSearchQuery(partner.category, query);
}

export function partnerMatchesSearchQuery(
  partner: Partner,
  rawQuery: string,
  options?: {
    partnerCategories?: readonly string[];
    searchKeywordGroups?: readonly PartnerSearchKeywordGroup[];
    settings?: Partial<SiteSettings> | null;
  },
): boolean {
  const query = normalizePartnerSearchQuery(rawQuery);
  if (!query) {
    return true;
  }

  const keywordGroups =
    options?.searchKeywordGroups ??
    (options?.settings ? getPartnerSearchKeywordGroups(options.settings) : undefined) ??
    getPartnerSearchKeywordGroups(null);

  if (partnerMatchesDirectQuery(partner, query)) {
    return true;
  }

  if (partnerMatchesExpandedTerms(partner, query, keywordGroups)) {
    return true;
  }

  const partnerCategories = options?.partnerCategories ?? [];
  if (partnerCategories.length > 0) {
    return partnerMatchesCategorySearch(partner, query, partnerCategories);
  }

  return categoryLabelMatchesSearchQuery(partner.category, query);
}
