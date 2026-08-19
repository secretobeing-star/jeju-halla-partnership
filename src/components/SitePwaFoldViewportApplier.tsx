"use client";

import { useEffect } from "react";
import { subscribeLayoutViewport } from "@/lib/layout-viewport";
import { resetPwaFoldViewportSignature, syncPwaFoldViewportClasses, syncPwaNavigationThemeColor } from "@/lib/pwa-fold-viewport";

export default function SitePwaFoldViewportApplier() {
  useEffect(() => {
    const syncClasses = () => {
      syncPwaFoldViewportClasses();
    };
    const syncTheme = () => {
      syncPwaNavigationThemeColor();
    };
    const syncAll = () => {
      if (document.visibilityState === "hidden") {
        return;
      }
      syncClasses();
      syncTheme();
    };

    syncAll();

    const unsubscribeLayout = subscribeLayoutViewport(syncClasses);
    window.addEventListener("visibilitychange", syncAll);
    window.addEventListener("pageshow", syncAll);

    const displayModeQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = () => {
      syncAll();
    };

    if (typeof displayModeQuery.addEventListener === "function") {
      displayModeQuery.addEventListener("change", handleDisplayModeChange);
    } else {
      displayModeQuery.addListener(handleDisplayModeChange);
    }

    return () => {
      unsubscribeLayout();
      window.removeEventListener("visibilitychange", syncAll);
      window.removeEventListener("pageshow", syncAll);

      if (typeof displayModeQuery.removeEventListener === "function") {
        displayModeQuery.removeEventListener("change", handleDisplayModeChange);
      } else {
        displayModeQuery.removeListener(handleDisplayModeChange);
      }

      resetPwaFoldViewportSignature();
      document.documentElement.classList.remove(
        "pwa-standalone",
        "pwa-v-phone",
        "pwa-v-tablet",
        "pwa-v-tablet-lg",
        "pwa-v-wide",
        "pwa-v-fold-cover",
        "pwa-v-s-bar",
        "pwa-v-bar",
        "pwa-v-tab-a",
        "pwa-v-landscape",
        "pwa-v-portrait",
        "pwa-fold-cover",
        "pwa-fold-tablet",
        "pwa-fold-tablet-lg",
        "pwa-fold-wide",
      );
    };
  }, []);

  return null;
}
