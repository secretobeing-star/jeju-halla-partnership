"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAppBackHandler } from "@/lib/app-back-stack";
import { openInAndroidChrome, openInIOSSafari, openInSamsungBrowser } from "@/lib/in-app-browser";
import SitePwaInstallGuideContent from "@/components/SitePwaInstallGuideContent";
import { useSitePwaInstallContext } from "@/components/SitePwaInstallProvider";
import { dispatchSiteBrowserGuideVisibility } from "@/lib/site-browser-guide-visibility";
import {
  resolveActiveBrowserGuide,
  type SiteBrowserGuideSettingsSource,
} from "@/lib/site-browser-guide-settings";

type SiteBrowserGuideBannerProps = {
  settings: SiteBrowserGuideSettingsSource;
  iconUrl?: string | null;
};

export default function SiteBrowserGuideBanner({
  settings,
  iconUrl = null,
}: SiteBrowserGuideBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [safariInstallHowToOpen, setSafariInstallHowToOpen] = useState(false);
  const {
    iconUrl: pwaIconUrl,
    openButtonLabel: pwaOpenButtonLabel,
    effectiveOpenButtonLabel: pwaEffectiveOpenButtonLabel,
    showNativeInstall,
    installPromptSettled,
    pwaInstalledOnDevice,
    installing,
    handleInstallClick,
    handleOpenClick,
  } = useSitePwaInstallContext();

  useEffect(() => {
    setMounted(true);
  }, []);

  const guide = useMemo(() => {
    if (!mounted || dismissed) {
      return null;
    }

    return resolveActiveBrowserGuide(settings);
  }, [dismissed, mounted, settings]);

  const handleDismiss = useCallback(() => {
    setSafariInstallHowToOpen(false);
    setDismissed(true);
  }, []);

  const handleCloseSafariInstallHowTo = useCallback(() => {
    setSafariInstallHowToOpen(false);
  }, []);

  useAppBackHandler(
    Boolean(guide) && !safariInstallHowToOpen,
    handleDismiss,
    "site-browser-guide",
  );
  useAppBackHandler(
    safariInstallHowToOpen,
    handleCloseSafariInstallHowTo,
    "safari-install-howto",
  );

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const visible = Boolean(guide);
    document.body.classList.toggle("site-browser-guide-visible", visible);
    dispatchSiteBrowserGuideVisibility(visible);

    return () => {
      document.body.classList.remove("site-browser-guide-visible");
      dispatchSiteBrowserGuideVisibility(false);
    };
  }, [guide, mounted]);

  if (!guide || !mounted) {
    return null;
  }

  const samsungPreferOpen =
    guide.kind === "samsung" &&
    (pwaInstalledOnDevice || (installPromptSettled && !showNativeInstall));
  const samsungPrimaryLabel =
    guide.kind === "samsung"
      ? samsungPreferOpen
        ? guide.openButtonLabel ||
          pwaOpenButtonLabel ||
          pwaEffectiveOpenButtonLabel ||
          guide.installButtonLabel ||
          "앱 열기"
        : guide.installButtonLabel
      : null;
  const samsungPrimaryType =
    guide.kind === "samsung" ? (samsungPreferOpen ? "open" : "install") : null;

  const kakaoOpenLabel =
    guide.kind === "kakao" && pwaInstalledOnDevice && pwaEffectiveOpenButtonLabel
      ? pwaEffectiveOpenButtonLabel
      : null;
  const kakaoHasExternalOpen =
    guide.kind === "kakao" &&
    Boolean(guide.samsungButtonLabel || guide.chromeButtonLabel || guide.safariButtonLabel);

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const guideIconUrl = pwaIconUrl || iconUrl;

  return createPortal(
    <>
      <div className="site-browser-guide-popup" role="dialog" aria-modal="true" aria-label="브라우저 안내">
        <div className="site-browser-guide-popup__inner">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              className="site-browser-guide-popup__icon"
              width={44}
              height={44}
            />
          ) : null}
          <div className="site-browser-guide-popup__body">
            <div className="site-browser-guide-popup__header">
              {guide.title ? (
                <p className="site-browser-guide-popup__title">{guide.title}</p>
              ) : (
                <span className="site-browser-guide-popup__title-spacer" aria-hidden="true" />
              )}
              <button
                type="button"
                className="site-browser-guide-popup__dismiss"
                onClick={handleDismiss}
                aria-label="브라우저 안내 닫기"
              >
                닫기
              </button>
            </div>
            {guide.message ? (
              <p className="site-browser-guide-popup__desc">{guide.message}</p>
            ) : null}
            {guide.kind === "samsung" && (guide.chromeButtonLabel || samsungPrimaryLabel) ? (
              <div className="site-browser-guide-popup__actions">
                {guide.chromeButtonLabel ? (
                  <button
                    type="button"
                    className="site-browser-guide-popup__secondary"
                    onClick={() => openInAndroidChrome(currentUrl)}
                  >
                    {guide.chromeButtonLabel}
                  </button>
                ) : null}
                {samsungPrimaryLabel ? (
                  <button
                    type="button"
                    className="site-browser-guide-popup__primary"
                    onClick={() => {
                      if (samsungPrimaryType === "open") {
                        handleOpenClick();
                        return;
                      }

                      void handleInstallClick().then((accepted) => {
                        if (accepted) {
                          window.setTimeout(() => {
                            handleOpenClick();
                          }, 400);
                        }
                      });
                    }}
                    disabled={
                      samsungPrimaryType === "install" &&
                      (installing || !showNativeInstall) &&
                      !samsungPreferOpen
                    }
                  >
                    {samsungPrimaryType === "install" && installing
                      ? "설치 중..."
                      : samsungPrimaryLabel}
                  </button>
                ) : null}
              </div>
            ) : guide.kind === "kakao" && (kakaoHasExternalOpen || kakaoOpenLabel) ? (
              <div className="site-browser-guide-popup__actions">
                {guide.samsungButtonLabel ? (
                  <button
                    type="button"
                    className="site-browser-guide-popup__secondary"
                    onClick={() => openInSamsungBrowser(currentUrl)}
                  >
                    {guide.samsungButtonLabel}
                  </button>
                ) : null}
                {guide.chromeButtonLabel ? (
                  <button
                    type="button"
                    className={
                      guide.samsungButtonLabel || guide.safariButtonLabel || kakaoOpenLabel
                        ? "site-browser-guide-popup__primary"
                        : "site-browser-guide-popup__primary site-browser-guide-popup__primary--solo"
                    }
                    onClick={() => openInAndroidChrome(currentUrl)}
                  >
                    {guide.chromeButtonLabel}
                  </button>
                ) : null}
                {guide.safariButtonLabel ? (
                  <button
                    type="button"
                    className={
                      kakaoOpenLabel
                        ? "site-browser-guide-popup__primary"
                        : "site-browser-guide-popup__primary site-browser-guide-popup__primary--solo"
                    }
                    onClick={() => {
                      void openInIOSSafari(currentUrl);
                    }}
                  >
                    {guide.safariButtonLabel}
                  </button>
                ) : null}
                {kakaoOpenLabel ? (
                  <button
                    type="button"
                    className="site-browser-guide-popup__primary"
                    onClick={handleOpenClick}
                  >
                    {kakaoOpenLabel}
                  </button>
                ) : null}
              </div>
            ) : guide.kind === "safari" && guide.buttonLabel ? (
              <div className="site-browser-guide-popup__actions">
                <button
                  type="button"
                  className="site-browser-guide-popup__primary site-browser-guide-popup__primary--solo"
                  onClick={() => setSafariInstallHowToOpen(true)}
                >
                  {guide.buttonLabel}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {guide.kind === "safari" && safariInstallHowToOpen ? (
        <div
          className="site-browser-guide-popup site-browser-guide-popup--nested"
          role="dialog"
          aria-modal="true"
          aria-label="설치 방법"
        >
          <div className="site-browser-guide-popup__inner">
            {guideIconUrl ? (
              <img
                src={guideIconUrl}
                alt=""
                className="site-browser-guide-popup__icon"
                width={44}
                height={44}
              />
            ) : null}
            <div className="site-browser-guide-popup__body">
              <div className="site-browser-guide-popup__header">
                <p className="site-browser-guide-popup__title">설치 방법</p>
                <button
                  type="button"
                  className="site-browser-guide-popup__dismiss"
                  onClick={handleCloseSafariInstallHowTo}
                  aria-label="설치 방법 닫기"
                >
                  닫기
                </button>
              </div>
              <div className="site-browser-guide-popup__install-guide">
                <SitePwaInstallGuideContent
                  appName=""
                  guideMessage={null}
                  guideSteps={guide.steps}
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  );
}
