import type { CSSProperties } from "react";
import type { SiteSettings } from "@/lib/supabase";

export const DEFAULT_BOARD_LIST_FONT_SIZE_COMPACT = 10;
export const DEFAULT_BOARD_LIST_FONT_SIZE_DESKTOP = 11;
export const DEFAULT_BOARD_POST_DETAIL_FONT_SIZE = 16;

const MIN_LIST_FONT_SIZE = 8;
const MAX_LIST_FONT_SIZE = 18;
const MIN_DETAIL_FONT_SIZE = 12;
const MAX_DETAIL_FONT_SIZE = 24;

export function normalizeBoardListFontSize(
  value: number | undefined,
  fallback: number,
  min = MIN_LIST_FONT_SIZE,
  max = MAX_LIST_FONT_SIZE,
) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

export function normalizeBoardPostDetailFontSize(value: number | undefined) {
  return normalizeBoardListFontSize(
    value,
    DEFAULT_BOARD_POST_DETAIL_FONT_SIZE,
    MIN_DETAIL_FONT_SIZE,
    MAX_DETAIL_FONT_SIZE,
  );
}

export function getBoardListFontSizes(settings?: Partial<SiteSettings> | null) {
  const compact = normalizeBoardListFontSize(
    settings?.board_list_font_size_compact,
    DEFAULT_BOARD_LIST_FONT_SIZE_COMPACT,
  );
  const desktop = normalizeBoardListFontSize(
    settings?.board_list_font_size_desktop,
    DEFAULT_BOARD_LIST_FONT_SIZE_DESKTOP,
  );
  const detail = normalizeBoardPostDetailFontSize(settings?.board_post_detail_font_size);

  return { compact, desktop, detail };
}

export function getBoardListFontSizeStyle(
  settings?: Partial<SiteSettings> | null,
): CSSProperties {
  const { compact, desktop, detail } = getBoardListFontSizes(settings);

  return {
    ["--board-list-font-size-compact" as string]: `calc(${compact}px * var(--main-font-scale, 1))`,
    ["--board-list-font-size-desktop" as string]: `calc(${desktop}px * var(--main-font-scale, 1))`,
    ["--board-post-detail-font-size" as string]: `calc(${detail}px * var(--main-font-scale, 1))`,
  };
}
