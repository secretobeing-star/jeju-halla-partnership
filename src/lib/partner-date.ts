export function formatPartnerDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const format = (value: string) => value.replace(/-/g, ".");

  if (start && end) {
    return `${format(start)} ~ ${format(end)}`;
  }
  if (start) {
    return `${format(start)} ~`;
  }
  if (end) {
    return `~ ${format(end)}`;
  }

  return null;
}

const KST_TIME_ZONE = "Asia/Seoul";

export function normalizePartnerDateOnly(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export function getKstDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isPartnerBenefitPeriodEnded(
  benefitEndDate: string | null | undefined,
  referenceDate: Date = new Date(),
): boolean {
  const endDate = normalizePartnerDateOnly(benefitEndDate);
  if (!endDate) {
    return false;
  }

  return endDate < getKstDateString(referenceDate);
}

function parsePartnerDateValue(value: string): number {
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    return new Date(year, month, day).getTime();
  }

  return new Date(value).getTime();
}

export function getPartnerSortTimestamp(partner: {
  created_at?: string | null;
  benefit_start_date?: string | null;
  benefit_end_date?: string | null;
}): number {
  const benefitDate = partner.benefit_start_date || partner.benefit_end_date;
  if (benefitDate) {
    return parsePartnerDateValue(benefitDate);
  }

  if (partner.created_at) {
    return new Date(partner.created_at).getTime();
  }

  return 0;
}
