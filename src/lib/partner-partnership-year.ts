import type { Partner } from "@/lib/supabase";

export type PartnerYearFilterValue = number | "전체";

export function resolvePartnerPartnershipYear(partner: Partner): number {
  if (partner.partnership_year != null && Number.isFinite(partner.partnership_year)) {
    return partner.partnership_year;
  }

  if (partner.benefit_start_date) {
    const year = new Date(partner.benefit_start_date).getFullYear();
    if (Number.isFinite(year)) {
      return year;
    }
  }

  if (partner.created_at) {
    const year = new Date(partner.created_at).getFullYear();
    if (Number.isFinite(year)) {
      return year;
    }
  }

  return new Date().getFullYear();
}

export function getPartnerYearOptions(partners: Partner[]): number[] {
  const years = new Set<number>();

  for (const partner of partners) {
    years.add(resolvePartnerPartnershipYear(partner));
  }

  return Array.from(years).sort((a, b) => b - a);
}

export function partnerMatchesYearFilter(
  partner: Partner,
  selectedYear: PartnerYearFilterValue,
): boolean {
  if (selectedYear === "전체") {
    return true;
  }

  return resolvePartnerPartnershipYear(partner) === selectedYear;
}

export function getDefaultPartnerYearFilter(partners: Partner[]): PartnerYearFilterValue {
  const years = getPartnerYearOptions(partners);
  return years[0] ?? "전체";
}

export function normalizePartnerPartnershipYearInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const year = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return null;
  }

  return year;
}

export function formatPartnerYearLabel(year: number): string {
  return `${year}년`;
}
