"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import SiteToast from "@/components/SiteToast";
import { isStandaloneDisplayMode } from "@/lib/site-pwa";
import {
  installSoftKeyboardGuard,
  isTextEntryActive,
  isTextEntryElement,
  markTextEntryInteraction,
} from "@/lib/text-entry";

export const MAX_PWA_BACK_EXIT_TIMEOUT_MS = 5000;
export const DEFAULT_PWA_BACK_EXIT_TIMEOUT_MS = 2000;

const BACK_EXIT_SETTINGS_CACHE_KEY = "site_pwa_back_exit_settings_v1";

export type SitePwaBackExitSettingsSource = {
  site_pwa_back_exit_enabled?: boolean;
  site_pwa_back_exit_message?: string | null;
  site_pwa_back_exit_timeout_ms?: number | null;
  site_pwa_back_exit_popup_enabled?: boolean;
  site_pwa_back_exit_popup_title?: string | null;
  site_pwa_back_exit_popup_message?: string | null;
  site_pwa_loading_back_exit_enabled?: boolean;
};

let backExitSettings: SitePwaBackExitSettingsSource = {};
let loadingSplashHoldCount = 0;
let loadingSplashActive = false;
let backExitCacheHydrated = false;

function notifyBackExitSettingsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("site-app-back-settings-change"));
  }
}

function setLoadingSplashActive(next: boolean) {
  if (loadingSplashActive === next) {
    return;
  }
  loadingSplashActive = next;
  notifyBackExitSettingsChanged();
}

export function normalizePwaBackExitTimeoutMs(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return DEFAULT_PWA_BACK_EXIT_TIMEOUT_MS;
  }

  return Math.max(500, Math.min(MAX_PWA_BACK_EXIT_TIMEOUT_MS, Math.round(value)));
}

