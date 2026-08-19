"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import EventComments from "@/components/EventComments";
import PopupNavChevron from "@/components/PopupNavChevron";
import SiteToast from "@/components/SiteToast";
import { useAppBackHandler } from "@/lib/app-back-stack";
import { getTabGridClass } from "@/lib/board-definitions";
import { getPopupListNavigation } from "@/lib/popup-list-navigation";
import {
  formatSiteEventDateRange,
  resolveSiteEventBoardFilter,
  SITE_EVENT_BOARD_FILTERS,
  type SiteEventBoardFilter,
} from "@/lib/site-events";
import {
  hasUnreadSiteEvents,
  markSiteEventsNavSeen,
} from "@/lib/site-events-nav-new-badge";
import { usePopupSwipeNavigation } from "@/lib/use-popup-swipe-navigation";
import type { SiteEventWithTabs, SiteSettings } from "@/lib/supabase";
import {
  DEFAULT_PARTNER_HIDDEN_REVIEW_MESSAGE,
  DEFAULT_PARTNER_HIDDEN_REVIEW_TITLE,
  type HiddenReviewDisplay,
} from "@/lib/partner-hidden-review";
import { getSiteMemberSession } from "@/lib/site-member-session";

type SiteEventsBoardSectionProps = {
  events: SiteEventWithTabs[];
  iconUrl?: string | null;
  label?: string | null;
  hint?: string | null;
  notifyMessage?: string | null;
  hintsEnabled?: boolean;
  notifyEnabled?: boolean;
  reportReasons?: string[];
  reportSuccessSettings?: Partial<SiteSettings> | null;
  hiddenCommentDisplay?: HiddenReviewDisplay;
};

// 절대 UI를 멈추지 않는 안전한 백그라운드 로거
function sendEventLog(eventId: string) {
  if (typeof window === "undefined") return;
  try {
    const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_WEBHOOK_URL;
    if (!webhookUrl) return;

    let studentId = "비회원";
    try {
      const session = getSiteMemberSession?.();
      studentId = session?.student?.studentId?.trim() || "비회원";
    } catch {
      studentId = "비회원";
    }

    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "LOG_EVENT",
        eventId: eventId,
        userId: studentId,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  } catch {
    // 로깅 실패가 본 UI 렌더링에 영향을 주지 않도록 완벽 격리
  }
}

function EventIcon({ className = "h-5 w-5" }: { className?: string }) {
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
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
    </svg>
  );
}

