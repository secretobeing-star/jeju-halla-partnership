"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  isAndroidDevice,
  isKakaoInAppBrowser,
  isSamsungBrowser,
} from "@/lib/in-app-browser";
import { registerSiteServiceWorker } from "@/lib/site-push-client";
import { launchInstalledPwa } from "@/lib/site-pwa-launch";
import {
  appendPwaAssetVersion,
  buildPwaManifestVersion,
  isPwaEnabled,
  isStandaloneDisplayMode,
  PWA_INSTALLED_STORAGE_KEY,
  PWA_INSTALL_DISMISS_STORAGE_KEY,
  PWA_OPEN_DISMISS_STORAGE_KEY,
  resolvePwaEffectiveOpenButtonLabel,
  resolvePwaIconUrl,
  resolvePwaInstallGuideMessage,
  resolvePwaInstallGuideSteps,
  resolvePwaInstallButtonLabel,
  resolvePwaName,
  resolvePwaOpenButtonLabel,
  type SitePwaSettingsSource,
} from "@/lib/site-pwa";
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_PROMPT_SETTLE_MS = 2500;

function readInstallDismissed() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(PWA_INSTALL_DISMISS_STORAGE_KEY) === "1";
}

function readOpenDismissed() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(PWA_OPEN_DISMISS_STORAGE_KEY) === "1";
}

function readPersistedPwaInstalled() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(PWA_INSTALLED_STORAGE_KEY) === "1";
}

function persistPwaInstalled() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, "1");
}

function clearOpenDismissState(setOpenDismissed: (value: boolean) => void) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PWA_OPEN_DISMISS_STORAGE_KEY);
  setOpenDismissed(false);
}

function markPwaInstalled(setOpenDismissed: (value: boolean) => void) {
  persistPwaInstalled();
  clearOpenDismissState(setOpenDismissed);
}

async function detectRelatedPwaInstalled() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const getInstalledRelatedApps = (
    navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<Array<{ platform?: string; url?: string }>>;
    }
  ).getInstalledRelatedApps;

  if (typeof getInstalledRelatedApps !== "function") {
    return false;
  }

  try {
    const apps = await getInstalledRelatedApps();
    return apps.length > 0;
  } catch {
    return false;
  }
}

type UseSitePwaInstallOptions = {
  settingsReady?: boolean;
};

