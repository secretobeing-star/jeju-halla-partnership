export const DEFAULT_PARTNERS_PER_PAGE = 8;
export const DEFAULT_PARTNERS_PER_PAGE_MOBILE = 6;
export const DEFAULT_PARTNERS_PER_PAGE_MINI = 6;
export const DEFAULT_PARTNERS_PER_PAGE_TABLET = 9;
export const DEFAULT_PARTNERS_PER_PAGE_WIDE = 12;
export const DEFAULT_PARTNERS_GRID_COLUMNS_MOBILE = 1;
export const DEFAULT_PARTNERS_GRID_COLUMNS_MINI = 1;
export const DEFAULT_PARTNERS_GRID_COLUMNS_TABLET = 3;
export const DEFAULT_ADMIN_PARTNERS_PER_PAGE = 10;
export const DEFAULT_ADMIN_POSTS_PER_PAGE = 10;
export const DEFAULT_BOARD_POSTS_PER_PAGE = 5;

export function normalizePartnersPerPage(
  value: number | null | undefined,
  fallback = DEFAULT_PARTNERS_PER_PAGE,
): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(50, Math.max(1, Math.round(value)));
}

export function normalizePartnersGridColumns(
  value: number | null | undefined,
  fallback = DEFAULT_PARTNERS_GRID_COLUMNS_TABLET,
): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(4, Math.max(1, Math.round(value)));
}

export function normalizeAdminPartnersPerPage(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_ADMIN_PARTNERS_PER_PAGE;
  }

  return Math.min(50, Math.max(1, Math.round(value)));
}

export function normalizeAdminPostsPerPage(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_ADMIN_POSTS_PER_PAGE;
  }

  return Math.min(50, Math.max(1, Math.round(value)));
}
export function normalizeBoardPostsPerPage(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_BOARD_POSTS_PER_PAGE;
  }

  return Math.min(50, Math.max(1, Math.round(value)));
}
