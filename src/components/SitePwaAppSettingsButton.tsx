"use client";

import { useCallback, useEffect, useState } from "react";
import { getBoardVoterKey } from "@/lib/board-voter";
import {
  MAIN_FONT_SIZE_OPTIONS,
  type MainFontSize,
} from "@/lib/main-font-size";
import {
  beginNotificationPermissionRequest,
  completePwaNotificationAccess,
  disablePwaNotificationAccess,
  disablePwaLocationAccess,
  enablePwaLocationAccess,
  getNotificationPermissionState,
  refreshPwaLocationAccessState,
  refreshPwaNotificationAccessState,
  syncPwaLocationAccessAfterAppResume,
  syncPwaNotificationAccessAfterAppResume,
  type PermissionDisplayState,
} from "@/lib/site-pwa-permissions";
import {
  isPwaAppSettingsCategoryRegionEnabled,
  isPwaAppSettingsDarkModeEnabled,
  isPwaAppSettingsFontSizeEnabled,
  isPwaAppSettingsLocationEnabled,
  isPwaAppSettingsNotificationEnabled,
  isPwaAppSettingsPageBackgroundEnabled,
  type SitePwaAppDisplaySettingsSource,
} from "@/lib/site-pwa";
import { resolvePwaPermissionAppSettingsDeniedMessage } from "@/lib/site-pwa-permission-messages";
import SitePwaPermissionPromptDialog from "@/components/SitePwaPermissionPromptDialog";
import { useAppBackHandler } from "@/lib/app-back-stack";
import {
  applySiteScalePresetFromFontSize,
  loadUserBetaSettings,
  patchUserBetaSettings,
  USER_BETA_SETTINGS_EVENT,
  type UserBetaSettings,
} from "@/lib/user-beta-settings";
import { useTwaConfig } from "@/hooks/useTwaConfig";
import {
  canOpenAndroidSystemSettings,
  mapPermissionKindToTwaSettingsTarget,
  openAndroidSystemSettings,
  resolveTwaPackageName,
} from "@/lib/site-twa-client";
import { getSiteMemberSession, clearSiteMemberSession } from "@/lib/site-member-session";
import { supabase } from "@/lib/supabase";
import DeleteAccountConfirmDialog from "@/components/DeleteAccountConfirmDialog";

type PermissionGuidePrompt = {
  kind: "notification" | "location";
  message: string;
};

type SitePwaAppSettingsButtonProps = {
  settings: SitePwaAppDisplaySettingsSource;
  pushEnabled: boolean;
  layout?: "fixed" | "toolbar";
};

function DarkModeStateIcon({ dark }: { dark: boolean }) {
  if (dark) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0 text-amber-500"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4 shrink-0 text-indigo-500"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
  hint,
  useButtonTrigger = false,
  darkModeIcons = false,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  hint?: string;
  useButtonTrigger?: boolean;
  darkModeIcons?: boolean;
}) {
  const content = (
    <>
      <span className="min-w-0 inline-flex items-center gap-1.5">
        {darkModeIcons ? <DarkModeStateIcon dark={checked} /> : null}
        <span>
          <span className="site-pwa-app-settings__row-label">{label}</span>
          {hint ? <span className="site-pwa-app-settings__row-state">{hint}</span> : null}
          {darkModeIcons && !hint ? (
            <span className="site-pwa-app-settings__row-state">
              {checked ? "다크 모드" : "라이트 모드"}
            </span>
          ) : null}
        </span>
      </span>
      <span className="site-pwa-app-settings__toggle-meta">
        <span
          className={`site-pwa-app-settings__toggle-indicator${
            checked ? " site-pwa-app-settings__toggle-indicator--on" : ""
          }`}
          aria-hidden
        />
        {darkModeIcons ? (checked ? "다크" : "라이트") : checked ? "활성화" : "비활성화"}
      </span>
    </>
  );

  return (
    <div className="site-pwa-app-settings__toggle-row-wrap">
      {useButtonTrigger ? (
        <button
          type="button"
          className={`site-pwa-app-settings__toggle-row site-pwa-app-settings__toggle-row--button${
            disabled ? " opacity-60" : ""
          }`}
          disabled={disabled}
          aria-pressed={checked}
          onClick={() => onChange(!checked)}
        >
          {content}
        </button>
      ) : (
        <label className={`site-pwa-app-settings__toggle-row${disabled ? " opacity-60" : ""}`}>
          {content}
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
            className="site-pwa-app-settings__toggle-input sr-only"
          />
        </label>
      )}
    </div>
  );
}

