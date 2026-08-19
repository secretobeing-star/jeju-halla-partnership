"use client";

import { useEffect } from "react";
import { syncPwaNavigationThemeColor } from "@/lib/pwa-fold-viewport";

type SitePwaThemeApplierProps = {
  chromeTabThemeColor: string;
  taskbarThemeColor: string;
  backgroundColor: string;
};

export default function SitePwaThemeApplier({
  chromeTabThemeColor,
  taskbarThemeColor,
  backgroundColor,
}: SitePwaThemeApplierProps) {
  useEffect(() => {
    document.documentElement.style.setProperty("--pwa-chrome-tab-theme-color", chromeTabThemeColor);
    document.documentElement.style.setProperty("--pwa-taskbar-theme-color", taskbarThemeColor);
    document.documentElement.style.setProperty("--pwa-theme-color", taskbarThemeColor);
    document.documentElement.style.setProperty("--pwa-background-color", backgroundColor);

    document
      .querySelector('meta[name="msapplication-TileColor"]')
      ?.setAttribute("content", backgroundColor);

    syncPwaNavigationThemeColor({
      chromeTabThemeColor,
      taskbarThemeColor,
      backgroundColor,
    });
  }, [chromeTabThemeColor, taskbarThemeColor, backgroundColor]);

  return null;
}
