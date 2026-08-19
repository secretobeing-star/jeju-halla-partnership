"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import SiteLoginModal from "@/components/SiteLoginModal";
import SiteToast from "@/components/SiteToast";
import { useStudentIdEntry } from "@/components/student/StudentIdProvider";
import { getBoardVoterKey } from "@/lib/board-voter";
import {
  clearSiteMemberSession,
  getSiteMemberSession,
  setSiteMemberSession,
  SITE_MEMBER_SESSION_EVENT,
  type SiteMemberStudentProfile,
} from "@/lib/site-member-session";
import { SITE_STUDENT_NEED_LOGIN_EVENT } from "@/lib/site-student-auth-settings";
import {
  getSitePushSubscription,
  isSitePushSubscribed,
  subscribeSitePush,
  unsubscribeSitePush,
} from "@/lib/site-push-client";
import type { SiteMemberFeaturesDisplay } from "@/lib/site-member-settings";
import type { SiteNotificationItem } from "@/lib/site-notifications-types";

function NotificationCloseIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function formatNotificationPublishedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type SiteHeaderActionsProps = {
  features: SiteMemberFeaturesDisplay;
  hidePushToggle?: boolean;
};

export default function SiteHeaderActions({
  features,
  hidePushToggle = false,
}: SiteHeaderActionsProps) {
  const {
    enabled: studentIdEnabled,
    authButtonLabel: studentAuthButtonLabel,
    studentIdLabel,
    cardTitle: studentCardTitle,
    openStudentId,
    startStudentAuth,
    continueAfterLogin,
    openStudentCardFromSession,
  } = useStudentIdEntry();
  const showNotifications = features.notificationsEnabled;
  const showPush = features.pushEnabled && !hidePushToggle;
  const [sessionName, setSessionName] = useState<string | null>(null);
  const loggedIn = Boolean(sessionName);
  const showStudentIdEntry = studentIdEnabled && loggedIn;
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginStatusMessage, setLoginStatusMessage] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SiteNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState<boolean | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [clientKey, setClientKey] = useState("");
  const [dismissingNotificationIds, setDismissingNotificationIds] = useState<string[]>([]);
  const [dismissingAll, setDismissingAll] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);
  const [mobileNotificationsLayout, setMobileNotificationsLayout] = useState(false);
  const notificationsRequestIdRef = useRef(0);
  const hasLoadedNotificationsRef = useRef(false);

  useEffect(() => {
    setClientKey(getBoardVoterKey());
  }, []);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    function syncLayout() {
      setMobileNotificationsLayout(mediaQuery.matches);
    }

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);
    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  const refreshSession = useCallback(() => {
    setSessionName(getSiteMemberSession()?.displayName ?? null);
  }, []);

  const loadNotifications = useCallback(
    async (options?: { showLoading?: boolean }) => {
      if (!showNotifications || !clientKey) {
        return;
      }

      const requestId = notificationsRequestIdRef.current + 1;
      notificationsRequestIdRef.current = requestId;
      const showLoading = options?.showLoading ?? !hasLoadedNotificationsRef.current;

      if (showLoading) {
        setNotificationsLoading(true);
      }

      try {
        const response = await fetch(
          `/api/notifications?client_key=${encodeURIComponent(clientKey)}`,
          { signal: AbortSignal.timeout(15_000) },
        );
        const body = (await response.json()) as {
          notifications?: SiteNotificationItem[];
          unreadCount?: number;
          error?: string;
        };

        if (notificationsRequestIdRef.current !== requestId) {
          return;
        }

        if (!response.ok) {
          throw new Error(body.error ?? "알림을 불러오지 못했습니다.");
        }

        setNotifications(body.notifications ?? []);
        setUnreadCount(body.unreadCount ?? 0);
        hasLoadedNotificationsRef.current = true;
      } catch (error) {
        if (notificationsRequestIdRef.current !== requestId) {
          return;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          setToastMessage("알림 요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
        } else {
          setToastMessage(error instanceof Error ? error.message : "알림을 불러오지 못했습니다.");
        }
      } finally {
        if (notificationsRequestIdRef.current === requestId) {
          setNotificationsLoading(false);
        }
      }
    },
    [clientKey, showNotifications],
  );

  const refreshPushState = useCallback(async () => {
    if (!showPush) {
      setPushSubscribed(null);
      return;
    }

    setPushSubscribed(await isSitePushSubscribed());
  }, [showPush]);

  useEffect(() => {
    refreshSession();
    window.addEventListener(SITE_MEMBER_SESSION_EVENT, refreshSession);
    return () => window.removeEventListener(SITE_MEMBER_SESSION_EVENT, refreshSession);
  }, [refreshSession]);

  useEffect(() => {
    function handleStudentNeedLogin() {
      if (!features.login.enabled) {
        startStudentAuth();
        return;
      }
      setLoginStatusMessage(null);
      setLoginOpen(true);
    }

    window.addEventListener(SITE_STUDENT_NEED_LOGIN_EVENT, handleStudentNeedLogin);
    return () => window.removeEventListener(SITE_STUDENT_NEED_LOGIN_EVENT, handleStudentNeedLogin);
  }, [features.login.enabled, startStudentAuth]);

  useEffect(() => {
    if (!showNotifications || !clientKey) {
      return undefined;
    }

    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications({ showLoading: false });
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [clientKey, showNotifications, loadNotifications]);

  useEffect(() => {
    if (showNotifications && notificationsOpen && clientKey) {
      void loadNotifications({ showLoading: !hasLoadedNotificationsRef.current });
      void refreshPushState();
    }
  }, [clientKey, notificationsOpen, refreshPushState, showNotifications, loadNotifications]);

  useEffect(() => {
    if (showPush) {
      void refreshPushState();
    }
  }, [showPush, refreshPushState]);

  async function markNotificationsRead(ids: string[]) {
    if (!clientKey || ids.length === 0) {
      return;
    }

    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_key: clientKey, notification_ids: ids }),
    }).catch(() => undefined);

    setNotifications((current) =>
      current.map((item) => (ids.includes(item.id) ? { ...item, read: true } : item)),
    );
    setUnreadCount((current) => Math.max(0, current - ids.length));
  }

  async function handleNotificationClick(item: SiteNotificationItem) {
    if (!item.read) {
      await markNotificationsRead([item.id]);
    }

    if (item.link_url) {
      window.open(item.link_url, "_blank", "noopener,noreferrer");
    }
  }

  async function dismissNotifications(ids: string[]) {
    if (!clientKey || ids.length === 0) {
      return;
    }

    const idSet = new Set(ids);
    const targets = notifications.filter((item) => idSet.has(item.id));
    const unreadRemoved = targets.filter((item) => !item.read).length;

    setNotifications((current) => current.filter((item) => !idSet.has(item.id)));
    if (unreadRemoved > 0) {
      setUnreadCount((current) => Math.max(0, current - unreadRemoved));
    }

    try {
      const response = await fetch("/api/notifications/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_key: clientKey, notification_ids: ids }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "알림을 삭제하지 못했습니다.");
      }
    } catch (error) {
      void loadNotifications({ showLoading: false });
      setToastMessage(error instanceof Error ? error.message : "알림을 삭제하지 못했습니다.");
    }
  }

  async function dismissNotification(id: string) {
    if (!clientKey || dismissingNotificationIds.includes(id) || dismissingAll) {
      return;
    }

    setDismissingNotificationIds((current) => [...current, id]);

    try {
      await dismissNotifications([id]);
    } finally {
      setDismissingNotificationIds((current) => current.filter((itemId) => itemId !== id));
    }
  }

  async function dismissAllNotifications() {
    if (!clientKey || dismissingAll || notifications.length === 0) {
      return;
    }

    const ids = notifications.map((item) => item.id);
    setDismissingAll(true);
    setDismissingNotificationIds(ids);

    try {
      await dismissNotifications(ids);
    } finally {
      setDismissingAll(false);
      setDismissingNotificationIds([]);
    }
  }

  async function handleStudentIdLogin(studentId: string) {
    setLoginLoading(true);
    setLoginStatusMessage(null);

    try {
      const response = await fetch("/api/member/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId.trim() }),
      });

      const body = (await response.json()) as {
        status?: string;
        message?: string;
        error?: string;
        session?: {
          provider: string;
          displayName: string;
          loggedInAt: string;
          student?: SiteMemberStudentProfile | null;
        };
      };

      if (body.status === "student" && body.session?.student) {
        setSiteMemberSession({
          provider: body.session.provider,
          displayName: body.session.displayName,
          loggedInAt: body.session.loggedInAt,
          student: body.session.student,
        });
        setLoginOpen(false);
        setToastMessage(`${body.session.displayName}님, 로그인되었습니다.`);
        // 세션 기록 직후 카드 오픈
        window.setTimeout(() => {
          openStudentCardFromSession();
        }, 0);
        return;
      }

      setLoginStatusMessage(
        body.message?.trim() ||
          body.error?.trim() ||
          features.login.statusNotice ||
          "학번을 확인하거나, 학생 인증을 먼저 신청해 주세요.",
      );
    } catch {
      setLoginStatusMessage(
        features.login.statusNotice ||
          "로그인 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleProviderLogin(previewName?: string) {
    setLoginLoading(true);
    setLoginStatusMessage(null);

    try {
      const response = await fetch("/api/member/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preview_name: previewName?.trim() ? previewName.trim() : undefined,
        }),
      });

      const body = (await response.json()) as {
        status?: string;
        message?: string;
        error?: string;
        session?: { provider: string; displayName: string; loggedInAt: string };
      };

      if (body.status === "preview" && body.session) {
        setSiteMemberSession({
          ...body.session,
          student: getSiteMemberSession()?.student ?? null,
        });
        setLoginOpen(false);
        setToastMessage(`${body.session.displayName}님, 미리보기 로그인되었습니다.`);
        continueAfterLogin();
        return;
      }

      if (!response.ok) {
        setLoginStatusMessage(
          body.message?.trim() ||
            body.error?.trim() ||
            features.login.statusNotice ||
            "로그인 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        );
        return;
      }

      if (body.status === "coming_soon" || body.message?.trim()) {
        setLoginStatusMessage(
          body.message?.trim() ||
            features.login.statusNotice ||
            "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }
    } catch {
      setLoginStatusMessage(
        features.login.statusNotice ||
          "로그인 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function handlePushToggle() {
    if (pushBusy) {
      return;
    }

    setPushBusy(true);
    try {
      const existing = await getSitePushSubscription();
      if (existing) {
        await unsubscribeSitePush(existing);
        setPushSubscribed(false);
        setToastMessage("푸시 알림을 껐습니다.");
        return;
      }

      if (Notification.permission === "denied") {
        setToastMessage("브라우저 알림 권한이 꺼져 있습니다. 사이트 설정에서 알림을 허용해 주세요.");
        setPushSubscribed(false);
        return;
      }

      await subscribeSitePush(clientKey);
      setPushSubscribed(true);
      setToastMessage("푸시 알림을 켰습니다.");
    } catch (error) {
      await refreshPushState();
      setToastMessage(error instanceof Error ? error.message : "푸시 설정에 실패했습니다.");
    } finally {
      setPushBusy(false);
    }
  }

  if (!features.login.enabled && !showNotifications) {
    return null;
  }

  function renderNotificationsPanel(
    panelClassName: string,
    options: { titleId: string; ariaModal: boolean },
  ) {
    return (
      <div
        role="dialog"
        aria-modal={options.ariaModal}
        aria-labelledby={options.titleId}
        className={panelClassName}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <p id={options.titleId} className="text-sm font-semibold text-gray-900">
            알림
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {notifications.length > 0 && !notificationsLoading ? (
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
                disabled={dismissingAll}
                onClick={() => void dismissAllNotifications()}
              >
                {dismissingAll ? "삭제 중..." : "전체 삭제"}
              </button>
            ) : null}
            <button
              type="button"
              className="site-header-actions__panel-close inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="알림 닫기"
              onClick={() => setNotificationsOpen(false)}
            >
              <NotificationCloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="site-header-actions__panel-body max-h-80 overflow-y-auto overscroll-contain">
          {notificationsLoading ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">불러오는 중...</p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">새 알림이 없습니다.</p>
          ) : (
            notifications.map((item) => {
              const profileUrl = item.icon_url ?? item.image_url;
              const largeImageUrl = item.image_url && item.icon_url ? item.image_url : null;
              const publishedAtLabel = formatNotificationPublishedAt(item.published_at);

              return (
                <div
                  key={item.id}
                  className={[
                    "site-notification-item border-b border-gray-100",
                    item.read ? "site-notification-item--read" : "site-notification-item--unread",
                  ].join(" ")}
                >
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => void handleNotificationClick(item)}
                      className="site-notification-item__button flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left transition"
                    >
                      {profileUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profileUrl}
                          alt=""
                          className="mt-0.5 h-11 w-11 shrink-0 rounded-full border border-gray-200 object-cover"
                        />
                      ) : null}
                      <span className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600">{item.body}</p>
                        {publishedAtLabel ? (
                          <time
                            dateTime={item.published_at}
                            className="mt-1.5 block text-[11px] text-gray-400"
                          >
                            {publishedAtLabel}
                          </time>
                        ) : null}
                        {largeImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={largeImageUrl}
                            alt=""
                            className="site-notification-image mt-2"
                          />
                        ) : null}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`${item.title} 알림 삭제`}
                      disabled={
                        dismissingAll || dismissingNotificationIds.includes(item.id)
                      }
                      onClick={() => void dismissNotification(item.id)}
                      className="site-header-actions__dismiss-btn shrink-0 self-center"
                    >
                      {dismissingNotificationIds.includes(item.id) ? (
                        <span className="text-xs text-gray-400" aria-hidden>
                          …
                        </span>
                      ) : (
                        <NotificationCloseIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {showPush ? (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-gray-500">
              <span>푸시 알림</span>
              <span className={pushSubscribed ? "font-semibold text-emerald-600" : "text-gray-400"}>
                {pushSubscribed == null ? "확인 중..." : pushSubscribed ? "켜짐" : "꺼짐"}
              </span>
            </div>
            <button
              type="button"
              disabled={pushBusy || pushSubscribed == null}
              onClick={() => void handlePushToggle()}
              className={[
                "w-full rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-60",
                pushSubscribed
                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              {pushBusy
                ? "처리 중..."
                : pushSubscribed
                  ? "푸시 알림 끄기"
                  : "푸시 알림 켜기"}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  const mobileNotificationsPortal =
    notificationsOpen && mobileNotificationsLayout && portalMounted
      ? createPortal(
          <>
            <button
              type="button"
              className="site-notifications-backdrop fixed inset-0 z-[120] bg-black/25"
              aria-label="알림 닫기"
              onClick={() => setNotificationsOpen(false)}
            />
            {renderNotificationsPanel(
              "site-header-actions__panel site-header-actions__panel--mobile fixed inset-x-3 bottom-3 z-[130] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl",
              { titleId: "site-notifications-panel-title-mobile", ariaModal: true },
            )}
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="site-header-actions flex flex-nowrap items-center gap-2">
        {showNotifications ? (
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label={unreadCount > 0 ? `알림 ${unreadCount}개` : "알림"}
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((open) => !open);
              }}
              className="site-header-actions__bell site-top-toolbar__button inline-flex h-9 w-9 shrink-0 items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {unreadCount > 0 ? (
                <span className="site-header-actions__badge absolute -right-1 -top-1 min-w-[1.1rem] rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>

            {notificationsOpen && !mobileNotificationsLayout
              ? renderNotificationsPanel(
                  "site-header-actions__panel absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl",
                  { titleId: "site-notifications-panel-title", ariaModal: false },
                )
              : null}
          </div>
        ) : null}

        {showStudentIdEntry ? (
          <>
            <button
              type="button"
              aria-label={studentCardTitle}
              onClick={() => openStudentId()}
              className="site-header-actions__student-id site-top-toolbar__button inline-flex h-9 w-9 shrink-0 items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <circle cx="8.5" cy="12" r="2.5" />
                <path d="M14 10h5" />
                <path d="M14 14h4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                clearSiteMemberSession();
                setToastMessage("로그아웃되었습니다.");
              }}
              className="site-header-actions__logout site-top-toolbar__button inline-flex h-9 shrink-0 items-center px-3 text-sm font-medium"
            >
              로그아웃
            </button>
          </>
        ) : null}

        {features.login.enabled && !showStudentIdEntry ? (
          <button
            type="button"
            onClick={() => {
              setLoginStatusMessage(null);
              setLoginOpen(true);
            }}
            className="site-header-actions__login site-top-toolbar__button inline-flex h-9 shrink-0 items-center px-3 text-sm font-medium"
          >
            {sessionName ?? features.login.buttonLabel}
          </button>
        ) : null}
      </div>

      {features.login.enabled ? (
        <SiteLoginModal
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          loginDisplay={features.login}
          loggedInName={sessionName}
          loading={loginLoading}
          statusMessage={loginStatusMessage}
          onLoginPreview={(name) => handleProviderLogin(name)}
          onStudentIdLogin={(studentId) => handleStudentIdLogin(studentId)}
          onLogout={() => {
            clearSiteMemberSession();
            setLoginOpen(false);
            setToastMessage("로그아웃되었습니다.");
          }}
          showStudentAuth={studentIdEnabled}
          studentAuthButtonLabel={studentAuthButtonLabel}
          studentIdLabel={studentIdLabel}
          studentIdLoginEnabled={studentIdEnabled}
          onStartStudentAuth={() => {
            setLoginOpen(false);
            startStudentAuth();
          }}
        />
      ) : null}

      <SiteToast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      {mobileNotificationsPortal}
    </>
  );
}
