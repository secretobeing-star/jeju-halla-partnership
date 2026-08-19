export type MainFontSize = "small" | "medium" | "large";

export const MAIN_FONT_SIZE_OPTIONS: { value: MainFontSize; label: string }[] = [
  { value: "small", label: "축소" },
  { value: "medium", label: "기본" },
  { value: "large", label: "확대" },
];

export const MAIN_FONT_SIZE_CLASSES: Record<MainFontSize, string> = {
  small: "main-font-size-small",
  medium: "main-font-size-medium",
  large: "main-font-size-large",
};

export const DEFAULT_SITE_SCALE_PERCENT = 100;
export const SITE_SCALE_MIN_PERCENT = 75;
export const SITE_SCALE_MAX_PERCENT = 200;
export const SITE_SCALE_STEP_PERCENT = 5;

export const MAIN_FONT_SIZE_PRESETS: Record<MainFontSize, number> = {
  small: 87.5,
  medium: 100,
  large: 112.5,
};

export function normalizeMainFontSize(value: unknown): MainFontSize {
  return value === "small" || value === "large" ? value : "medium";
}

export function normalizeSiteScalePercent(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_SITE_SCALE_PERCENT;
  }

  const clamped = Math.min(
    SITE_SCALE_MAX_PERCENT,
    Math.max(SITE_SCALE_MIN_PERCENT, numeric),
  );
  const stepped =
    Math.round(clamped / SITE_SCALE_STEP_PERCENT) * SITE_SCALE_STEP_PERCENT;

  return Math.min(SITE_SCALE_MAX_PERCENT, Math.max(SITE_SCALE_MIN_PERCENT, stepped));
}

export function siteScalePercentToFontSize(percent: number): MainFontSize {
  const normalized = normalizeSiteScalePercent(percent);
  if (normalized <= MAIN_FONT_SIZE_PRESETS.small) {
    return "small";
  }
  if (normalized >= MAIN_FONT_SIZE_PRESETS.large) {
    return "large";
  }
  return "medium";
}

export function fontSizeToSiteScalePercent(fontSize: MainFontSize): number {
  return MAIN_FONT_SIZE_PRESETS[normalizeMainFontSize(fontSize)];
}

export function stepSiteScalePercent(current: number, direction: 1 | -1): number {
  return normalizeSiteScalePercent(current + direction * SITE_SCALE_STEP_PERCENT);
}

export function getSiteScaleMultiplier(percent: number, enabled: boolean): number {
  if (!enabled) {
    return 1;
  }

  return normalizeSiteScalePercent(percent) / 100;
}

/** @deprecated Use getSiteScaleMultiplier with site_scale_percent */
export function getMainFontSizeScale(
  fontSize: MainFontSize,
  enabled: boolean,
): number {
  return getSiteScaleMultiplier(fontSizeToSiteScalePercent(fontSize), enabled);
}

export function formatSiteScaleLabel(percent: number): string {
  return `${normalizeSiteScalePercent(percent)}%`;
}