export default function SiteEventsBoardSection({
  events,
  iconUrl = null,
  label = null,
  hint = null,
  notifyMessage = null,
  hintsEnabled = true,
  notifyEnabled = true,
  reportReasons = [],
  reportSuccessSettings = null,
  hiddenCommentDisplay = {
    title: DEFAULT_PARTNER_HIDDEN_REVIEW_TITLE,
    message: DEFAULT_PARTNER_HIDDEN_REVIEW_MESSAGE,
  },
}: SiteEventsBoardSectionProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [boardFilter, setBoardFilter] = useState<SiteEventBoardFilter>("ongoing");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [hasNewEvents, setHasNewEvents] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleEvents = useMemo(
    () =>
      events.filter(
        (event) => event.is_active && event.tabs.some((tab) => tab.is_active),
      ),
    [events],
  );

  useEffect(() => {
    setHasNewEvents(hasUnreadSiteEvents(visibleEvents));
  }, [visibleEvents]);

  const filteredEvents = useMemo(() => {
    const nowMs = Date.now();
    return visibleEvents.filter(
      (event) => resolveSiteEventBoardFilter(event, nowMs) === boardFilter,
    );
  }, [boardFilter, visibleEvents]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) {
      return null;
    }
    return visibleEvents.find((event) => event.id === selectedEventId) ?? null;
  }, [selectedEventId, visibleEvents]);

  const visibleTabs = useMemo(
    () => (selectedEvent?.tabs ?? []).filter((tab) => tab.is_active),
    [selectedEvent],
  );

  const activeTab = useMemo(() => {
    if (!visibleTabs.length) {
      return null;
    }
    return visibleTabs.find((tab) => tab.id === activeTabId) ?? visibleTabs[0];
  }, [activeTabId, visibleTabs]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const openModal = useCallback(() => {
    if (!visibleEvents.length) {
      return;
    }
    markSiteEventsNavSeen();
    setHasNewEvents(false);
    setSelectedEventId(null);
    setActiveTabId(null);
    setBoardFilter("ongoing");
    setOpen(true);
  }, [visibleEvents]);

  useEffect(() => {
    function onOpenRequest() {
      openModal();
    }
    window.addEventListener("site-events-open", onOpenRequest);
    return () => window.removeEventListener("site-events-open", onOpenRequest);
  }, [openModal]);

  const resolvedLabel = label?.trim() || "이벤트";
  const resolvedHint = hint?.trim() || resolvedLabel;
  const resolvedNotify = useMemo(() => {
    if (!notifyEnabled) {
      return null;
    }
    const custom = notifyMessage?.trim();
    if (custom) {
      return custom;
    }
    return `${resolvedLabel}을(를) 엽니다`;
  }, [notifyEnabled, notifyMessage, resolvedLabel]);

  const handleChipActivate = useCallback(() => {
    if (resolvedNotify) {
      setToastMessage(resolvedNotify);
    }
    if (hintsEnabled) {
      setHintVisible(true);
      window.setTimeout(() => setHintVisible(false), 1600);
    }
    
    // 오픈 로그 전송 (비동기 안전 처리)
    sendEventLog("SITE_EVENTS_OPEN");

    openModal();
  }, [hintsEnabled, openModal, resolvedNotify]);

  const dismissToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const openEventDetail = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
    setActiveTabId(null);

    // 상세 클릭 로그 전송 (비동기 안전 처리)
    sendEventLog(eventId);
  }, []);

  const backToList = useCallback(() => {
    setSelectedEventId(null);
    setActiveTabId(null);
  }, []);

  const showDetail = Boolean(selectedEvent);
  const listNavigation = useMemo(
    () => getPopupListNavigation(filteredEvents, selectedEventId),
    [filteredEvents, selectedEventId],
  );
  const filterIndex = SITE_EVENT_BOARD_FILTERS.findIndex((filter) => filter.id === boardFilter);
  const navigationSummary =
    showDetail && listNavigation.total > 0
      ? `${listNavigation.index + 1} / ${listNavigation.total}`
      : null;

  const goPreviousEvent = useCallback(() => {
    if (!listNavigation.previous) {
      return;
    }
    setSelectedEventId(listNavigation.previous.id);
    setActiveTabId(null);
  }, [listNavigation.previous]);

  const goNextEvent = useCallback(() => {
    if (!listNavigation.next) {
      return;
    }
    setSelectedEventId(listNavigation.next.id);
    setActiveTabId(null);
  }, [listNavigation.next]);

  const goPreviousFilter = useCallback(() => {
    if (filterIndex <= 0) {
      return;
    }
    setBoardFilter(SITE_EVENT_BOARD_FILTERS[filterIndex - 1].id);
  }, [filterIndex]);

  const goNextFilter = useCallback(() => {
    if (filterIndex < 0 || filterIndex >= SITE_EVENT_BOARD_FILTERS.length - 1) {
      return;
    }
    setBoardFilter(SITE_EVENT_BOARD_FILTERS[filterIndex + 1].id);
  }, [filterIndex]);

  const detailNavEnabled = showDetail && listNavigation.total > 1;
  const swipeEnabled = open && (showDetail ? detailNavEnabled : SITE_EVENT_BOARD_FILTERS.length > 1);
  const swipeTargetRef = usePopupSwipeNavigation({
    enabled: swipeEnabled,
    hasPrevious: showDetail ? listNavigation.hasPrevious : filterIndex > 0,
    hasNext: showDetail
      ? listNavigation.hasNext
      : filterIndex >= 0 && filterIndex < SITE_EVENT_BOARD_FILTERS.length - 1,
    onPrevious: showDetail ? goPreviousEvent : goPreviousFilter,
    onNext: showDetail ? goNextEvent : goNextFilter,
  });

  useEffect(() => {
    if (!open || !selectedEvent) {
      return;
    }
    if (!visibleTabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(visibleTabs[0]?.id ?? null);
    }
  }, [activeTabId, open, selectedEvent, visibleTabs]);

  useEffect(() => {
    if (!open || !selectedEventId) {
      return;
    }
    if (!filteredEvents.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(null);
      setActiveTabId(null);
    }
  }, [filteredEvents, open, selectedEventId]);

  useAppBackHandler(open, close, "site-events-modal");
  useAppBackHandler(open && showDetail, backToList, "site-events-detail");

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.classList.add("site-event-open");
    document.body.style.overflow = "hidden";

    return () => {
      document.body.classList.remove("site-event-open");
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (showDetail) {
          goPreviousEvent();
        } else {
          goPreviousFilter();
        }
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (showDetail) {
          goNextEvent();
        } else {
          goNextFilter();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    open,
    showDetail,
    goPreviousEvent,
    goNextEvent,
    goPreviousFilter,
    goNextFilter,
  ]);

  if (!visibleEvents.length) {
    return null;
  }

  const resolvedIconUrl = iconUrl?.trim() || "";
  const tabGridClass = getTabGridClass(visibleTabs.length);

  const modal =
    open && mounted
      ? createPortal(
          <div className="site-event-overlay" role="presentation" onClick={close}>
            <div className="site-event-nav-slot site-event-nav-slot--prev">
              {detailNavEnabled && listNavigation.hasPrevious ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goPreviousEvent();
                  }}
                  className="board-post-popup-nav board-post-popup-nav--prev"
                  aria-label="이전 이벤트"
                >
                  <PopupNavChevron direction="prev" />
                </button>
              ) : detailNavEnabled ? (
                <span className="board-post-popup-nav-spacer" aria-hidden />
              ) : null}
            </div>

            <div
              ref={swipeTargetRef}
              className={[
                "site-event-dialog",
                swipeEnabled ? "site-event-dialog--swipeable" : "",
                detailNavEnabled ? "site-event-dialog--with-list-nav" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="dialog"
              aria-modal="true"
              aria-label={resolvedLabel}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="site-event-dialog__header">
                <div className="min-w-0 flex-1">
                  {showDetail ? (
                    <button type="button" onClick={backToList} className="site-event-back">
                      ← 목록
                    </button>
                  ) : null}
                  <h2 className="site-event-dialog__title">
                    {showDetail ? selectedEvent?.title || resolvedLabel : resolvedLabel}
                  </h2>
                  {showDetail && selectedEvent?.description?.trim() ? (
                    <p className="site-event-dialog__desc">{selectedEvent.description.trim()}</p>
                  ) : null}
                  {showDetail ? (
                    <p className="site-event-dialog__range">
                      {formatSiteEventDateRange(selectedEvent?.starts_at, selectedEvent?.ends_at) ||
                        "기간 미정"}
                    </p>
                  ) : null}
                </div>
                {navigationSummary ? (
                  <p className="site-event-dialog__nav-summary">{navigationSummary}</p>
                ) : null}
                <button
                  type="button"
                  onClick={close}
                  className="site-event-close"
                  aria-label="이벤트 닫기"
                >
                  ×
                </button>
              </div>

              {!showDetail ? (
                <>
                  <div className="site-event-board-filters" role="tablist" aria-label="이벤트 분류">
                    {SITE_EVENT_BOARD_FILTERS.map((filter) => {
                      const isActive = boardFilter === filter.id;
                      return (
                        <button
                          key={filter.id}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setBoardFilter(filter.id)}
                          className={`site-event-board-filters__btn${
                            isActive ? " site-event-board-filters__btn--active" : ""
                          }`}
                        >
                          {filter.label}
                        </button>
                      );
                    })}
                  </div>

                  {filteredEvents.length ? (
                    <div className="site-event-card-grid">
                      {filteredEvents.map((event) => {
                        const range = formatSiteEventDateRange(event.starts_at, event.ends_at);
                        const thumb = event.thumbnail_url?.trim() || "";
                        return (
                          <button
                            key={event.id}
                            type="button"
                            className="site-event-card"
                            onClick={() => openEventDetail(event.id)}
                          >
                            <span className="site-event-card__thumb">
                              {thumb ? (
                                <img src={thumb} alt="" className="site-event-card__image" />
                              ) : (
                                <span className="site-event-card__placeholder">
                                  <EventIcon className="h-8 w-8 text-emerald-600/70" />
                                </span>
                              )}
                            </span>
                            <span className="site-event-card__body">
                              <span className="site-event-card__title">{event.title}</span>
                              <span className="site-event-card__date">{range || "기간 미정"}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="site-event-tab-empty">이 분류에 표시할 이벤트가 없습니다.</p>
                  )}
                </>
              ) : selectedEvent && activeTab ? (
                <>
                  {visibleTabs.length > 1 ? (
                    <div className={`site-event-tabs grid border-b border-gray-100 ${tabGridClass}`}>
                      {visibleTabs.map((tab) => {
                        const isActive = tab.id === activeTab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTabId(tab.id)}
                            className={`site-event-tabs__btn px-3 py-2.5 text-sm font-semibold transition ${
                              isActive
                                ? "site-event-tabs__btn--active border-b-2 border-emerald-600 text-emerald-700"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="site-event-tab-body">
                    {activeTab.image_url?.trim() ? (
                      activeTab.link_url?.trim() ? (
                        <a
                          href={activeTab.link_url.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="site-event-tab-image-link"
                        >
                          <img
                            src={activeTab.image_url.trim()}
                            alt={activeTab.label}
                            className="site-event-tab-image"
                          />
                        </a>
                      ) : (
                        <img
                          src={activeTab.image_url.trim()}
                          alt={activeTab.label}
                          className="site-event-tab-image"
                        />
                      )
                    ) : null}

                    {activeTab.body_text?.trim() ? (
                      <p className="site-event-tab-text">{activeTab.body_text.trim()}</p>
                    ) : null}

                    {activeTab.link_url?.trim() ? (
                      <a
                        href={activeTab.link_url.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="site-event-tab-link"
                      >
                        자세히 보기
                      </a>
                    ) : null}

                    {!activeTab.image_url?.trim() &&
                    !activeTab.body_text?.trim() &&
                    !activeTab.link_url?.trim() ? (
                      <p className="site-event-tab-empty">표시할 내용이 없습니다.</p>
                    ) : null}

                    <EventComments
                      key={activeTab.id}
                      tabId={activeTab.id}
                      reportReasons={reportReasons}
                      reportSuccessSettings={reportSuccessSettings}
                      hiddenCommentDisplay={hiddenCommentDisplay}
                    />
                  </div>
                </>
              ) : (
                <p className="site-event-tab-empty">표시할 이벤트 내용이 없습니다.</p>
              )}
            </div>

            <div className="site-event-nav-slot site-event-nav-slot--next">
              {detailNavEnabled && listNavigation.hasNext ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goNextEvent();
                  }}
                  className="board-post-popup-nav board-post-popup-nav--next"
                  aria-label="다음 이벤트"
                >
                  <PopupNavChevron direction="next" />
                </button>
              ) : detailNavEnabled ? (
                <span className="board-post-popup-nav-spacer" aria-hidden />
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="site-top-nav__link-item group relative site-top-nav__link-item--custom-visual">
        <button
          type="button"
          onClick={handleChipActivate}
          className="site-top-nav__link site-events-nav-chip inline-flex items-center gap-2.5"
          aria-label={hasNewEvents ? `${resolvedLabel} 새 이벤트` : resolvedLabel}
          aria-describedby={hintsEnabled ? "site-events-nav-hint" : undefined}
          onMouseEnter={() => hintsEnabled && setHintVisible(true)}
          onMouseLeave={() => setHintVisible(false)}
          onFocus={() => hintsEnabled && setHintVisible(true)}
          onBlur={() => setHintVisible(false)}
        >
          <span className="site-top-nav__link-icon-wrap">
            {resolvedIconUrl ? (
              <img
                src={resolvedIconUrl}
                alt=""
                className="site-top-nav__link-icon"
                draggable={false}
              />
            ) : (
              <span className="site-top-nav__link-icon-fallback text-emerald-700">
                <EventIcon className="h-full w-full" />
              </span>
            )}
          </span>
          <span className="site-top-nav__link-label">{resolvedLabel}</span>
        </button>
        {hasNewEvents ? (
          <span className="site-top-nav__new-badge" aria-hidden>
            N
          </span>
        ) : null}
        {hintsEnabled ? (
          <span
            id="site-events-nav-hint"
            role="tooltip"
            className={[
              "site-top-nav__link-hint pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white shadow-md transition",
              hintVisible
                ? "visible translate-y-0 opacity-100"
                : "invisible translate-y-1 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100",
            ].join(" ")}
          >
            {resolvedHint}
          </span>
        ) : null}
      </div>
      <SiteToast message={toastMessage} onDismiss={dismissToast} />
      {modal}
    </>
  );
}