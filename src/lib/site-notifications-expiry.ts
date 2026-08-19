import type { SupabaseClient } from "@supabase/supabase-js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse admin "N일 후 삭제" input. Empty / 0 / invalid → null (no auto-delete). */
export function parseAutoDeleteDays(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }

  return Math.min(Math.floor(n), 3650);
}

export function expiresAtFromAutoDeleteDays(
  publishedAt: string | Date,
  days: number | null,
): string | null {
  if (days === null) {
    return null;
  }

  const base = publishedAt instanceof Date ? publishedAt : new Date(publishedAt);
  if (Number.isNaN(base.getTime())) {
    return null;
  }

  return new Date(base.getTime() + days * MS_PER_DAY).toISOString();
}

/** Approximate remaining days for edit form (empty if no expiry). */
export function autoDeleteDaysFromExpiresAt(
  publishedAt: string | null | undefined,
  expiresAt: string | null | undefined,
): string {
  if (!publishedAt || !expiresAt) {
    return "";
  }

  const start = new Date(publishedAt).getTime();
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return "";
  }

  return String(Math.max(1, Math.round((end - start) / MS_PER_DAY)));
}

export async function deleteExpiredSiteNotifications(admin: SupabaseClient) {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("site_notifications")
    .delete()
    .not("expires_at", "is", null)
    .lte("expires_at", now)
    .select("id");

  if (error) {
    return { deleted: 0, error: error.message };
  }

  return { deleted: data?.length ?? 0, error: null as string | null };
}
