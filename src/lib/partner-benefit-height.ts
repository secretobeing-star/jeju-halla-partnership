export const DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MOBILE = 150;
export const DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MINI = 150;
export const DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_TABLET = 175;
export const DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_DESKTOP = 200;

const MIN_BENEFIT_HEIGHT = 80;
const MAX_BENEFIT_HEIGHT = 600;

export function normalizePartnerBenefitHeight(
  value: number | null | undefined,
  fallback: number,
) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(MAX_BENEFIT_HEIGHT, Math.max(MIN_BENEFIT_HEIGHT, Math.round(value)));
}
