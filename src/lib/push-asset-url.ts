import { normalizeMainDomain } from "@/lib/site-domain";

const DEFAULT_PUBLIC_ORIGIN = "https://chu.gg";

export function resolvePushSiteOrigin(mainDomain: string | null | undefined): string {
  const fromSettings = normalizeMainDomain(mainDomain);
  if (fromSettings) {
    return fromSettings.replace(/\/$/, "");
  }

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionUrl) {
    return `https://${productionUrl}`;
  }

  return DEFAULT_PUBLIC_ORIGIN;
}

export function resolvePushAssetUrl(
  url: string | null | undefined,
  siteOrigin: string,
): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) {
    return undefined;
  }

  // 푸시 아이콘으로 쓰기 어려운 포맷은 제외 (백지/깨짐 원인)
  const lower = trimmed.toLowerCase();
  if (
    lower.endsWith(".ico") ||
    lower.endsWith(".svg") ||
    lower.includes("favicon.ico") ||
    lower.startsWith("data:image/svg")
  ) {
    return undefined;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return `${siteOrigin}${trimmed}`;
  }

  return `${siteOrigin}/${trimmed}`;
}

export type PushVisualDefaults = {
  icon?: string;
  badge?: string;
  image?: string;
};

export function resolvePushVisuals(options: {
  siteOrigin: string;
  siteFaviconUrl?: string | null;
  sitePushIconUrl?: string | null;
  sitePwaIconUrl?: string | null;
  notificationIconUrl?: string | null;
  notificationImageUrl?: string | null;
}): PushVisualDefaults {
  const image = resolvePushAssetUrl(options.notificationImageUrl, options.siteOrigin);

  const iconCandidates = [
    options.notificationIconUrl,
    options.sitePushIconUrl,
    options.sitePwaIconUrl,
    options.siteFaviconUrl,
  ];

  let icon: string | undefined;
  for (const candidate of iconCandidates) {
    icon = resolvePushAssetUrl(candidate, options.siteOrigin);
    if (icon) {
      break;
    }
  }

  // 알림 큰 이미지는 아이콘 대체로 쓰지 않음(백지/잘림 방지). 아이콘이 있을 때만 badge 설정.
  return {
    ...(icon ? { icon, badge: icon } : {}),
    ...(image ? { image } : {}),
  };
}
