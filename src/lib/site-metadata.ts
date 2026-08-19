import type { Metadata } from "next";
import {
  resolveLinkPreviewDescription,
  resolveLinkPreviewImageUrl,
  resolveLinkPreviewTitle,
} from "@/lib/link-preview";
import type { PublicSiteMetadataSettings } from "@/lib/site-settings-server";
import { normalizeMainDomain } from "@/lib/site-domain";

const DEFAULT_PUBLIC_ORIGIN = "https://chu.gg";

function resolveMetadataBase(mainDomain: string | null | undefined): URL {
  const fromSettings = normalizeMainDomain(mainDomain);
  if (fromSettings) {
    return new URL(fromSettings);
  }

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionUrl) {
    return new URL(`https://${productionUrl}`);
  }

  return new URL(DEFAULT_PUBLIC_ORIGIN);
}

function resolveFallbackOgImageUrl(metadataBase: URL) {
  return new URL("/api/og-image", metadataBase).toString();
}
export function resolvePublicSiteTitle(settings: PublicSiteMetadataSettings | null | undefined) {
  return resolveLinkPreviewTitle(settings);
}

export function resolvePublicSiteDescription(
  settings: PublicSiteMetadataSettings | null | undefined,
) {
  return resolveLinkPreviewDescription(settings);
}
export function buildSiteMetadata(
  settings: PublicSiteMetadataSettings | null | undefined,
  pathname = "/",
): Metadata {
  const metadataBase = resolveMetadataBase(settings?.main_domain);
  const title = resolvePublicSiteTitle(settings);
  const description = resolvePublicSiteDescription(settings);
  const bannerImage = resolveLinkPreviewImageUrl(settings);
  const pageUrl =
    pathname === "/" ? `${metadataBase.origin}/` : `${metadataBase.origin}${pathname}`;
  const fallbackOgImageUrl = resolveFallbackOgImageUrl(metadataBase);

  const ogImages = bannerImage
    ? [
        {
          url: bannerImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ]
    : [
        {
          url: fallbackOgImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ];
  const faviconUrl = settings?.site_favicon_url?.trim() || null;
  const icons = faviconUrl
    ? {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl,
      }
    : undefined;

  return {
    metadataBase,
    title,
    description,
    icons,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url: pageUrl,
      siteName: title,
      title,
      description,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: bannerImage ? [bannerImage] : [fallbackOgImageUrl],
    },
  };
}
