import { normalizeBoardColor } from "@/lib/board-definitions";

export const DEFAULT_PARTNER_BENEFIT_BOX_BG_COLOR = "#ecfdf5";
export const DEFAULT_PARTNER_BENEFIT_BOX_BORDER_COLOR = "#10b981";

export function normalizePartnerBenefitBoxColor(
  value: string | null | undefined,
  fallback: string,
) {
  return normalizeBoardColor(value) ?? fallback;
}

export function getPartnerBenefitBoxStyles(
  bgColor: string | null | undefined,
  borderColor: string | null | undefined,
) {
  return {
    backgroundColor: normalizePartnerBenefitBoxColor(
      bgColor,
      DEFAULT_PARTNER_BENEFIT_BOX_BG_COLOR,
    ),
    borderLeftColor: normalizePartnerBenefitBoxColor(
      borderColor,
      DEFAULT_PARTNER_BENEFIT_BOX_BORDER_COLOR,
    ),
  };
}
