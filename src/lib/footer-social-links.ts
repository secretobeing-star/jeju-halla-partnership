import { normalizeOptionalLinkUrl } from "@/lib/footer-text";

export const FOOTER_SOCIAL_LINKS_MAX = 4;

export type FooterSocialLinkItem = {
  id: string;
  label: string;
  href: string;
  external: boolean;
  enabled: boolean;
  icon_url: string | null;
  hint: string | null;
  notify_message: string | null;
};

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

  if (trimmed.startsWith("#") || trimmed.startsWith("/") || trimmed.startsWith("mailto:")) {
    return trimmed;
  }

  return normalizeOptionalLinkUrl(trimmed) ?? trimmed;
}

export function createFooterSocialLinkItem(
  partial?: Partial<FooterSocialLinkItem>,
): FooterSocialLinkItem {
  const href = normalizeHref(partial?.href) || "#";
  const iconUrl = partial?.icon_url?.trim() ?? "";

  return {
    id: partial?.id ?? `footer-social-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: partial?.label?.trim() ?? "새 링크",
    href,
    external: inferExternalLink(href, partial?.external),
    enabled: partial?.enabled ?? true,
    icon_url: iconUrl || null,
    hint: partial?.hint?.trim() ? partial.hint.trim() : null,
    notify_message: partial?.notify_message?.trim() ? partial.notify_message.trim() : null,
  };
}

export function normalizeFooterSocialLinks(value: unknown): FooterSocialLinkItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: FooterSocialLinkItem[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Partial<FooterSocialLinkItem>;
    const href = normalizeHref(record.href);
    const label = record.label?.trim() ?? "";

    if (!label || !href) {
      continue;
    }

    items.push(
      createFooterSocialLinkItem({
        id: typeof record.id === "string" ? record.id : undefined,
        label,
        href,
        external: record.external,
        enabled: record.enabled,
        icon_url:
          typeof record.icon_url === "string" && record.icon_url.trim()
            ? record.icon_url.trim()
            : null,
        hint:
          typeof record.hint === "string" && record.hint.trim() ? record.hint.trim() : null,
        notify_message:
          typeof record.notify_message === "string" && record.notify_message.trim()
            ? record.notify_message.trim()
            : null,
      }),
    );
  }

  return items.slice(0, FOOTER_SOCIAL_LINKS_MAX);
}

export function getFooterSocialLinks(
  settings: { footer_social_links?: unknown } | null | undefined,
): FooterSocialLinkItem[] {
  return normalizeFooterSocialLinks(settings?.footer_social_links);
}

export function getActiveFooterSocialLinks(
  settings: { footer_social_links?: unknown } | null | undefined,
): FooterSocialLinkItem[] {
  return getFooterSocialLinks(settings).filter(
    (item) => item.enabled && item.href && item.icon_url,
  );
}

export function getFooterSocialHint(item: FooterSocialLinkItem): string {
  return item.hint?.trim() || item.label;
}

export function getFooterSocialNotifyMessage(
  item: FooterSocialLinkItem,
  notifyEnabled: boolean,
): string | null {
  if (!notifyEnabled) {
    return null;
  }

  const custom = item.notify_message?.trim();
  if (custom) {
    return custom;
  }

  return `${item.label} 링크로 이동합니다`;
}
