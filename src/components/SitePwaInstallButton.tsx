"use client";

import { useEffect, useId, useRef, useState } from "react";
import SitePwaInstallGuideContent from "@/components/SitePwaInstallGuideContent";
import { useSitePwaInstallContext } from "@/components/SitePwaInstallProvider";

type SitePwaInstallButtonProps = {
  className?: string;
  panelAlign?: "left" | "right";
};

function InstallAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="site-pwa-install-trigger__icon"
      aria-hidden
    >
      <path d="M12 15V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M20 21H4a2 2 0 0 1-2-2v-1h20v1a2 2 0 0 1-2 2Z" />
    </svg>
  );
}

export default function SitePwaInstallButton({
  className = "",
  panelAlign = "left",
}: SitePwaInstallButtonProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const {
    appName,
    iconUrl,
    guideMessage,
    guideSteps,
    installButtonLabel,
    showNativeInstall,
    shouldShowInstallUi,
    installing,
    handleInstallClick,
  } = useSitePwaInstallContext();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (!(target instanceof Node) || !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (!shouldShowInstallUi) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className={[
        "site-pwa-install-trigger",
        open ? " site-pwa-install-trigger--open" : "",
        panelAlign === "right" ? " site-pwa-install-trigger--panel-right" : "",
        className,
      ]
        .filter(Boolean)
        .join("")}
    >
      <button
        type="button"
        className="site-pwa-install-trigger__button"
        aria-label="앱 설치 안내"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        {iconUrl ? (
          <img src={iconUrl} alt="" className="site-pwa-install-trigger__app-icon" width={20} height={20} />
        ) : (
          <InstallAppIcon />
        )}
      </button>

      {open ? (
        <div id={panelId} className="site-pwa-install-trigger__panel" role="dialog" aria-label="앱 설치 안내">
          <div className="site-pwa-install-trigger__panel-inner">
            {iconUrl ? (
              <img
                src={iconUrl}
                alt=""
                className="site-pwa-install-trigger__panel-icon"
                width={40}
                height={40}
              />
            ) : null}
            <div className="site-pwa-install-guide">
              <SitePwaInstallGuideContent
                appName={appName}
                guideMessage={guideMessage}
                guideSteps={guideSteps}
                compact
              />
            </div>
          </div>
          <button
            type="button"
            className="site-pwa-install-trigger__primary"
            disabled={installing || !showNativeInstall}
            onClick={() => void handleInstallClick()}
          >
            {installing ? "설치 중..." : installButtonLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