export function readCachedSiteAppBackExitSettings(): SitePwaBackExitSettingsSource | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(BACK_EXIT_SETTINGS_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as SitePwaBackExitSettingsSource;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function cacheSiteAppBackExitSettings(settings: SitePwaBackExitSettingsSource) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: SitePwaBackExitSettingsSource = {
      site_pwa_back_exit_enabled: settings.site_pwa_back_exit_enabled ?? false,
      site_pwa_back_exit_message: settings.site_pwa_back_exit_message?.trim() || null,
      site_pwa_back_exit_timeout_ms: normalizePwaBackExitTimeoutMs(
        settings.site_pwa_back_exit_timeout_ms,
      ),
      site_pwa_back_exit_popup_enabled: settings.site_pwa_back_exit_popup_enabled ?? false,
      site_pwa_back_exit_popup_title: settings.site_pwa_back_exit_popup_title?.trim() || null,
      site_pwa_back_exit_popup_message: settings.site_pwa_back_exit_popup_message?.trim() || null,
      site_pwa_loading_back_exit_enabled: settings.site_pwa_loading_back_exit_enabled ?? false,
    };
    localStorage.setItem(BACK_EXIT_SETTINGS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

/** 설정 로드 전에도 직전 종료 옵션을 쓰도록 캐시를 한 번 반영 */
export function hydrateSiteAppBackExitSettingsFromCache() {
  if (backExitCacheHydrated || typeof window === "undefined") {
    return Boolean(
      backExitSettings.site_pwa_back_exit_enabled ||
        backExitSettings.site_pwa_loading_back_exit_enabled,
    );
  }

  backExitCacheHydrated = true;
  const cached = readCachedSiteAppBackExitSettings();
  if (!cached) {
    return false;
  }

  backExitSettings = cached;
  notifyBackExitSettingsChanged();
  return true;
}

export function syncSiteAppBackExitSettings(
  settings: SitePwaBackExitSettingsSource,
  options?: { persist?: boolean },
) {
  backExitSettings = settings;
  backExitCacheHydrated = true;
  if (options?.persist !== false) {
    cacheSiteAppBackExitSettings(settings);
  }
  notifyBackExitSettingsChanged();
}

/** 앱 로딩 스플래시 표시 여부 — 로딩 전용 뒤로가기 종료에 사용 (ref-count) */
export function acquireSiteAppBackLoadingSplash() {
  loadingSplashHoldCount += 1;
  setLoadingSplashActive(true);
}

export function releaseSiteAppBackLoadingSplash() {
  loadingSplashHoldCount = Math.max(0, loadingSplashHoldCount - 1);
  if (loadingSplashHoldCount > 0) {
    setLoadingSplashActive(true);
    return;
  }

  // early→main 스플래시 전환 한 틱 동안 꺼지지 않게 지연
  queueMicrotask(() => {
    if (loadingSplashHoldCount === 0) {
      setLoadingSplashActive(false);
    }
  });
}

function resolveBackExitSettings() {
  return backExitSettings;
}

export function isSiteAppBackLoadingSplashActive() {
  return loadingSplashActive;
}

function isExitEnabledForContext(settings: SitePwaBackExitSettingsSource) {
  if (!isStandaloneDisplayMode()) {
    return false;
  }

  const mainExit = settings.site_pwa_back_exit_enabled ?? false;
  const loadingExit = settings.site_pwa_loading_back_exit_enabled ?? false;

  if (loadingSplashActive) {
    return loadingExit || mainExit;
  }

  return mainExit;
}

/** Next.js App Router history state를 지우지 않고 우리 키만 합침 (새로고침 방지) */
function mergeHistoryState(
  patch: Record<string, unknown>,
  options?: { removeKeys?: string[] },
) {
  const current = window.history.state;
  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};

  for (const key of options?.removeKeys ?? []) {
    delete base[key];
  }

  return { ...base, ...patch };
}

function pushAppHistoryState(patch: Record<string, unknown>) {
  window.history.pushState(mergeHistoryState(patch), "", window.location.href);
}

function replaceAppHistoryState(
  patch: Record<string, unknown>,
  options?: { removeKeys?: string[] },
) {
  window.history.replaceState(
    mergeHistoryState(patch, options),
    "",
    window.location.href,
  );
}

export const DEFAULT_PWA_BACK_EXIT_MESSAGE = "한 번 더 누르면 종료됩니다";

function resolveExitToastMessage(message: string | null | undefined) {
  const trimmed = message?.trim();
  return trimmed || DEFAULT_PWA_BACK_EXIT_MESSAGE;
}

/** PWA/TWA에서 앱을 닫기 시도 — close 실패 시 히스토리를 비워 뒤로가기로 종료 */
function attemptStandaloneAppExit(onStillVisible?: () => void) {
  if (typeof window === "undefined") {
    return;
  }

  const tryClose = () => {
    try {
      window.close();
    } catch {
      // ignore
    }
  };

  tryClose();

  // pushState로 쌓인 가드·모달 엔트리를 한꺼번에 되돌린 뒤, 한 번 더 back 하면
  // Android Chrome PWA/WebAPK가 시작 이전으로 나가며 종료됩니다.
  const backSteps = Math.max(1, window.history.length - 1);
  try {
    window.history.go(-backSteps);
  } catch {
    try {
      window.history.back();
    } catch {
      // ignore
    }
  }

  window.setTimeout(() => {
    if (typeof document === "undefined" || document.visibilityState !== "visible") {
      return;
    }

    tryClose();

    try {
      window.history.back();
    } catch {
      // ignore
    }
  }, 60);

  window.setTimeout(() => {
    if (typeof document === "undefined" || document.visibilityState !== "visible") {
      return;
    }

    tryClose();

    try {
      const ua = navigator.userAgent || "";
      if (/Android/i.test(ua)) {
        // Android: 홈 화면으로 보내 앱 태스크에서 벗어남
        window.location.href =
          "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.HOME;end";
        return;
      }
      window.open("about:blank", "_self");
      tryClose();
    } catch {
      // ignore
    }
  }, 180);

  window.setTimeout(() => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      onStillVisible?.();
    }
  }, 900);
}

type AppBackHandler = {
  id: string;
  close: () => void;
};

type AppBackStackContextValue = {
  register: (handler: AppBackHandler) => void;
  unregister: (id: string) => void;
};

const AppBackStackContext = createContext<AppBackStackContextValue | null>(null);

type SiteAppBackProviderProps = {
  children: ReactNode;
};

