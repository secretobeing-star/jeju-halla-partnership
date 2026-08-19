"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBoardVoterKey } from "@/lib/board-voter";
import { getPwaDeviceKey } from "@/lib/site-pwa-device";
import {
  getNotificationPermissionState,
  hasPwaFirstRunLocationPrompted,
  hasPwaFirstRunNotificationPrompted,
  markPwaFirstRunLocationPrompted,
  markPwaFirstRunNotificationPrompted,
  queryGeolocationPermissionState,
  requestPwaLocationAccess,
  requestPwaNotificationAccess,
  type PermissionDisplayState,
} from "@/lib/site-pwa-permissions";
import {
  isPwaEnabled,
  isPwaFirstRunLocationPromptEnabled,
  isPwaFirstRunNotificationPromptEnabled,
  isStandaloneDisplayMode,
  type SitePwaSettingsSource,
} from "@/lib/site-pwa";
import {
  getPwaPermissionFirstRunCopyFingerprint,
  resolvePwaFirstRunPromptContent,
  type SitePwaPermissionMessagesSource,
} from "@/lib/site-pwa-permission-messages";
import SitePwaPermissionPromptDialog from "@/components/SitePwaPermissionPromptDialog";
import { useTwaConfig } from "@/hooks/useTwaConfig";
import {
  canOpenAndroidSystemSettings,
  mapPermissionKindToTwaSettingsTarget,
  openAndroidSystemSettings,
  resolveTwaPackageName,
} from "@/lib/site-twa-client";
import {
  isSitePopupVisible,
  SITE_POPUP_VISIBILITY_EVENT,
} from "@/lib/site-popup-visibility";

const DISPLAY_MODE_QUERIES = [
  "(display-mode: standalone)",
  "(display-mode: fullscreen)",
  "(display-mode: minimal-ui)",
  "(display-mode: window-controls-overlay)",
] as const;

type PromptKind = "notification" | "location";
type PromptVariant = "request" | "denied";

type ActivePromptState = {
  kind: PromptKind;
  variant: PromptVariant;
  permissionState: PermissionDisplayState;
  title: string;
  message: string | null;
};

type SitePwaFirstRunPermissionsProps = {
  settings: SitePwaSettingsSource & SitePwaPermissionMessagesSource;
  settingsReady: boolean;
  appReady: boolean;
  pushEnabled: boolean;
};

