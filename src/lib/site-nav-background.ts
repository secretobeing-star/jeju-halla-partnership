export function getEffectiveSiteNavBackground(
  userPreference: boolean | null | undefined,
  siteDefaultEnabled: boolean | null | undefined,
): boolean {
  if (userPreference != null) {
    return userPreference;
  }

  return siteDefaultEnabled ?? false;
}

export function hasConfiguredSiteNavBackground(imageUrl: string | null | undefined) {
  return Boolean(imageUrl?.trim());
}

export const DEFAULT_SITE_NAV_BACKGROUND_DARK_OVERLAY_OPACITY = 82;

export function normalizeSiteNavBackgroundDarkOverlayOpacity(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SITE_NAV_BACKGROUND_DARK_OVERLAY_OPACITY;
  }

  return Math.min(100, Math.max(0, Math.round(parsed)));
}

export function resolveSiteNavBackgroundDarkOverlayOpacity(value: unknown) {
  return normalizeSiteNavBackgroundDarkOverlayOpacity(value) / 100;
}

export function resolveSiteNavBackgroundDarkOverlayOpacityTop(value: unknown) {
  const base = normalizeSiteNavBackgroundDarkOverlayOpacity(value);
  return Math.min(100, base + 6) / 100;
}

export function buildSiteNavBackgroundDarkOverlayStyle(opacityPercent: unknown): Record<string, string> {
  const opacity = resolveSiteNavBackgroundDarkOverlayOpacity(opacityPercent);
  const opacityTop = resolveSiteNavBackgroundDarkOverlayOpacityTop(opacityPercent);

  return {
    "--site-nav-dark-overlay-opacity": String(opacity),
    "--site-nav-dark-overlay-opacity-top": String(opacityTop),
  };
}

export function getEffectiveSiteNavBackgroundDarkEnabled(
  navBackgroundActive: boolean,
  adminDarkEnabled: boolean,
) {
  if (!navBackgroundActive) {
    return false;
  }

  return adminDarkEnabled;
}