export function useSitePwaInstall(
  settings: SitePwaSettingsSource,
  options: UseSitePwaInstallOptions = {},
) {
  const settingsReady = options.settingsReady ?? true;
  const enabled = isPwaEnabled(settings);
  const installPromptEnabled = settings.site_pwa_install_prompt_enabled ?? true;
  const appName = useMemo(() => resolvePwaName(settings), [settings]);
  const iconUrl = useMemo(() => {
    const rawIconUrl = resolvePwaIconUrl(settings);
    if (!rawIconUrl) {
      return null;
    }
    return appendPwaAssetVersion(rawIconUrl, buildPwaManifestVersion(settings));
  }, [settings]);
  const guideMessage = useMemo(() => resolvePwaInstallGuideMessage(settings), [settings]);
  const guideSteps = useMemo(() => resolvePwaInstallGuideSteps(settings), [settings]);
  const installButtonLabel = useMemo(() => resolvePwaInstallButtonLabel(settings), [settings]);
  const openButtonLabel = useMemo(() => resolvePwaOpenButtonLabel(settings), [settings]);
  const effectiveOpenButtonLabel = useMemo(
    () => resolvePwaEffectiveOpenButtonLabel(settings),
    [settings],
  );  const hasGuideContent = guideMessage != null || guideSteps.length > 0;

  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [openDismissed, setOpenDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [relatedAppInstalled, setRelatedAppInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [installPromptSettled, setInstallPromptSettled] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void registerSiteServiceWorker().catch(() => undefined);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !installPromptEnabled) {
      setClientReady(false);
      setInstallPromptSettled(false);
      return;
    }

    setInstalled(isStandaloneDisplayMode());
    setInstallDismissed(readInstallDismissed());
    setOpenDismissed(readOpenDismissed());
    setRelatedAppInstalled(readPersistedPwaInstalled());
    setClientReady(true);
    setInstallPromptSettled(false);

    const settleTimer = window.setTimeout(() => {
      setInstallPromptSettled(true);
    }, INSTALL_PROMPT_SETTLE_MS);

    void detectRelatedPwaInstalled().then((detected) => {
      if (detected) {
        setRelatedAppInstalled(true);
        persistPwaInstalled();
      }
    });

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstalled(true);
      setRelatedAppInstalled(true);
      markPwaInstalled(setOpenDismissed);
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

  useEffect(() => {
    if (!installPromptSettled || installEvent) {
      return;
    }

    void detectRelatedPwaInstalled().then((detected) => {
      if (detected) {
        setRelatedAppInstalled(true);
        persistPwaInstalled();
      }
    });
  }, [installEvent, installPromptSettled]);

  const dismissInstallBanner = useCallback(() => {
    window.localStorage.setItem(PWA_INSTALL_DISMISS_STORAGE_KEY, "1");
    setInstallDismissed(true);
  }, []);

  const dismissOpenBanner = useCallback(() => {
    window.localStorage.setItem(PWA_OPEN_DISMISS_STORAGE_KEY, "1");
    setOpenDismissed(true);
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
        setRelatedAppInstalled(true);
        markPwaInstalled(setOpenDismissed);
      }
      setInstallEvent(null);
      return choice.outcome === "accepted";
    } finally {
      setInstalling(false);
    }
  }, [installEvent]);

  const handleOpenClick = useCallback(() => {
    launchInstalledPwa(settings);
  }, [settings]);

  const pwaInstalledOnDevice = installed || relatedAppInstalled;
  const showNativeInstall = installEvent != null;
  const androidOnly = clientReady && isAndroidDevice();
  const inBrowserContext = clientReady && !isStandaloneDisplayMode();
  const browserGuideHandlesPrompt = isKakaoInAppBrowser() || isSamsungBrowser();
  const openPromptEligible =
    installPromptSettled && !showNativeInstall && !browserGuideHandlesPrompt;
  // Install/open banners are Android/Galaxy only — iPhone Safari uses 「Safari 앱 설치 안내」.
  const shouldShowInstallUi =
    settingsReady &&
    androidOnly &&
    inBrowserContext &&
    enabled &&
    installPromptEnabled &&
    !pwaInstalledOnDevice &&
    showNativeInstall;
  const shouldShowOpenUi =
    settingsReady &&
    androidOnly &&
    inBrowserContext &&
    enabled &&
    installPromptEnabled &&
    Boolean(effectiveOpenButtonLabel) &&
    (pwaInstalledOnDevice || openPromptEligible);
  const shouldShowInstallBanner = shouldShowInstallUi && !installDismissed;
  const shouldShowOpenBanner =
    shouldShowOpenUi &&
    !openDismissed &&
    !showNativeInstall &&
    (!installDismissed || pwaInstalledOnDevice);
  const shouldShowBanner = shouldShowInstallBanner || shouldShowOpenBanner;

  return {
    appName,
    iconUrl,
    guideMessage,
    guideSteps,
    installButtonLabel,
    openButtonLabel,
    effectiveOpenButtonLabel,
    hasGuideContent,
    showNativeInstall,
    installPromptSettled,
    openPromptEligible,
    pwaInstalledOnDevice,
    shouldShowInstallUi,
    shouldShowOpenUi,
    shouldShowInstallBanner,
    shouldShowOpenBanner,
    shouldShowBanner,    installing,
    dismissInstallBanner,
    dismissOpenBanner,
    handleInstallClick,
    handleOpenClick,
  };
}
