import {
  isAndroidDevice,
  isIOSDevice,
  isIOSSafariBrowser,
  isKakaoInAppBrowser,
  isSamsungBrowser,
} from "@/lib/in-app-browser";
import { isStandaloneDisplayMode, parsePwaInstallGuideSteps } from "@/lib/site-pwa";

export type SiteBrowserGuideSettingsSource = {
  site_kakao_in_app_guide_enabled?: boolean;
  site_kakao_in_app_guide_title?: string | null;
  site_kakao_in_app_guide_message?: string | null;
  site_kakao_in_app_guide_button_label?: string | null;
  site_kakao_in_app_guide_samsung_button_label?: string | null;
  site_kakao_in_app_guide_safari_button_label?: string | null;
  site_safari_browser_guide_enabled?: boolean;
  site_safari_browser_guide_title?: string | null;
  site_safari_browser_guide_message?: string | null;
  site_safari_browser_guide_steps?: string | null;
  site_safari_browser_guide_button_label?: string | null;
  /** @deprecated Prefer site_safari_browser_guide_* — kept as read fallback. */
  site_kakao_in_app_guide_ios_popup_title?: string | null;
  site_kakao_in_app_guide_ios_popup_message?: string | null;
  site_kakao_in_app_guide_ios_popup_steps?: string | null;
  site_kakao_in_app_guide_ios_safari_open_label?: string | null;
  site_pwa_install_guide_message?: string | null;
  site_pwa_install_guide_steps?: string | null;
  site_samsung_browser_guide_enabled?: boolean;
  site_samsung_browser_guide_title?: string | null;
  site_samsung_browser_guide_message?: string | null;
  site_samsung_browser_guide_chrome_button_label?: string | null;
  site_samsung_browser_guide_button_label?: string | null;
  site_samsung_browser_guide_open_button_label?: string | null;
};

export type ResolvedKakaoBrowserGuide = {
  kind: "kakao";
  title: string | null;
  message: string | null;
  samsungButtonLabel: string | null;
  chromeButtonLabel: string | null;
  safariButtonLabel: string | null;
};

export type ResolvedSamsungBrowserGuide = {
  kind: "samsung";
  title: string | null;
  message: string | null;
  chromeButtonLabel: string | null;
  installButtonLabel: string | null;
  openButtonLabel: string | null;
};

export type ResolvedSafariBrowserGuide = {
  kind: "safari";
  title: string | null;
  message: string | null;
  steps: string[];
  buttonLabel: string | null;
};

export type ResolvedBrowserGuide =
  | ResolvedKakaoBrowserGuide
  | ResolvedSamsungBrowserGuide
  | ResolvedSafariBrowserGuide;

export const DEFAULT_SAFARI_INSTALL_GUIDE_TITLE = "앱 설치 안내";
export const DEFAULT_SAFARI_INSTALL_GUIDE_BUTTON_LABEL = "열기";

export type ResolvedSafariInstallGuidePreview = {
  title: string;
  message: string | null;
  steps: string[];
  buttonLabel: string;
};

/** Runtime content for Safari-only install guide. */
export function resolveSafariInstallGuideContent(
  settings: SiteBrowserGuideSettingsSource | null | undefined,
): ResolvedSafariInstallGuidePreview {
  const title =
    settings?.site_safari_browser_guide_title?.trim() ||
    settings?.site_kakao_in_app_guide_ios_popup_title?.trim() ||
    DEFAULT_SAFARI_INSTALL_GUIDE_TITLE;
  const message =
    settings?.site_safari_browser_guide_message?.trim() ||
    settings?.site_kakao_in_app_guide_ios_popup_message?.trim() ||
    settings?.site_pwa_install_guide_message?.trim() ||
    null;
  const customSteps = parsePwaInstallGuideSteps(
    settings?.site_safari_browser_guide_steps ||
      settings?.site_kakao_in_app_guide_ios_popup_steps,
  );
  const pwaSteps = parsePwaInstallGuideSteps(settings?.site_pwa_install_guide_steps);
  const steps = customSteps.length > 0 ? customSteps : pwaSteps;
  const buttonLabel =
    settings?.site_safari_browser_guide_button_label?.trim() ||
    settings?.site_kakao_in_app_guide_ios_safari_open_label?.trim() ||
    DEFAULT_SAFARI_INSTALL_GUIDE_BUTTON_LABEL;

  return { title, message, steps, buttonLabel };
}

