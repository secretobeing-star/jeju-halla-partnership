import { useEffect, useMemo, useState } from "react";
import { MOBILE_PC_LAYOUT_WIDTH } from "@/lib/mobile-viewport";
import { readLayoutViewportWidth, subscribeLayoutViewport } from "@/lib/layout-viewport";
import {
  DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_DESKTOP,
  DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MINI,
  DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MOBILE,
  DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_TABLET,
  normalizePartnerBenefitHeight,
} from "@/lib/partner-benefit-height";
import {
  DEFAULT_PARTNERS_GRID_COLUMNS_MINI,
  DEFAULT_PARTNERS_GRID_COLUMNS_MOBILE,
  DEFAULT_PARTNERS_GRID_COLUMNS_TABLET,
  DEFAULT_PARTNERS_PER_PAGE_MINI,
  DEFAULT_PARTNERS_PER_PAGE_MOBILE,
  DEFAULT_PARTNERS_PER_PAGE_TABLET,
  DEFAULT_PARTNERS_PER_PAGE_WIDE,
  normalizePartnersGridColumns,
  normalizePartnersPerPage,
} from "@/lib/pagination-settings";
import { SiteSettings } from "@/lib/supabase";

export const IPHONE_MINI_MAX_WIDTH = 375;
export const TABLET_VIEWPORT_MIN_WIDTH = 768;
export const TABLET_VIEWPORT_MAX_WIDTH = 1279;
/** iPad Pro·Galaxy Tab Ultra·Tab A+ 가로 등 (PWA 태블릿 구간 확장) */
export const TABLET_LG_VIEWPORT_MAX_WIDTH = 1439;
export const WIDE_VIEWPORT_MIN_WIDTH = 1920;

export type PartnerViewport = "mini" | "mobile" | "tablet" | "desktop" | "wide";

export function getPartnerViewport(width: number): PartnerViewport {
  if (width < TABLET_VIEWPORT_MIN_WIDTH) {
    return width <= IPHONE_MINI_MAX_WIDTH ? "mini" : "mobile";
  }

  if (width <= TABLET_LG_VIEWPORT_MAX_WIDTH) {
    return "tablet";
  }

  if (width >= WIDE_VIEWPORT_MIN_WIDTH) {
    return "wide";
  }

  return "desktop";
}

export type ResolvedPartnerListLayout = {
  viewport: PartnerViewport;
  partnersPerPage: number;
  gridColumns: number | null;
  benefitMinHeightMobile: number;
  benefitMinHeightDesktop: number;
};

export function resolvePartnerListLayout(
  settings: SiteSettings,
  viewport: PartnerViewport,
): ResolvedPartnerListLayout {
  const miniSettingsEnabled = settings.partners_mini_settings_enabled ?? false;
  const mobileSettingsEnabled = settings.partners_mobile_settings_enabled ?? false;
  const tabletSettingsEnabled = settings.partners_tablet_settings_enabled ?? false;
  const wideSettingsEnabled = settings.partners_wide_settings_enabled ?? false;
  const useMiniSettings = viewport === "mini" && miniSettingsEnabled;
  const useMobileSettings =
    (viewport === "mobile" || (viewport === "mini" && !miniSettingsEnabled)) &&
    mobileSettingsEnabled;
  const useTabletSettings = viewport === "tablet";
  const useWideSettings = viewport === "wide" && wideSettingsEnabled;

  let partnersPerPage = normalizePartnersPerPage(settings.partners_per_page);
  if (useWideSettings) {
    partnersPerPage = normalizePartnersPerPage(
      settings.partners_per_page_wide ?? settings.partners_per_page,
      DEFAULT_PARTNERS_PER_PAGE_WIDE,
    );
  } else if (useTabletSettings) {
    partnersPerPage = normalizePartnersPerPage(
      settings.partners_per_page_tablet ?? settings.partners_per_page,
      DEFAULT_PARTNERS_PER_PAGE_TABLET,
    );
  } else if (useMiniSettings) {
    partnersPerPage = normalizePartnersPerPage(
      settings.partners_per_page_mini ?? settings.partners_per_page,
      DEFAULT_PARTNERS_PER_PAGE_MINI,
    );
  } else if (useMobileSettings) {
    partnersPerPage = normalizePartnersPerPage(
      settings.partners_per_page_mobile ?? settings.partners_per_page,
      DEFAULT_PARTNERS_PER_PAGE_MOBILE,
    );
  }

  let gridColumns: number | null = null;
  if (useMiniSettings) {
    gridColumns = normalizePartnersGridColumns(
      settings.partners_grid_columns_mini,
      DEFAULT_PARTNERS_GRID_COLUMNS_MINI,
    );
  } else if (useMobileSettings) {
    gridColumns = normalizePartnersGridColumns(
      settings.partners_grid_columns_mobile,
      DEFAULT_PARTNERS_GRID_COLUMNS_MOBILE,
    );
  } else if (useTabletSettings) {
    gridColumns = normalizePartnersGridColumns(
      settings.partners_grid_columns_tablet,
      DEFAULT_PARTNERS_GRID_COLUMNS_TABLET,
    );
  }

  const benefitMinHeightMobile = useTabletSettings
    ? normalizePartnerBenefitHeight(
        settings.partner_benefit_min_height_tablet,
        DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_TABLET,
      )
    : useMiniSettings
      ? normalizePartnerBenefitHeight(
          settings.partner_benefit_min_height_mini,
          DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MINI,
        )
      : normalizePartnerBenefitHeight(
          settings.partner_benefit_min_height_mobile,
          DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MOBILE,
        );

  const benefitMinHeightDesktop = useTabletSettings
    ? normalizePartnerBenefitHeight(
        settings.partner_benefit_min_height_tablet,
        DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_TABLET,
      )
    : normalizePartnerBenefitHeight(
        settings.partner_benefit_min_height_desktop,
        DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_DESKTOP,
      );

  return {
    viewport,
    partnersPerPage,
    gridColumns,
    benefitMinHeightMobile,
    benefitMinHeightDesktop,
  };
}

export function usePartnerListLayout(settings: SiteSettings) {
  const [viewport, setViewport] = useState<PartnerViewport>("mobile");

  useEffect(() => {
    const update = () => {
      const mobilePcMode = document.documentElement.classList.contains("mobile-pc-mode");
      const width = mobilePcMode ? MOBILE_PC_LAYOUT_WIDTH : readLayoutViewportWidth();
      let nextViewport = getPartnerViewport(width);

      if (
        !mobilePcMode &&
        width >= TABLET_VIEWPORT_MIN_WIDTH &&
        width <= TABLET_LG_VIEWPORT_MAX_WIDTH
      ) {
        nextViewport = "tablet";
      }

      setViewport((prev) => (prev === nextViewport ? prev : nextViewport));
    };

    update();

    const classObserver = new MutationObserver(update);
    classObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const unsubscribeLayout = subscribeLayoutViewport(update);

    return () => {
      classObserver.disconnect();
      unsubscribeLayout();
    };
  }, []);

  return useMemo(
    () => resolvePartnerListLayout(settings, viewport),
    [settings, viewport],
  );
}
