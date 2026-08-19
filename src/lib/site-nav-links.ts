import { normalizeOptionalLinkUrl } from "@/lib/footer-text";

export type SiteNavLinkItem = {
  id: string;
  label: string;
  href: string;
  external: boolean;
  enabled: boolean;
  icon_url: string | null;
  image_url: string | null;
  hint: string | null;
  notify_message: string | null;
};

export const DEFAULT_SITE_NAV_SEARCH_PLACEHOLDER = "업체명, 주소, 혜택으로 검색";

/** 상단 메뉴에서 게시판을 팝업으로 열 때 사용하는 링크 */
export const BOARD_POPUP_NAV_HREF = "#board-popup";
/** 선물함 모달 */
export const GIFT_INBOX_NAV_HREF = "#gift-inbox";
/** 학생증 코스튬 보관함 모달 */
export const FRAME_INVENTORY_NAV_HREF = "#frame-inventory";

export function isBoardPopupNavHref(href: string) {
  const normalized = href.trim().toLowerCase();
  return normalized === BOARD_POPUP_NAV_HREF || normalized === "#board-section-anchor";
}

export function isGiftInboxNavHref(href: string) {
  return href.trim().toLowerCase() === GIFT_INBOX_NAV_HREF;
}

export function isFrameInventoryNavHref(href: string) {
  return href.trim().toLowerCase() === FRAME_INVENTORY_NAV_HREF;
}

/** 상단 메뉴 클릭 시 페이지 이동 대신 앱 액션(모달)을 여는 링크 */
export function isSiteNavActionHref(href: string) {
  return (
    isBoardPopupNavHref(href) ||
    isGiftInboxNavHref(href) ||
    isFrameInventoryNavHref(href)
  );
}

export const DEFAULT_SITE_NAV_LINKS: SiteNavLinkItem[] = [
  {
    id: "nav-halla-home",
    label: "한라대학교",
    href: "https://www.halla.ac.kr",
    external: true,
    enabled: true,
    icon_url: null,
    image_url: null,
    hint: null,
    notify_message: null,
  },
  {
    id: "nav-halla-portal",
    label: "학사포털",
    href: "https://hportal.halla.ac.kr",
    external: true,
    enabled: true,
    icon_url: null,
    image_url: null,
    hint: null,
    notify_message: null,
  },
  {
    id: "nav-partners",
    label: "제휴 리스트",
    href: "#partner-list-anchor",
    external: false,
    enabled: true,
    icon_url: null,
    image_url: null,
    hint: null,
    notify_message: null,
  },
  {
    id: "nav-board",
    label: "게시판",
    href: BOARD_POPUP_NAV_HREF,
    external: false,
    enabled: true,
    icon_url: null,
    image_url: null,
    hint: null,
    notify_message: null,
  },
  {
    id: "nav-gift-inbox",
    label: "선물함",
    href: GIFT_INBOX_NAV_HREF,
    external: false,
    enabled: true,
    icon_url: null,
    image_url: null,
    hint: null,
    notify_message: null,
  },
  {
    id: "nav-frame-inventory",
    label: "보관함",
    href: FRAME_INVENTORY_NAV_HREF,
    external: false,
    enabled: true,
    icon_url: null,
    image_url: null,
    hint: null,
    notify_message: null,
  },
];

function inferExternalLink(href: string, external?: boolean) {
  if (typeof external === "boolean") {
    return external;
  }

  return href.startsWith("http://") || href.startsWith("https://");
}

function normalizeHref(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("#") || trimmed.startsWith("/")) {
    return trimmed;
  }

  return normalizeOptionalLinkUrl(trimmed) ?? trimmed;
}