export function SiteAppBackProvider({ children }: SiteAppBackProviderProps) {
  const handlersRef = useRef<AppBackHandler[]>([]);
  const closingFromPopStateRef = useRef(false);
  const exitArmedRef = useRef(false);
  const lastExitPressRef = useRef(0);
  const exitGuardPushedRef = useRef(false);
  const exitingAppRef = useRef(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [exitPopupOpen, setExitPopupOpen] = useState(false);
  const exitPopupOpenRef = useRef(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    exitPopupOpenRef.current = exitPopupOpen;
  }, [exitPopupOpen]);

  const settings = resolveBackExitSettings();
  const exitEnabled = isExitEnabledForContext(settings);
  const exitMessage = settings.site_pwa_back_exit_message?.trim() || null;
  const exitTimeoutMs = normalizePwaBackExitTimeoutMs(settings.site_pwa_back_exit_timeout_ms);

  const register = useCallback((handler: AppBackHandler) => {
    const existingIndex = handlersRef.current.findIndex((entry) => entry.id === handler.id);
    if (existingIndex >= 0) {
      handlersRef.current[existingIndex] = handler;
      return;
    }

    handlersRef.current.push(handler);
    pushAppHistoryState({ appBackModal: handler.id });
  }, []);

  const ensureExitGuard = useCallback(() => {
    const currentSettings = resolveBackExitSettings();
    const exitEnabledNow = isExitEnabledForContext(currentSettings);

    if (!exitEnabledNow || exitingAppRef.current) {
      return;
    }

    if (!exitGuardPushedRef.current && handlersRef.current.length === 0) {
      pushAppHistoryState({ appBackExitGuard: true });
      exitGuardPushedRef.current = true;
    }
  }, []);

  const unregister = useCallback(
    (id: string) => {
      const hadHandler = handlersRef.current.some((entry) => entry.id === id);
      if (!hadHandler) {
        return;
      }

      handlersRef.current = handlersRef.current.filter((entry) => entry.id !== id);

      // 종료·popstate 처리 중에는 history를 건드리지 않음
      if (exitingAppRef.current || closingFromPopStateRef.current) {
        if (closingFromPopStateRef.current && !exitingAppRef.current) {
          queueMicrotask(() => {
            ensureExitGuard();
          });
        }
        return;
      }

      // 버튼/오버레이로 닫을 때 history.back() 대신 replace — Next state 유지
      if (window.history.state?.appBackModal === id) {
        if (handlersRef.current.length > 0) {
          const top = handlersRef.current[handlersRef.current.length - 1];
          replaceAppHistoryState(
            { appBackModal: top.id },
            { removeKeys: ["appBackExitGuard"] },
          );
        } else if (isExitEnabledForContext(resolveBackExitSettings())) {
          replaceAppHistoryState(
            { appBackExitGuard: true },
            { removeKeys: ["appBackModal"] },
          );
          exitGuardPushedRef.current = true;
        } else {
          replaceAppHistoryState({}, { removeKeys: ["appBackModal", "appBackExitGuard"] });
          exitGuardPushedRef.current = false;
        }
        return;
      }

      queueMicrotask(() => {
        ensureExitGuard();
      });
    },
    [ensureExitGuard],
  );

  const recoverExitGuard = useCallback(() => {
    exitingAppRef.current = false;
    exitArmedRef.current = false;
    lastExitPressRef.current = 0;
    exitGuardPushedRef.current = false;
    exitPopupOpenRef.current = false;
    setExitPopupOpen(false);
    ensureExitGuard();
  }, [ensureExitGuard]);

  const runExit = useCallback(() => {
    if (exitingAppRef.current) {
      return;
    }

    exitingAppRef.current = true;
    exitArmedRef.current = false;
    lastExitPressRef.current = 0;
    exitGuardPushedRef.current = false;
    exitPopupOpenRef.current = false;
    setToastMessage(null);

    // 종료 팝업은 히스토리 모달로 등록하지 않음
    setExitPopupOpen(false);

    attemptStandaloneAppExit(recoverExitGuard);
  }, [recoverExitGuard]);

  const closeExitPopup = useCallback(() => {
    exitPopupOpenRef.current = false;
    setExitPopupOpen(false);
    exitArmedRef.current = false;
    lastExitPressRef.current = 0;
    // 히스토리는 건드리지 않음 — 열 때 이미 exitGuard를 다시 push 해 둠
    queueMicrotask(() => {
      ensureExitGuard();
    });
  }, [ensureExitGuard]);

  const armFirstExitPress = useCallback((options?: { showToast?: boolean }) => {
    const currentSettings = resolveBackExitSettings();
    const exitMessageNow = resolveExitToastMessage(currentSettings.site_pwa_back_exit_message);
    const popupEnabled = currentSettings.site_pwa_back_exit_popup_enabled ?? false;
    const showToast = options?.showToast ?? true;

    if (popupEnabled) {
      setToastMessage(null);
      exitPopupOpenRef.current = true;
      setExitPopupOpen(true);
      // 팝업 모드: 두 번 뒤로가기로 종료하지 않고 「종료하기」로만 나감
      exitArmedRef.current = false;
      lastExitPressRef.current = 0;
      return;
    }

    if (showToast) {
      setToastMessage(exitMessageNow);
    }

    exitArmedRef.current = true;
    lastExitPressRef.current = Date.now();
  }, []);

  const handleExitPress = useCallback(
    (options?: { restoreHistoryGuard?: boolean; showToast?: boolean }) => {
      const currentSettings = resolveBackExitSettings();
      const exitEnabledNow = isExitEnabledForContext(currentSettings);
      if (!exitEnabledNow || exitingAppRef.current) {
        return false;
      }

      const popupEnabled = currentSettings.site_pwa_back_exit_popup_enabled ?? false;
      if (popupEnabled) {
        if (exitPopupOpenRef.current) {
          // 팝업이 열린 채 뒤로가기 → 닫기만 (새로고침/종료 없음)
          closeExitPopup();
          if (options?.restoreHistoryGuard !== false) {
            pushAppHistoryState({ appBackExitGuard: true });
            exitGuardPushedRef.current = true;
          }
          return true;
        }
        armFirstExitPress({ showToast: false });
        if (options?.restoreHistoryGuard !== false) {
          pushAppHistoryState({ appBackExitGuard: true });
          exitGuardPushedRef.current = true;
        }
        return true;
      }

      const exitTimeoutNow = normalizePwaBackExitTimeoutMs(
        currentSettings.site_pwa_back_exit_timeout_ms,
      );
      const now = Date.now();

      if (exitArmedRef.current && now - lastExitPressRef.current <= exitTimeoutNow) {
        runExit();
        return true;
      }

      armFirstExitPress({ showToast: options?.showToast });

      if (options?.restoreHistoryGuard !== false) {
        pushAppHistoryState({ appBackExitGuard: true });
        exitGuardPushedRef.current = true;
      }

      return true;
    },
    [armFirstExitPress, closeExitPopup, runExit],
  );

  useLayoutEffect(() => {
    hydrateSiteAppBackExitSettingsFromCache();
  }, []);

  useEffect(() => {
    const syncExitGuard = () => {
      const currentSettings = resolveBackExitSettings();
      const exitEnabledNow = isExitEnabledForContext(currentSettings);

      if (!exitEnabledNow) {
        exitArmedRef.current = false;
        lastExitPressRef.current = 0;
        // exitGuardPushedRef는 유지 — 스플래시 전환 등으로 잠깐 꺼져도
        // 히스토리 가드 엔트리는 남아 있을 수 있음
        exitingAppRef.current = false;
        exitPopupOpenRef.current = false;
        setExitPopupOpen(false);
        return;
      }

      ensureExitGuard();
    };

    syncExitGuard();

    const handlePopState = () => {
      if (exitingAppRef.current) {
        return;
      }

      if (closingFromPopStateRef.current) {
        closingFromPopStateRef.current = false;
        return;
      }

      // 종료 팝업이 열린 상태의 뒤로가기 → 닫기만 (모달 pushState 없음)
      if (exitPopupOpenRef.current && handlersRef.current.length === 0) {
        handleExitPress({ restoreHistoryGuard: true, showToast: false });
        return;
      }

      // 로딩 스플래시에서는 visualViewport 오탐으로 키보드 가드가 뒤로가기를 삼키지 않게 함
      if (isTextEntryActive() && !loadingSplashActive) {
        const top = handlersRef.current[handlersRef.current.length - 1];
        if (top) {
          pushAppHistoryState({ appBackModal: top.id });
          return;
        }

        if (isExitEnabledForContext(resolveBackExitSettings())) {
          pushAppHistoryState({ appBackExitGuard: true });
          exitGuardPushedRef.current = true;
        }
        return;
      }

      const top = handlersRef.current.pop();
      if (top) {
        closingFromPopStateRef.current = true;
        try {
          top.close();
        } finally {
          closingFromPopStateRef.current = false;
        }
        window.queueMicrotask(() => {
          ensureExitGuard();
        });
        return;
      }

      handleExitPress({ restoreHistoryGuard: true, showToast: true });
    };

    const handleSettingsChange = () => {
      syncExitGuard();
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("site-app-back-settings-change", handleSettingsChange);

    const uninstallKeyboardGuard = installSoftKeyboardGuard();

    const markTextEntry = (event: Event) => {
      if (isTextEntryElement(event.target)) {
        markTextEntryInteraction();
      }
    };

    document.addEventListener("focusin", markTextEntry, true);
    document.addEventListener("touchstart", markTextEntry, true);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("site-app-back-settings-change", handleSettingsChange);
      document.removeEventListener("focusin", markTextEntry, true);
      document.removeEventListener("touchstart", markTextEntry, true);
      uninstallKeyboardGuard();
    };
  }, [ensureExitGuard, exitEnabled, exitMessage, exitTimeoutMs, handleExitPress]);

  const value = useMemo(() => ({ register, unregister }), [register, unregister]);

  const currentSettings = resolveBackExitSettings();
  const popupTitle = currentSettings.site_pwa_back_exit_popup_title?.trim() || "";
  const popupMessage = currentSettings.site_pwa_back_exit_popup_message?.trim() || "";

  return (
    <AppBackStackContext.Provider value={value}>
      {children}
      <SiteToast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      <SiteAppBackExitPopup
        open={exitPopupOpen}
        title={popupTitle}
        message={popupMessage}
        onClose={closeExitPopup}
        onExit={runExit}
        portalTarget={portalTarget}
      />
    </AppBackStackContext.Provider>
  );
}

