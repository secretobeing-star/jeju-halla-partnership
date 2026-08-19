import { normalizeOptionalLinkUrl } from "@/lib/footer-text";

export type SiteNoticeItem = {
  id: string;
  tag: string | null;
  text: string;
  link_url: string | null;
  enabled: boolean;
};

export const DEFAULT_SITE_NOTICE_BADGE_LABEL = "공지";

export const DEFAULT_NOTICE_CAROUSEL_AUTO_ENABLED = false;
export const DEFAULT_NOTICE_CAROUSEL_AUTO_INTERVAL_SECONDS = 5;
export const MIN_NOTICE_CAROUSEL_AUTO_INTERVAL_SECONDS = 3;
export const MAX_NOTICE_CAROUSEL_AUTO_INTERVAL_SECONDS = 30;

export function normalizeSiteNoticeBadgeLabel(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return DEFAULT_SITE_NOTICE_BADGE_LABEL;
  }

  return trimmed.slice(0, 20);
}

export function resolveSiteNoticeItemBadgeLabel(
  item: SiteNoticeItem,
  defaultLabel?: string | null,
): string {
  if (item.tag?.trim()) {
    return normalizeSiteNoticeBadgeLabel(item.tag);
  }

  return normalizeSiteNoticeBadgeLabel(defaultLabel);
}

export function normalizeNoticeCarouselAutoInterval(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_NOTICE_CAROUSEL_AUTO_INTERVAL_SECONDS;
  }

  return Math.min(
    MAX_NOTICE_CAROUSEL_AUTO_INTERVAL_SECONDS,
    Math.max(MIN_NOTICE_CAROUSEL_AUTO_INTERVAL_SECONDS, Math.round(parsed)),
  );
}

function normalizeSiteNoticeItemTag(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 20);
}

export function createSiteNoticeItem(partial?: Partial<SiteNoticeItem>): SiteNoticeItem {
  return {
    id: partial?.id ?? `notice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tag: normalizeSiteNoticeItemTag(partial?.tag),
    text: partial?.text?.trim() ?? "",
    link_url: normalizeOptionalLinkUrl(partial?.link_url) ?? null,
    enabled: partial?.enabled ?? true,
  };
}

export function normalizeSiteNoticeItems(value: unknown): SiteNoticeItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: SiteNoticeItem[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text.trim() : "";
    if (!text) {
      continue;
    }

    items.push(
      createSiteNoticeItem({
        id: typeof record.id === "string" ? record.id : undefined,
        tag: typeof record.tag === "string" ? normalizeSiteNoticeItemTag(record.tag) : null,
        text,
        link_url: typeof record.link_url === "string" ? record.link_url : null,
        enabled: record.enabled !== false,
      }),
    );
  }

  return items;
}

type SiteNoticeSettingsSource = {
  notice_items?: unknown;
  notice_text?: string | null;
  notice_text_link_url?: string | null;
};

export function getSiteNoticeItems(settings: SiteNoticeSettingsSource | null | undefined): SiteNoticeItem[] {
  const normalized = normalizeSiteNoticeItems(settings?.notice_items);
  if (normalized.length > 0) {
    return normalized;
  }

  const legacyText = settings?.notice_text?.trim() ?? "";
  if (!legacyText) {
    return [];
  }

  return [
    createSiteNoticeItem({
      id: "notice-legacy",
      text: legacyText,
      link_url: settings?.notice_text_link_url ?? null,
    }),
  ];
}

export function getActiveSiteNoticeItems(
  settings: SiteNoticeSettingsSource | null | undefined,
): SiteNoticeItem[] {
  return getSiteNoticeItems(settings).filter((item) => item.enabled);
}
