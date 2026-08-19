import type { SiteSettings } from "@/lib/supabase";

export const DEFAULT_SITE_LOADING_MESSAGE = "로딩중";
export const DEFAULT_PARTNERS_LOADING_MESSAGE = "로딩중";

const SITE_LOADING_MESSAGE_CACHE_KEY = "site_loading_message";
const SITE_LOADING_IMAGE_CACHE_KEY = "site_loading_image_url";

export function getSiteLoadingMessage(settings?: Partial<SiteSettings> | null) {
  const configured = settings?.site_loading_message?.trim();
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(SITE_LOADING_MESSAGE_CACHE_KEY)?.trim();
      if (cached) {
        return cached;
      }
    } catch {
      // ignore storage errors
    }
  }

  return DEFAULT_SITE_LOADING_MESSAGE;
}

export function getPartnersLoadingMessage(settings?: Partial<SiteSettings> | null) {
  const configured = settings?.partners_loading_message?.trim();
  return configured || DEFAULT_PARTNERS_LOADING_MESSAGE;
}

export function getSiteLoadingImageUrl(settings?: Partial<SiteSettings> | null) {
  const configured = settings?.site_loading_image_url?.trim();
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(SITE_LOADING_IMAGE_CACHE_KEY)?.trim();
      if (cached) {
        return cached;
      }
    } catch {
      // ignore storage errors
    }
  }

  return null;
}

export function getPartnersLoadingImageUrl(settings?: Partial<SiteSettings> | null) {
  return settings?.partners_loading_image_url?.trim() || null;
}

export function cacheSiteLoadingMessage(message: string | null | undefined) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const trimmed = message?.trim();
    if (trimmed) {
      localStorage.setItem(SITE_LOADING_MESSAGE_CACHE_KEY, trimmed);
    } else {
      localStorage.removeItem(SITE_LOADING_MESSAGE_CACHE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function cacheSiteLoadingImageUrl(imageUrl: string | null | undefined) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const trimmed = imageUrl?.trim();
    if (trimmed) {
      localStorage.setItem(SITE_LOADING_IMAGE_CACHE_KEY, trimmed);
    } else {
      localStorage.removeItem(SITE_LOADING_IMAGE_CACHE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function cacheSiteLoadingSettings(settings?: Partial<SiteSettings> | null) {
  cacheSiteLoadingMessage(settings?.site_loading_message);
  cacheSiteLoadingImageUrl(settings?.site_loading_image_url);
}