function SiteAppBackExitPopup({
  open,
  title,
  message,
  onClose,
  onExit,
  portalTarget,
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onExit: () => void;
  portalTarget: HTMLElement | null;
}) {
  // 종료 팝업은 useAppBackHandler(pushState)를 쓰지 않음.
  // 닫을 때 history.back/모달 unregister가 페이지 새로고침처럼 보이던 원인.

  if (!open || !portalTarget) {
    return null;
  }

  return createPortal(
    <div className="app-prompt-overlay" role="presentation" onClick={onClose}>
      <div
        className="app-prompt-dialog app-prompt-dialog--alert"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="site-pwa-back-exit-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        {title ? (
          <h2 id="site-pwa-back-exit-popup-title" className="app-prompt-title">
            {title}
          </h2>
        ) : (
          <span id="site-pwa-back-exit-popup-title" className="sr-only">
            앱 종료 안내
          </span>
        )}
        {message ? <p className="app-prompt-description">{message}</p> : null}
        <div className="app-prompt-actions">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
            className="app-prompt-button app-prompt-button--cancel"
          >
            취소
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onExit();
            }}
            className="app-prompt-button app-prompt-button--confirm"
          >
            종료하기
          </button>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}

export function useAppBackStack() {
  const context = useContext(AppBackStackContext);
  if (!context) {
    throw new Error("useAppBackStack must be used within SiteAppBackProvider");
  }

  return context;
}

export function useAppBackHandler(open: boolean, onClose: () => void, id: string) {
  const context = useContext(AppBackStackContext);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!context) {
      return;
    }

    const { register, unregister } = context;

    if (!open) {
      unregister(id);
      return;
    }

    register({
      id,
      close: () => onCloseRef.current(),
    });

    return () => {
      unregister(id);
    };
  }, [context, id, open]);
}
