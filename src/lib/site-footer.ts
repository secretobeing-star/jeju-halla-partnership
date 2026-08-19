import { getActiveFooterSocialLinks } from "@/lib/footer-social-links";
import { normalizeOptionalLinkUrl } from "@/lib/footer-text";
import type { SiteSettings } from "@/lib/supabase";

export type SiteFooterSettings = Pick<
  SiteSettings,
  | "footer_text"
  | "footer_link_label"
  | "footer_link_url"
  | "footer_privacy_policy_url"
  | "footer_terms_url"
  | "footer_business_line1"
  | "footer_business_line2"
  | "footer_copyright"
  | "footer_image_url"
  | "footer_image2_url"
  | "footer_social_links"
>;

export type SiteFooterLink = {
  id: string;
  label: string;
  url: string;
};

export type SiteFooterDisplay = {
  imageUrls: string[];
  businessLine1: string;
  businessLine2: string;
  copyright: string;
  text: string;
  links: SiteFooterLink[];
  socialLinks: ReturnType<typeof getActiveFooterSocialLinks>;
  legacyWholeTextLink: boolean;
  legacyLinkUrl: string | null;
  hasContent: boolean;
};

function getSiteFooterImageUrls(
  settings: SiteFooterSettings | null | undefined,
): string[] {
  const urls: string[] = [];

  const image1 = settings?.footer_image_url?.trim();
  if (image1) {
    urls.push(image1);
  }

  const image2 = settings?.footer_image2_url?.trim();
  if (image2) {
    urls.push(image2);
  }

  return urls;
}

export function getSiteFooterLinks(
  settings: SiteFooterSettings | null | undefined,
): SiteFooterLink[] {
  const links: SiteFooterLink[] = [];

  const privacyUrl = normalizeOptionalLinkUrl(settings?.footer_privacy_policy_url);
  if (privacyUrl) {
    links.push({
      id: "privacy-policy",
      label: "개인정보처리방침",
      url: privacyUrl,
    });
  }

  const termsUrl = normalizeOptionalLinkUrl(settings?.footer_terms_url);
  if (termsUrl) {
    links.push({
      id: "terms-of-service",
      label: "이용약관",
      url: termsUrl,
    });
  }

  const legacyLabel = settings?.footer_link_label?.trim() ?? "";
  const legacyUrl = normalizeOptionalLinkUrl(settings?.footer_link_url);
  if (legacyLabel && legacyUrl) {
    links.push({
      id: "legacy",
      label: legacyLabel,
      url: legacyUrl,
    });
  }

  return links;
}

export function getSiteFooterDisplay(
  settings: SiteFooterSettings | null | undefined,
): SiteFooterDisplay {
  const businessLine1 = settings?.footer_business_line1?.trim() ?? "";
  const businessLine2 = settings?.footer_business_line2?.trim() ?? "";
  const copyright = settings?.footer_copyright?.trim() ?? "";
  const imageUrls = getSiteFooterImageUrls(settings);
  const text = settings?.footer_text?.trim() ?? "";
  const links = getSiteFooterLinks(settings);
  const socialLinks = getActiveFooterSocialLinks(settings);
  const legacyLinkUrl = normalizeOptionalLinkUrl(settings?.footer_link_url);
  const legacyWholeTextLink = Boolean(
    text && legacyLinkUrl && !settings?.footer_link_label?.trim() && links.length === 0,
  );

  return {
    imageUrls,
    businessLine1,
    businessLine2,
    copyright,
    text,
    links,
    socialLinks,
    legacyWholeTextLink,
    legacyLinkUrl,
    hasContent: Boolean(
      imageUrls.length > 0 ||
        businessLine1 ||
        businessLine2 ||
        copyright ||
        text ||
        links.length > 0 ||
        socialLinks.length > 0,
    ),
  };
}

export function shouldShowSiteFooter(
  enabled: boolean | null | undefined,
  settings: SiteFooterSettings | null | undefined,
): boolean {
  return Boolean(enabled) && getSiteFooterDisplay(settings).hasContent;
}