/** @deprecated Use resolveSafariInstallGuideContent */
export const DEFAULT_KAKAO_IOS_INSTALL_POPUP_TITLE = DEFAULT_SAFARI_INSTALL_GUIDE_TITLE;
export const DEFAULT_KAKAO_IOS_SAFARI_OPEN_LABEL = DEFAULT_SAFARI_INSTALL_GUIDE_BUTTON_LABEL;
export const DEFAULT_KAKAO_IOS_INSTALL_STEPS: string[] = [];
export const resolveKakaoIosInstallPopup = resolveSafariInstallGuideContent;

export function resolveActiveBrowserGuide(
  settings: SiteBrowserGuideSettingsSource | null | undefined,
): ResolvedBrowserGuide | null {
  if (typeof window === "undefined" || isStandaloneDisplayMode()) {
    return null;
  }

  if (
    (settings?.site_kakao_in_app_guide_enabled ?? false) &&
    isKakaoInAppBrowser()
  ) {
    const title = settings?.site_kakao_in_app_guide_title?.trim() || null;
    const message = settings?.site_kakao_in_app_guide_message?.trim() || null;
    const samsungButtonLabel =
      isAndroidDevice()
        ? settings?.site_kakao_in_app_guide_samsung_button_label?.trim() || null
        : null;
    const chromeButtonLabel =
      isAndroidDevice() ? settings?.site_kakao_in_app_guide_button_label?.trim() || null : null;
    const safariButtonLabel =
      isIOSDevice() ? settings?.site_kakao_in_app_guide_safari_button_label?.trim() || null : null;

    if (!title && !message && !samsungButtonLabel && !chromeButtonLabel && !safariButtonLabel) {
      return null;
    }

    return {
      kind: "kakao",
      title,
      message,
      samsungButtonLabel,
      chromeButtonLabel,
      safariButtonLabel,
    };
  }

  if (
    (settings?.site_safari_browser_guide_enabled ?? false) &&
    isIOSSafariBrowser()
  ) {
    const content = resolveSafariInstallGuideContent(settings);
    const hasContent =
      Boolean(settings?.site_safari_browser_guide_title?.trim()) ||
      Boolean(settings?.site_safari_browser_guide_message?.trim()) ||
      Boolean(settings?.site_safari_browser_guide_steps?.trim()) ||
      Boolean(settings?.site_safari_browser_guide_button_label?.trim()) ||
      Boolean(settings?.site_kakao_in_app_guide_ios_popup_title?.trim()) ||
      Boolean(settings?.site_kakao_in_app_guide_ios_popup_message?.trim()) ||
      Boolean(settings?.site_kakao_in_app_guide_ios_popup_steps?.trim()) ||
      Boolean(settings?.site_kakao_in_app_guide_ios_safari_open_label?.trim()) ||
      Boolean(settings?.site_pwa_install_guide_message?.trim()) ||
      Boolean(settings?.site_pwa_install_guide_steps?.trim());

    if (!hasContent) {
      return null;
    }

    return {
      kind: "safari",
      title: content.title,
      message: content.message,
      steps: content.steps,
      buttonLabel: content.buttonLabel,
    };
  }

  if (
    (settings?.site_samsung_browser_guide_enabled ?? false) &&
    isSamsungBrowser()
  ) {
    const title = settings?.site_samsung_browser_guide_title?.trim() || null;
    const message = settings?.site_samsung_browser_guide_message?.trim() || null;
    const chromeButtonLabel = settings?.site_samsung_browser_guide_chrome_button_label?.trim() || null;
    const installButtonLabel = settings?.site_samsung_browser_guide_button_label?.trim() || null;
    const openButtonLabel = settings?.site_samsung_browser_guide_open_button_label?.trim() || null;

    if (!title && !message && !chromeButtonLabel && !installButtonLabel && !openButtonLabel) {
      return null;
    }

    return {
      kind: "samsung",
      title,
      message,
      chromeButtonLabel,
      installButtonLabel,
      openButtonLabel,
    };
  }

  return null;
}
