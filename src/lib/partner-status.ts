import type { CSSProperties } from "react";
import { isPartnerBenefitPeriodEnded } from "@/lib/partner-date";
import { getPartnerTextStyle, DEFAULT_PARTNER_TEXT_STYLE } from "@/lib/partner-text-style";
import { Partner } from "@/lib/supabase";

export const PARTNER_ENDED_STATUS_TEXT = "제휴종료";
export const PARTNER_ENDED_STATUS_COLOR = "#6b7280";

export function isPartnerPartnershipEnded(
  partner: Pick<Partner, "benefit_end_date">,
  referenceDate: Date = new Date(),
): boolean {
  return isPartnerBenefitPeriodEnded(partner.benefit_end_date, referenceDate);
}

export function getPartnerStatusText(
  partner: Partner,
  referenceDate: Date = new Date(),
): string | null {
  if (isPartnerPartnershipEnded(partner, referenceDate)) {
    return PARTNER_ENDED_STATUS_TEXT;
  }

  const text = partner.benefit_status_text?.trim();
  return text ? text : null;
}

export function getPartnerStatusStyle(
  partner: Partner,
  referenceDate: Date = new Date(),
): CSSProperties {
  if (isPartnerPartnershipEnded(partner, referenceDate)) {
    return getPartnerTextStyle({
      color: PARTNER_ENDED_STATUS_COLOR,
      bold: true,
      italic: false,
      underline: false,
      strikethrough: false,
    });
  }

  return getPartnerTextStyle({
    color: partner.benefit_status_color ?? "",
    bold: partner.benefit_status_bold ?? false,
    italic: partner.benefit_status_italic ?? false,
    underline: partner.benefit_status_underline ?? false,
    strikethrough: partner.benefit_status_strikethrough ?? false,
  });
}

export function getPartnerBenefitStyle(partner: Partner): CSSProperties {
  return getPartnerTextStyle({
    color: partner.benefit_color?.trim() || DEFAULT_PARTNER_TEXT_STYLE.color,
    bold: partner.benefit_bold ?? false,
    italic: partner.benefit_italic ?? false,
    underline: partner.benefit_underline ?? false,
    strikethrough: partner.benefit_strikethrough ?? false,
  });
}
