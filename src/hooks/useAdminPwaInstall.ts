"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { registerSiteServiceWorker } from "@/lib/site-push-client";
import {
  ADMIN_PWA_INSTALL_DISMISS_STORAGE_KEY,
  ADMIN_PWA_INSTALLED_STORAGE_KEY,
  ADMIN_PWA_MIN_VIEWPORT_WIDTH,
  appendPwaAssetVersion,
  buildAdminPwaManifestVersion,
  isAdminPwaEnabled,
  isAdminPwaTabletViewport,
  resolveAdminPwaIconUrl,
  resolveAdminPwaInstallButtonLabel,
  resolveAdminPwaInstallGuideMessage,
  resolveAdminPwaName,
  type SiteAdminPwaSettingsSource,
} from "@/lib/site-admin-pwa";
import { isStandaloneDisplayMode } from "@/lib/site-pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_PROMPT_SETTLE_MS = 2500;

function readInstallDismissed() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(ADMIN_PWA_INSTALL_DISMISS_STORAGE_KEY) === "1";
}

function readPersistedInstalled() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(ADMIN_PWA_INSTALLED_STORAGE_KEY) === "1";
}

function persistInstalled() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ADMIN_PWA_INSTALLED_STORAGE_KEY, "1");
}

export function useAdminPwaInstall(settings: SiteAdminPwaSettingsSource | null | undefined) {
  const enabled = isAdminPwaEnabled(settings);
  const installPromptEnabled = settings?.site_admin_pwa_install_prompt_enabled ?? true;
  const appName = useMemo(() => resolveAdminPwaName(settings), [settings]);
  const guideMessage = useMemo(() => resolveAdminPwaInstallGuideMessage(settings), [settings]);
  const installButtonLabel = useMemo(
    () => resolveAdminPwaInstallButtonLabel(settings),
    [settings],
  );
  const iconUrl = useMemo(() => {
    const raw = resolveAdminPwaIconUrl(settings);
    if (!raw) {
      return null;
    }
    return appendPwaAssetVersion(raw, buildAdminPwaManifestVersion(settings));
  }, [settings]);

  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [persistedInstalled, setPersistedInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [installPromptSettled, setInstallPromptSettled] = useState(false);
  const [isTabletViewport, setIsTabletViewport] = useState(true);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void registerSiteServiceWorker().catch(() => undefined);
  }, [enabled]);

  useEffect(() => {
    function syncViewport() {
      setIsTabletViewport(isAdminPwaTabletViewport());
    }
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (!enabled || !installPromptEnabled) {
      setClientReady(false);
      setInstallPromptSettled(false);
      return;
    }

    setInstalled(isStandaloneDisplayMode());
    setInstallDismissed(readInstallDismissed());
    setPersistedInstalled(readPersistedInstalled());
    setClientReady(true);
    setInstallPromptSettled(false);

    const settleTimer = window.setTimeout(() => {
      setInstallPromptSettled(true);
    }, INSTALL_PROMPT_SETTLE_MS);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstalled(true);
      setPersistedInstalled(true);
      persistInstalled();
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [enabled, installPromptEnabled]);

  const dismissInstallBanner = useCallback(() => {
    window.localStorage.setItem(ADMIN_PWA_INSTALL_DISMISS_STORAGE_KEY, "1");
    setInstallDismissed(true);
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!installEvent) {
      return false;
    }

    setInstalling(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        setPersistedInstalled(true);
        persistInstalled();
      }
      setInstallEvent(null);
      return choice.outcome === "accepted";
    } finally {
      setInstalling(false);
    }
  }, [installEvent]);

  const pwaInstalledOnDevice = installed || persistedInstalled;
  const showNativeInstall = installEvent != null;
  const inBrowserContext = clientReady && !isStandaloneDisplayMode();
  const shouldShowInstallUi =
    inBrowserContext &&
    enabled &&
    installPromptEnabled &&
    isTabletViewport &&
    installPromptSettled &&
    !pwaInstalledOnDevice &&
    showNativeInstall;
  const shouldShowInstallBanner = shouldShowInstallUi && !installDismissed;
  const shouldShowTabletHint =
    inBrowserContext &&
    enabled &&
    installPromptEnabled &&
    !isTabletViewport &&
    !pwaInstalledOnDevice &&
    !installDismissed;

  return {
    appName,
    iconUrl,
    guideMessage,
    installButtonLabel,
    minViewportWidth: ADMIN_PWA_MIN_VIEWPORT_WIDTH,
    showNativeInstall,
    installing,
    shouldShowInstallUi,
    shouldShowInstallBanner,
    shouldShowTabletHint,
    isTabletViewport,
    dismissInstallBanner,
    handleInstallClick,
  };
}