export default function SitePwaFirstRunPermissions({
  settings,
  settingsReady,
  appReady,
  pushEnabled,
}: SitePwaFirstRunPermissionsProps) {
  const [activePrompt, setActivePrompt] = useState<ActivePromptState | null>(null);
  const [busy, setBusy] = useState(false);
  const [clientKey] = useState(() => getBoardVoterKey());
  const activePromptRef = useRef<ActivePromptState | null>(null);
  const settingsRef = useRef(settings);
  const appReadyRef = useRef(appReady);
  const settingsReadyRef = useRef(settingsReady);
  const scheduleTimerRef = useRef<number | null>(null);
  const { config: twaConfig } = useTwaConfig();
  const twaPackageName = resolveTwaPackageName(twaConfig.packageName);
  const canOpenSystemSettings = canOpenAndroidSystemSettings(twaConfig);
  const permissionCopyFingerprint = getPwaPermissionFirstRunCopyFingerprint(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    appReadyRef.current = appReady;
  }, [appReady]);

  useEffect(() => {
    settingsReadyRef.current = settingsReady;
  }, [settingsReady]);

  useEffect(() => {
    activePromptRef.current = activePrompt;
  }, [activePrompt]);

  const clearScheduledResolve = useCallback(() => {
    if (scheduleTimerRef.current != null) {
      window.clearTimeout(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
    }
  }, []);

  const resolveNextPrompt = useCallback(async () => {
    if (activePromptRef.current) {
      return;
    }

    const currentSettings = settingsRef.current;

    if (
      !isStandaloneDisplayMode() ||
      !isPwaEnabled(currentSettings) ||
      !settingsReadyRef.current ||
      !appReadyRef.current ||
      isSitePopupVisible()
    ) {
      return;
    }

    if (
      isPwaFirstRunNotificationPromptEnabled(currentSettings) &&
      !hasPwaFirstRunNotificationPrompted(getPwaDeviceKey())
    ) {
      const notificationState = getNotificationPermissionState();
      if (notificationState === "unsupported") {
        markPwaFirstRunNotificationPrompted(getPwaDeviceKey());
      } else {
        const content = resolvePwaFirstRunPromptContent(
          currentSettings,
          "notification",
          notificationState,
        );
        if (content) {
          setActivePrompt({
            kind: "notification",
            variant: content.variant,
            permissionState: notificationState,
            title:
              content.title ||
              (notificationState === "denied" ? "알림 권한 안내" : "알림"),
            message: content.message,
          });
          return;
        }
      }
    }

    if (
      isPwaFirstRunLocationPromptEnabled(currentSettings) &&
      !hasPwaFirstRunLocationPrompted(getPwaDeviceKey())
    ) {
      const locationState = await queryGeolocationPermissionState();
      if (activePromptRef.current) {
        return;
      }

      if (locationState === "unsupported") {
        markPwaFirstRunLocationPrompted(getPwaDeviceKey());
      } else {
        const content = resolvePwaFirstRunPromptContent(
          currentSettings,
          "location",
          locationState,
        );
        if (content) {
          setActivePrompt({
            kind: "location",
            variant: content.variant,
            permissionState: locationState,
            title:
              content.title ||
              (locationState === "denied" ? "위치 권한 안내" : "위치"),
            message: content.message,
          });
        }
      }
    }
  }, []);

  const scheduleResolveNextPrompt = useCallback(
    (delayMs = 300) => {
      clearScheduledResolve();

      scheduleTimerRef.current = window.setTimeout(() => {
        scheduleTimerRef.current = null;
        void resolveNextPrompt();
      }, delayMs);
    },
    [clearScheduledResolve, resolveNextPrompt],
  );

  const tryScheduleResolveNextPrompt = useCallback(() => {
    if (
      activePromptRef.current ||
      !settingsReadyRef.current ||
      !appReadyRef.current ||
      !isStandaloneDisplayMode() ||
      !isPwaEnabled(settingsRef.current)
    ) {
      return;
    }

    scheduleResolveNextPrompt();
  }, [scheduleResolveNextPrompt]);

  useEffect(() => {
    tryScheduleResolveNextPrompt();

    const handleRetry = () => {
      tryScheduleResolveNextPrompt();
    };

    window.addEventListener("pageshow", handleRetry);
    document.addEventListener("visibilitychange", handleRetry);
    window.addEventListener(SITE_POPUP_VISIBILITY_EVENT, handleRetry);

    const mediaQueries = DISPLAY_MODE_QUERIES.map((query) => window.matchMedia(query));
    for (const mediaQuery of mediaQueries) {
      mediaQuery.addEventListener("change", handleRetry);
    }

    return () => {
      clearScheduledResolve();
      window.removeEventListener("pageshow", handleRetry);
      document.removeEventListener("visibilitychange", handleRetry);
      window.removeEventListener(SITE_POPUP_VISIBILITY_EVENT, handleRetry);
      for (const mediaQuery of mediaQueries) {
        mediaQuery.removeEventListener("change", handleRetry);
      }
    };
  }, [
    appReady,
    clearScheduledResolve,
    permissionCopyFingerprint,
    settingsReady,
    settings.site_pwa_enabled,
    settings.site_pwa_first_run_notification_prompt_enabled,
    settings.site_pwa_first_run_location_prompt_enabled,
    tryScheduleResolveNextPrompt,
  ]);

  function finishPrompt() {
    setActivePrompt(null);
    scheduleResolveNextPrompt(200);
  }

  function handleOpenSystemSettings() {
    if (!activePrompt || busy || !twaPackageName) {
      return;
    }

    openAndroidSystemSettings(
      twaPackageName,
      mapPermissionKindToTwaSettingsTarget(activePrompt.kind),
    );

    if (activePrompt.kind === "notification") {
      markPwaFirstRunNotificationPrompted(getPwaDeviceKey());
    } else {
      markPwaFirstRunLocationPrompted(getPwaDeviceKey());
    }

    finishPrompt();
  }

  async function handleAllow() {
    if (!activePrompt || busy) {
      return;
    }

    setBusy(true);
    try {
      if (activePrompt.kind === "notification") {
        markPwaFirstRunNotificationPrompted(getPwaDeviceKey());
        if (
          activePrompt.permissionState === "prompt" &&
          activePrompt.variant === "request" &&
          clientKey
        ) {
          try {
            await requestPwaNotificationAccess(clientKey, pushEnabled);
          } catch {
            // Native prompt may still have been shown.
          }
        }
      } else {
        markPwaFirstRunLocationPrompted(getPwaDeviceKey());
        if (
          activePrompt.permissionState === "prompt" &&
          activePrompt.variant === "request"
        ) {
          try {
            await requestPwaLocationAccess();
          } catch {
            // Native prompt may still have been shown.
          }
        }
      }
    } finally {
      setBusy(false);
      finishPrompt();
    }
  }

  function handleSkip() {
    if (!activePrompt || busy) {
      return;
    }

    if (activePrompt.kind === "notification") {
      markPwaFirstRunNotificationPrompted(getPwaDeviceKey());
    } else {
      markPwaFirstRunLocationPrompted(getPwaDeviceKey());
    }

    finishPrompt();
  }

  if (!activePrompt) {
    return null;
  }

  const isDeniedGuide =
    activePrompt.permissionState === "denied" && activePrompt.variant === "denied";
  const isAlreadyGranted = activePrompt.permissionState === "granted";
  const showOpenSettings = isDeniedGuide && canOpenSystemSettings;

  return (
    <SitePwaPermissionPromptDialog
      open
      title={activePrompt.title}
      message={activePrompt.message}
      primaryLabel={
        showOpenSettings ? "설정 열기" : isDeniedGuide || isAlreadyGranted ? "확인" : "허용"
      }
      secondaryLabel="나중에"
      busy={busy}
      onSecondary={handleSkip}
      onPrimary={() => {
        if (showOpenSettings) {
          handleOpenSystemSettings();
          return;
        }

        void handleAllow();
      }}
    />
  );
}
