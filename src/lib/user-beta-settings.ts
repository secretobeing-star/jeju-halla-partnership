import { normalizeMainBoardPosition, type MainBoardPosition } from "@/lib/main-board-position";
import {
  fontSizeToSiteScalePercent,
  normalizeMainFontSize,
  normalizeSiteScalePercent,
  type MainFontSize,
} from "@/lib/main-font-size";

export type UserBetaSettings = {
  dark_mode: boolean;
  mobile_pc_mode: boolean;
  font_size: MainFontSize;
  site_scale_percent: number;
  board_position: MainBoardPosition | null;
  page_background: boolean | null;
  site_nav_background: boolean | null;
  site_nav_floating_chips: boolean | null;
  show_category_region: boolean | null;
  show_main_map: boolean | null;
};

const STORAGE_KEY = "jeju-halla-user-beta-settings";
export const USER_BETA_SETTINGS_EVENT = "user-beta-settings-changed";

const DEFAULT_USER_BETA_SETTINGS: UserBetaSettings = {
  dark_mode: false,
  mobile_pc_mode: false,
  font_size: "medium",
  site_scale_percent: 100,
  board_position: null,
  page_background: null,
  site_nav_background: null,
  site_nav_floating_chips: null,
  show_category_region: null,
  show_main_map: null,
};

function parseUserBetaSettings(parsed: Partial<UserBetaSettings>): UserBetaSettings {
  const fontSize = normalizeMainFontSize(parsed.font_size);
  return {
    dark_mode: parsed.dark_mode ?? false,
    mobile_pc_mode: parsed.mobile_pc_mode ?? false,
    font_size: fontSize,
    site_scale_percent:
      parsed.site_scale_percent != null
        ? normalizeSiteScalePercent(parsed.site_scale_percent)
        : fontSizeToSiteScalePercent(fontSize),
    board_position:
      parsed.board_position === "below" || parsed.board_position === "above"
        ? parsed.board_position
        : null,
    page_background: Object.prototype.hasOwnProperty.call(parsed, "page_background")
      ? Boolean(parsed.page_background)
      : null,
    site_nav_background: Object.prototype.hasOwnProperty.call(parsed, "site_nav_background")
      ? Boolean(parsed.site_nav_background)
      : null,
    site_nav_floating_chips: Object.prototype.hasOwnProperty.call(
      parsed,
      "site_nav_floating_chips",
    )
      ? Boolean(parsed.site_nav_floating_chips)
      : null,
    show_category_region: Object.prototype.hasOwnProperty.call(parsed, "show_category_region")
      ? Boolean(parsed.show_category_region)
      : null,
    show_main_map: Object.prototype.hasOwnProperty.call(parsed, "show_main_map")
      ? Boolean(parsed.show_main_map)
      : null,
  };
}

export function loadUserBetaSettings(): UserBetaSettings {
  if (typeof window === "undefined") {
    return DEFAULT_USER_BETA_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_USER_BETA_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<UserBetaSettings>;
    return parseUserBetaSettings(parsed);
  } catch {
    return DEFAULT_USER_BETA_SETTINGS;
  }
}

export function saveUserBetaSettings(next: UserBetaSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(USER_BETA_SETTINGS_EVENT));
}

export function patchUserBetaSettings(patch: Partial<UserBetaSettings>) {
  saveUserBetaSettings({ ...loadUserBetaSettings(), ...patch });
}

export function applySiteScalePresetFromFontSize(fontSize: MainFontSize) {
  patchUserBetaSettings({
    font_size: normalizeMainFontSize(fontSize),
    site_scale_percent: fontSizeToSiteScalePercent(fontSize),
  });
}