export function createSiteNavLinkItem(partial?: Partial<SiteNavLinkItem>): SiteNavLinkItem {
  const href = normalizeHref(partial?.href) || "#";
  const iconUrl = partial?.icon_url?.trim() ?? "";
  const imageUrl = partial?.image_url?.trim() ?? "";
  return {
    id: partial?.id ?? `nav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: partial?.label?.trim() ?? "새 메뉴",
    href,
    external: inferExternalLink(href, partial?.external),
    enabled: partial?.enabled ?? true,
    icon_url: iconUrl || null,
    image_url: imageUrl || null,
    hint: partial?.hint?.trim() ? partial.hint.trim() : null,
    notify_message: partial?.notify_message?.trim() ? partial.notify_message.trim() : null,
  };
}

export function normalizeSiteNavLinks(value: unknown): SiteNavLinkItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: SiteNavLinkItem[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Partial<SiteNavLinkItem>;
    const href = normalizeHref(record.href);
    const label = record.label?.trim() ?? "";

    if (!label || !href) {
      continue;
    }

    items.push(
      createSiteNavLinkItem({
        id: typeof record.id === "string" ? record.id : undefined,
        label,
        href,
        external: record.external,
        enabled: record.enabled,
        icon_url:
          typeof record.icon_url === "string" && record.icon_url.trim()
            ? record.icon_url.trim()
            : null,
        image_url:
          typeof record.image_url === "string" && record.image_url.trim()
            ? record.image_url.trim()
            : null,
        hint: typeof record.hint === "string" && record.hint.trim() ? record.hint.trim() : null,
        notify_message:
          typeof record.notify_message === "string" && record.notify_message.trim()
            ? record.notify_message.trim()
            : null,
      }),
    );
  }

  return items.slice(0, 12);
}

export function getSiteNavHint(item: SiteNavLinkItem): string {
  return item.hint?.trim() || item.label;
}

export function getSiteNavNotifyMessage(
  item: SiteNavLinkItem,
  notifyEnabled: boolean,
): string | null {
  if (!notifyEnabled) {
    return null;
  }

  const custom = item.notify_message?.trim();
  if (custom) {
    return custom;
  }

  if (isBoardPopupNavHref(item.href)) {
    return `${item.label}을(를) 엽니다`;
  }

  if (isGiftInboxNavHref(item.href) || isFrameInventoryNavHref(item.href)) {
    return `${item.label}을(를) 엽니다`;
  }

  if (item.href.startsWith("#")) {
    return `${item.label}(으)로 이동합니다`;
  }

  return `${item.label} 링크로 이동합니다`;
}

type SiteNavSettingsSource = {
  site_nav_links?: unknown;
  site_nav_dropdown_links?: unknown;
  site_nav_dropdown_enabled?: boolean | null;
  site_nav_enabled?: boolean | null;
  site_nav_search_placeholder?: string | null;
};

export function getSiteNavDropdownLinks(
  settings: SiteNavSettingsSource | null | undefined,
): SiteNavLinkItem[] {
  return normalizeSiteNavLinks(settings?.site_nav_dropdown_links);
}

export function getActiveSiteNavDropdownLinks(
  settings: SiteNavSettingsSource | null | undefined,
): SiteNavLinkItem[] {
  if (settings?.site_nav_dropdown_enabled === false) {
    return [];
  }

  const dropdownLinks = getSiteNavDropdownLinks(settings).filter((item) => item.enabled);
  if (dropdownLinks.length > 0) {
    return dropdownLinks;
  }

  return getActiveSiteNavLinks(settings);
}

export function getSiteNavLinks(settings: SiteNavSettingsSource | null | undefined): SiteNavLinkItem[] {
  const normalized = normalizeSiteNavLinks(settings?.site_nav_links);
  if (normalized.length > 0) {
    return normalized;
  }

  return DEFAULT_SITE_NAV_LINKS.map((item) => ({ ...item }));
}

export function getActiveSiteNavLinks(settings: SiteNavSettingsSource | null | undefined): SiteNavLinkItem[] {
  if (settings?.site_nav_enabled === false) {
    return [];
  }

  return getSiteNavLinks(settings).filter((item) => item.enabled);
}

export function getSiteNavSearchPlaceholder(settings: SiteNavSettingsSource | null | undefined) {
  return settings?.site_nav_search_placeholder?.trim() || "";
}

import { DEFAULT_SITE_SETTINGS } from "@/lib/default-site-settings";

export function resolveSiteNavDisplayTitle(headerTitle?: string | null): string {
  const trimmed = headerTitle?.trim();
  if (trimmed) {
    return trimmed;
  }

  return DEFAULT_SITE_SETTINGS.header_title;
}

export function resolveSiteNavBrandTitle(options: {
  brandTitle?: string | null;
  brandTitleHidden?: boolean;
  headerTitle?: string | null;
}) {
  if (options.brandTitleHidden) {
    return "";
  }

  const brandTitle = options.brandTitle?.trim();
  if (brandTitle) {
    return brandTitle;
  }

  return resolveSiteNavDisplayTitle(options.headerTitle);
}

export function resolveSiteNavBrandIconUrl(options: {
  brandIconUrl?: string | null;
  faviconUrl?: string | null;
}) {
  const brandIconUrl = options.brandIconUrl?.trim();
  if (brandIconUrl) {
    return brandIconUrl;
  }

  return options.faviconUrl?.trim() || null;
}

export function resolveSiteNavBrandLinkUrl(options: {
  brandLinkUrl?: string | null;
  titleLinkUrl?: string | null;
}) {
  const brandLinkUrl = options.brandLinkUrl?.trim();
  if (brandLinkUrl) {
    return brandLinkUrl;
  }

  return options.titleLinkUrl?.trim() || null;
}

/** @deprecated use SiteNavLinkItem */
export type SiteNavLink = Pick<SiteNavLinkItem, "label" | "href"> & { external?: boolean };

/** @deprecated use DEFAULT_SITE_NAV_LINKS */
export const SITE_NAV_LINKS = DEFAULT_SITE_NAV_LINKS.map(({ label, href, external }) => ({
  label,
  href,
  external,
}));
