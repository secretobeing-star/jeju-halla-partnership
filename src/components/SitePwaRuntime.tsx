"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import SitePwaInstallGuideContent from "@/components/SitePwaInstallGuideContent";
import { useSitePwaInstallContext } from "@/components/SitePwaInstallProvider";
import { SITE_BROWSER_GUIDE_VISIBILITY_EVENT } from "@/lib/site-browser-guide-visibility";

export default function SitePwaRuntime() {
  const {
    appName,
    iconUrl,
    guideMessage,
    guideSteps,
    installButtonLabel,
    openButtonLabel,
    effectiveOpenButtonLabel,
    showNativeInstall,
    pwaInstalledOnDevice,
    shouldShowOpenBanner,
    shouldShowBanner: shouldShowPwaBanner,
    installing,
    dismissInstallBanner,
    dismissOpenBanner,
    handleInstallClick,
    handleOpenClick,
  } = useSitePwaInstallContext();
  const [mounted, setMounted] = useState(false);
  const [browserGuideVisible, setBrowserGuideVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    function handleBrowserGuideVisibility(event: Event) {
      const detail = (event as CustomEvent<{ visible: boolean }>).detail;
      setBrowserGuideVisible(Boolean(detail?.visible));
    }

    window.addEventListener(SITE_BROWSER_GUIDE_VISIBILITY_EVENT, handleBrowserGuideVisibility);
    return () => {
      window.removeEventListener(SITE_BROWSER_GUIDE_VISIBILITY_EVENT, handleBrowserGuideVisibility);
    };
  }, [mounted]);

  const shouldShowBanner = shouldShowPwaBanner && !browserGuideVisible;
  const showingOpenBanner = shouldShowOpenBanner && shouldShowBanner;

  useEffect(() => {
    if (!mounted) {
      return;
    }

    document.body.classList.toggle("site-pwa-install-banner-visible", shouldShowBanner);

    return () => {
      document.body.classList.remove("site-pwa-install-banner-visible");
    };
  }, [mounted, shouldShowBanner]);

  if (!shouldShowBanner || !mounted) {
    return null;
  }

  return createPortal(
    <div className="site-pwa-install-banner" role="region" aria-label={showingOpenBanner ? "앱 열기 안내" : "앱 설치 안내"}>
      <div className="site-pwa-install-banner__inner">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            className="site-pwa-install-banner__icon"
            width={44}
            height={44}
          />
        ) : null}
        <div className="site-pwa-install-banner__body">
          <div className="site-pwa-install-banner__copy">
            <SitePwaInstallGuideContent
              appName={appName}
              guideMessage={guideMessage}
              guideSteps={guideSteps}
            />
          </div>
          <button
            type="button"
            className="site-pwa-install-banner__primary"
            onClick={() => {
              if (showingOpenBanner || (pwaInstalledOnDevice && effectiveOpenButtonLabel)) {
                handleOpenClick();
                return;
              }

              void handleInstallClick();
            }}
            disabled={
              showingOpenBanner || pwaInstalledOnDevice
                ? !effectiveOpenButtonLabel
                : installing || !showNativeInstall
            }
          >
            {showingOpenBanner || pwaInstalledOnDevice
              ? effectiveOpenButtonLabel
              : installing
                ? "설치 중..."
                : installButtonLabel}
          </button>
        </div>
        <button
          type="button"
          className="site-pwa-install-banner__dismiss"
          onClick={showingOpenBanner ? dismissOpenBanner : dismissInstallBanner}
          aria-label={showingOpenBanner ? "열기 안내 닫기" : "설치 안내 닫기"}
        >
          닫기
        </button>
      </div>
    </div>,
    document.body,
  );
}
