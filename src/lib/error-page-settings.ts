import { normalizeBoardColor } from "@/lib/board-definitions";

export type ErrorPageVariant = "404" | "500";

export type ErrorPageDisplaySettings = {
  enabled: boolean;
  logoUrl: string | null;
  bgColor: string;
  textColor: string;
  buttonBgColor: string;
  buttonTextColor: string;
  buttonLabel: string;
  title: string;
  message: string;
};

export const DEFAULT_ERROR_PAGE_BUTTON_LABEL = "메인으로 돌아가기";

export const DEFAULT_ERROR_PAGE_NOT_FOUND = {
  title: "페이지를 찾을 수 없습니다",
  message: "주소가 잘못되었거나 페이지가 이동·삭제되었을 수 있습니다.",
};

export const DEFAULT_ERROR_PAGE_SERVER_ERROR = {
  title: "일시적인 오류가 발생했습니다",
  message: "잠시 후 다시 시도해 주세요. 문제가 계속되면 메인으로 돌아가 주세요.",
};

export const DEFAULT_ERROR_PAGE_COLORS = {
  bgColor: "#F5F6F8",
  textColor: "#111827",
  buttonBgColor: "#059669",
  buttonTextColor: "#FFFFFF",
};

export type ErrorPageSettingsSource = {
  error_pages_enabled?: boolean | null;
  error_page_logo_url?: string | null;
  error_page_bg_color?: string | null;
  error_page_text_color?: string | null;
  error_page_button_bg_color?: string | null;
  error_page_button_text_color?: string | null;
  error_page_button_label?: string | null;
  error_page_not_found_title?: string | null;
  error_page_not_found_message?: string | null;
  error_page_server_error_title?: string | null;
  error_page_server_error_message?: string | null;
};

export function normalizeErrorPageText(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || fallback;
}

export function getErrorPageDisplaySettings(
  settings: ErrorPageSettingsSource | null | undefined,
  variant: ErrorPageVariant,
): ErrorPageDisplaySettings {
  const source = settings?.error_pages_enabled === false ? null : settings;
  const defaults = variant === "404" ? DEFAULT_ERROR_PAGE_NOT_FOUND : DEFAULT_ERROR_PAGE_SERVER_ERROR;

  return {
    enabled: settings?.error_pages_enabled ?? true,
    logoUrl: source?.error_page_logo_url?.trim() || null,
    bgColor: normalizeBoardColor(source?.error_page_bg_color) ?? DEFAULT_ERROR_PAGE_COLORS.bgColor,
    textColor: normalizeBoardColor(source?.error_page_text_color) ?? DEFAULT_ERROR_PAGE_COLORS.textColor,
    buttonBgColor:
      normalizeBoardColor(source?.error_page_button_bg_color) ??
      DEFAULT_ERROR_PAGE_COLORS.buttonBgColor,
    buttonTextColor:
      normalizeBoardColor(source?.error_page_button_text_color) ??
      DEFAULT_ERROR_PAGE_COLORS.buttonTextColor,
    buttonLabel: normalizeErrorPageText(
      source?.error_page_button_label,
      DEFAULT_ERROR_PAGE_BUTTON_LABEL,
    ),
    title: normalizeErrorPageText(
      variant === "404" ? source?.error_page_not_found_title : source?.error_page_server_error_title,
      defaults.title,
    ),
    message: normalizeErrorPageText(
      variant === "404"
        ? source?.error_page_not_found_message
        : source?.error_page_server_error_message,
      defaults.message,
    ),
  };
}

export const ERROR_PAGE_SETTINGS_SELECT = [
  "error_pages_enabled",
  "error_page_logo_url",
  "error_page_bg_color",
  "error_page_text_color",
  "error_page_button_bg_color",
  "error_page_button_text_color",
  "error_page_button_label",
  "error_page_not_found_title",
  "error_page_not_found_message",
  "error_page_server_error_title",
  "error_page_server_error_message",
].join(", ");