function SiteSizeRow({
  value,
  scalePercent,
  onChange,
}: {
  value: MainFontSize;
  scalePercent: number;
  onChange: (value: MainFontSize) => void;
}) {
  return (
    <div className="site-pwa-app-settings__option-row">
      <p className="site-pwa-app-settings__row-label">사이트 크기</p>
      <p className="site-pwa-app-settings__row-state">
        현재 {scalePercent}% · 제휴 목록·게시판 등 화면 전체 크기
      </p>
      <div className="site-pwa-app-settings__option-list">
        {MAIN_FONT_SIZE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`site-pwa-app-settings__option${
              value === option.value ? " site-pwa-app-settings__option--selected" : ""
            }`}
          >
            <input
              type="radio"
              name="pwa-app-site-size"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="site-pwa-app-settings__option-input"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function SitePwaAppSettingsButton({
  settings,
  pushEnabled,
  layout = "toolbar",
}: SitePwaAppSettingsButtonProps) {
  const showNotification = isPwaAppSettingsNotificationEnabled(settings);
  const showLocation = isPwaAppSettingsLocationEnabled(settings);
  const showDarkMode = isPwaAppSettingsDarkModeEnabled(settings);
  const showFontSize = isPwaAppSettingsFontSizeEnabled(settings);
  const showPageBackground = isPwaAppSettingsPageBackgroundEnabled(settings);
  const showCategoryRegion = isPwaAppSettingsCategoryRegionEnabled(settings);
  const showLab = showFontSize || showDarkMode || showPageBackground;
  const showPermissions = showNotification || showLocation;
  const pageBackgroundDefaultEnabled = settings.page_background_default_enabled ?? true;

  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<UserBetaSettings>(() => loadUserBetaSettings());
  const effectivePageBackground =
    prefs.page_background ?? pageBackgroundDefaultEnabled;
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountMessage, setDeleteAccountMessage] = useState<string | null>(null);
  const [memberLoggedIn, setMemberLoggedIn] = useState(false);

  useEffect(() => {
    function syncLogin() {
      setMemberLoggedIn(Boolean(getSiteMemberSession()?.student?.studentId?.trim()));
    }
    syncLogin();
    window.addEventListener("site-member-session-changed", syncLogin);
    return () => window.removeEventListener("site-member-session-changed", syncLogin);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  useAppBackHandler(open, closePanel, "site-pwa-app-settings-panel");
  const [notificationState, setNotificationState] = useState<PermissionDisplayState>("prompt");
  const [notificationSubscribed, setNotificationSubscribed] = useState(false);
  const [locationState, setLocationState] = useState<PermissionDisplayState>("prompt");
  const [locationActive, setLocationActive] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [permissionGuidePrompt, setPermissionGuidePrompt] = useState<PermissionGuidePrompt | null>(
    null,
  );
  const { config: twaConfig } = useTwaConfig();
  const twaPackageName = resolveTwaPackageName(twaConfig.packageName);
  const canOpenSystemSettings = canOpenAndroidSystemSettings(twaConfig);

  const refreshPrefs = useCallback(() => {
    setPrefs(loadUserBetaSettings());
  }, []);

  useEffect(() => {
    refreshPrefs();
    window.addEventListener(USER_BETA_SETTINGS_EVENT, refreshPrefs);
    return () => window.removeEventListener(USER_BETA_SETTINGS_EVENT, refreshPrefs);
  }, [refreshPrefs]);

  const refreshStates = useCallback(
    async (options?: { afterAppResume?: boolean }) => {
      setNotificationState(getNotificationPermissionState());

      if (showNotification) {
        if (pushEnabled) {
          if (options?.afterAppResume) {
            const pushState = await syncPwaNotificationAccessAfterAppResume(
              getBoardVoterKey(),
              pushEnabled,
            );
            setNotificationSubscribed(pushState.subscribed);
            if (pushState.synced) {
              setMessage("기기 설정에서 허용하셨습니다. 푸시 알림을 연결했습니다.");
            }
          } else {
            const pushState = await refreshPwaNotificationAccessState();
            setNotificationSubscribed(pushState.subscribed);
          }
        } else {
          setNotificationSubscribed(getNotificationPermissionState() === "granted");
        }
      }

      if (showLocation) {
        if (options?.afterAppResume) {
          const locationAccess = await syncPwaLocationAccessAfterAppResume();
          setLocationState(locationAccess.permission);
          setLocationActive(locationAccess.active);
          if (locationAccess.synced) {
            setMessage("기기 설정에서 허용하셨습니다. 위치 사용을 켰습니다.");
          }
        } else {
          const locationAccess = await refreshPwaLocationAccessState();
          setLocationState(locationAccess.permission);
          setLocationActive(locationAccess.active);
        }
      }
    },
    [pushEnabled, showLocation, showNotification],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    void refreshStates();
  }, [open, refreshStates]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleAppResume() {
      if (document.visibilityState !== "visible") {
        return;
      }

      void refreshStates({ afterAppResume: true });
    }

    window.addEventListener("focus", handleAppResume);
    document.addEventListener("visibilitychange", handleAppResume);
    return () => {
      window.removeEventListener("focus", handleAppResume);
      document.removeEventListener("visibilitychange", handleAppResume);
    };
  }, [open, refreshStates]);

  function updatePrefs(patch: Partial<UserBetaSettings>) {
    patchUserBetaSettings(patch);
    setPrefs(loadUserBetaSettings());
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    setDeleteAccountMessage(null);
    try {
      const session = getSiteMemberSession();
      const studentId = session?.student?.studentId?.trim() || "";
      if (!studentId) {
        setDeleteAccountMessage("로그인 후 탈퇴할 수 있습니다.");
        return;
      }

      const response = await fetch("/api/auth/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.displayName,
          providerToken: session.provider_token,
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };

      if (!response.ok || payload.error) {
        setDeleteAccountMessage(payload.error || "회원 탈퇴에 실패했습니다.");
        return;
      }

      setDeleteAccountMessage(payload.message || "회원탈퇴가 완료되었습니다.");
      setDeleteAccountConfirm(false);

      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      setDeleteAccountMessage(
        error instanceof Error ? error.message : "회원 탈퇴에 실패했습니다.",
      );
    } finally {
      setDeletingAccount(false);
    }
  }

  const notificationActive = pushEnabled ? notificationSubscribed : notificationState === "granted";
  const notificationDenied = notificationState === "denied";
  const locationDenied = locationState === "denied";
  const locationUnsupported = locationState === "unsupported";
  const notificationDeniedMessage = resolvePwaPermissionAppSettingsDeniedMessage(
    settings,
    "notification",
  );
  const locationDeniedMessage = resolvePwaPermissionAppSettingsDeniedMessage(
    settings,
    "location",
  );
  const notificationHint = pushEnabled
    ? notificationDenied
      ? notificationDeniedMessage
        ? "거부됨 · 탭하면 안내"
        : "거부됨"
      : notificationState === "granted" && !notificationActive
        ? "기기에서 허용됨 · 토글을 켜 주세요"
        : notificationActive
          ? "푸시 알림을 받고 있습니다"
          : "푸시 알림이 꺼져 있습니다"
    : notificationDenied
      ? notificationDeniedMessage
        ? "거부됨 · 탭하면 안내"
        : "거부됨"
      : undefined;
  const locationHint = locationUnsupported
    ? "이 기기에서는 위치를 지원하지 않습니다"
    : locationDenied
      ? locationDeniedMessage
        ? "거부됨 · 탭하면 안내"
        : "거부됨"
      : locationState === "granted" && !locationActive
        ? "기기에서 허용됨 · 토글을 켜 주세요"
        : locationActive
          ? "위치 기능을 사용하고 있습니다"
          : "위치 사용이 꺼져 있습니다";

  function showPermissionGuidePrompt(kind: PermissionGuidePrompt["kind"], guideMessage: string) {
    setPermissionGuidePrompt({ kind, message: guideMessage });
  }

  function closePermissionGuidePrompt() {
    setPermissionGuidePrompt(null);
  }

  function openPermissionGuideSettings(kind: PermissionGuidePrompt["kind"]) {
    if (canOpenSystemSettings && twaPackageName) {
      openAndroidSystemSettings(
        twaPackageName,
        mapPermissionKindToTwaSettingsTarget(kind),
      );
    }
    closePermissionGuidePrompt();
  }

  if (!showPermissions && !showLab && !showCategoryRegion) {
    return null;
  }

  function handleNotificationToggle(nextEnabled: boolean) {
    if (notificationBusy) {
      return;
    }

    if (!nextEnabled) {
      setNotificationBusy(true);
      setMessage(null);
      void (async () => {
        try {
          if (pushEnabled) {
            await disablePwaNotificationAccess();
            setMessage("푸시 알림을 껐습니다.");
          } else {
            setMessage("브라우저 또는 기기 설정에서 알림 권한을 변경할 수 있습니다.");
          }
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "알림 설정에 실패했습니다.");
        } finally {
          setNotificationBusy(false);
          await refreshStates();
        }
      })();
      return;
    }

    if (nextEnabled && notificationDenied) {
      if (notificationDeniedMessage) {
        showPermissionGuidePrompt("notification", notificationDeniedMessage);
      } else if (canOpenSystemSettings && twaPackageName) {
        openAndroidSystemSettings(
          twaPackageName,
          mapPermissionKindToTwaSettingsTarget("notification"),
        );
      }
      return;
    }

    let permissionPromise: Promise<NotificationPermission>;
    try {
      permissionPromise = beginNotificationPermissionRequest();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "알림 설정에 실패했습니다.");
      return;
    }

    const voterKey = getBoardVoterKey();
    setNotificationBusy(true);
    setMessage(null);

    void (async () => {
      try {
        const permission = await permissionPromise;
        if (permission !== "granted") {
          setMessage("기기 설정에서 이 앱의 알림 권한을 허용해 주세요.");
          return;
        }

        await completePwaNotificationAccess(voterKey, pushEnabled, permission);
        setMessage(pushEnabled ? "푸시 알림을 켰습니다." : "알림 권한을 허용했습니다.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "알림 설정에 실패했습니다.");
      } finally {
        setNotificationBusy(false);
        await refreshStates();
      }
    })();
  }

  async function handleLocationToggle(nextEnabled: boolean) {
    if (locationBusy || locationUnsupported) {
      return;
    }

    if (!nextEnabled) {
      setLocationBusy(true);
      setMessage(null);
      try {
        await disablePwaLocationAccess();
        setMessage("위치 사용을 껐습니다.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "위치 설정에 실패했습니다.");
      } finally {
        setLocationBusy(false);
        await refreshStates();
      }
      return;
    }

    if (nextEnabled && locationDenied) {
      if (locationDeniedMessage) {
        showPermissionGuidePrompt("location", locationDeniedMessage);
      } else if (canOpenSystemSettings && twaPackageName) {
        openAndroidSystemSettings(
          twaPackageName,
          mapPermissionKindToTwaSettingsTarget("location"),
        );
      }
      return;
    }

    const locationPromise = enablePwaLocationAccess();
    setLocationBusy(true);
    setMessage(null);

    try {
      await locationPromise;
      setMessage("위치 사용을 켰습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "위치 설정에 실패했습니다.");
    } finally {
      setLocationBusy(false);
      await refreshStates();
    }
  }

  const rootClassName =
    layout === "toolbar"
      ? "site-pwa-app-settings-root site-pwa-app-settings-root--toolbar relative"
      : "site-pwa-app-settings-root fixed right-3 top-3 z-50 sm:right-4 sm:top-4";

  const triggerClassName =
    layout === "toolbar"
      ? "site-pwa-app-settings-trigger site-top-toolbar__button flex h-9 w-9 shrink-0 items-center justify-center"
      : "site-pwa-app-settings-trigger flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-black/45 text-white shadow-lg transition hover:bg-black/55";

  const panel = (
    <div className="site-pwa-app-settings__panel" role="dialog" aria-label="앱 설정">
      <div className="site-pwa-app-settings__panel-header">
        <p className="site-pwa-app-settings__panel-title">설정</p>
        <button
          type="button"
          className="site-pwa-app-settings__panel-close"
          onClick={() => setOpen(false)}
          aria-label="닫기"
        >
          닫기
        </button>
      </div>
      <div className="site-pwa-app-settings__panel-body">
        {showLab ? (
          <div className="site-pwa-app-settings__section">
            <p className="site-pwa-app-settings__section-label">실험실</p>
            {showFontSize ? (
              <SiteSizeRow
                value={prefs.font_size}
                scalePercent={prefs.site_scale_percent}
                onChange={(value) => {
                  applySiteScalePresetFromFontSize(value);
                  setPrefs(loadUserBetaSettings());
                }}
              />
            ) : null}
            {showDarkMode ? (
              <ToggleRow
                label="다크 모드"
                checked={prefs.dark_mode}
                onChange={(value) => updatePrefs({ dark_mode: value })}
                darkModeIcons
              />
            ) : null}
            {showPageBackground ? (
              <ToggleRow
                label="배경 뽀로롱"
                checked={effectivePageBackground}
                onChange={(value) => updatePrefs({ page_background: value })}
              />
            ) : null}
          </div>
        ) : null}
        {showCategoryRegion ? (
          <div
            className={`site-pwa-app-settings__section${
              showLab ? " site-pwa-app-settings__section--spaced" : ""
            }`}
          >
            <p className="site-pwa-app-settings__section-label">메인 화면</p>
            <ToggleRow
              label="카테고리·지역"
              checked={prefs.show_category_region ?? true}
              onChange={(value) => updatePrefs({ show_category_region: value })}
            />
          </div>
        ) : null}
        {showPermissions ? (
          <div
            className={`site-pwa-app-settings__section${
              showLab || showCategoryRegion ? " site-pwa-app-settings__section--spaced" : ""
            }`}
          >
            <p className="site-pwa-app-settings__section-label">앱 권한</p>
            {showNotification ? (
              <ToggleRow
                label={pushEnabled ? "푸시 알림" : "알림"}
                checked={notificationActive}
                onChange={handleNotificationToggle}
                disabled={notificationBusy}
                hint={notificationHint}
                useButtonTrigger
              />
            ) : null}
            {showLocation ? (
              <ToggleRow
                label="위치"
                checked={locationActive}
                onChange={(value) => void handleLocationToggle(value)}
                disabled={locationBusy || locationUnsupported}
                hint={locationHint}
                useButtonTrigger
              />
            ) : null}
          </div>
        ) : null}
        
        {memberLoggedIn ? (
          <div className="site-pwa-app-settings__section site-pwa-app-settings__section--spaced">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDeleteAccountConfirm(true);
              }}
              className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition"
            >
              회원 탈퇴
            </button>
            {deleteAccountMessage && (
              <p className="mt-2 text-xs text-red-600">{deleteAccountMessage}</p>
            )}
          </div>
        ) : null}
        
        {message ? <p className="site-pwa-app-settings__message">{message}</p> : null}
      </div>
    </div>
  );

  return (
    <div className={rootClassName}>
      <SitePwaPermissionPromptDialog
        open={permissionGuidePrompt !== null}
        title={permissionGuidePrompt?.kind === "location" ? "위치" : "알림"}
        message={permissionGuidePrompt?.message}
        primaryLabel={
          permissionGuidePrompt && canOpenSystemSettings && twaPackageName
            ? "설정 열기"
            : "확인"
        }
        secondaryLabel="닫기"
        onSecondary={closePermissionGuidePrompt}
        onPrimary={() => {
          if (!permissionGuidePrompt) {
            return;
          }

          if (canOpenSystemSettings && twaPackageName) {
            openPermissionGuideSettings(permissionGuidePrompt.kind);
            return;
          }

          closePermissionGuidePrompt();
        }}
      />
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={triggerClassName}
        aria-label="설정"
        title="설정"
        aria-expanded={open}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="설정 닫기"
            onClick={() => setOpen(false)}
          />
          {panel}
        </>
      ) : null}
      
      <DeleteAccountConfirmDialog
        open={deleteAccountConfirm && memberLoggedIn}
        busy={deletingAccount}
        onCancel={() => setDeleteAccountConfirm(false)}
        onConfirm={() => void handleDeleteAccount()}
      />
    </div>
  );
}
