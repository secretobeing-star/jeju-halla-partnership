"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import PartnerMainMapPanel from "@/components/PartnerMainMapPanel";
import {
  DEFAULT_BENEFIT_BTN_LABEL,
  DEFAULT_MAP_TAB_NAME,
  DEFAULT_STAMP_BTN_LABEL,
  completionRewardsOf,
  formatCooldownRemain,
  isEventLive,
  remainingCooldownMs,
  type MapAppConfig,
  type MapEvent,
  type MapEventReward,
  type UserEventProgress,
} from "@/lib/map-events";
import type { MapMarkerCustomSettings } from "@/lib/naver-map-partner-ui";
import { getCurrentGeolocation } from "@/lib/geolocation";
import { getSiteMemberSession } from "@/lib/site-member-session";
import { SITE_STUDENT_NEED_LOGIN_EVENT } from "@/lib/site-student-auth-settings";

const DEFAULT_TAB_ID = "__default_partners__";
const DEFAULT_STAMP_BAR_BG = "#ecfdf5";

function stampBarCssVars(
  event: Pick<MapEvent, "stamp_bar_bg_color" | "stamp_bar_bg_img">,
): CSSProperties {
  const style: CSSProperties & Record<string, string> = {
    "--stamp-bar-bg-color": event.stamp_bar_bg_color?.trim() || DEFAULT_STAMP_BAR_BG,
  };
  const bgImg = event.stamp_bar_bg_img?.trim();
  if (bgImg) {
    style["--stamp-bar-bg-image"] = `url(${JSON.stringify(bgImg)})`;
  }
  return style;
}

type PartnerSource = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  image_url?: string | null;
  category?: string | null;
  address?: string | null;
  benefit?: string | null;
};

type MapEventMapSectionProps = {
  partners: PartnerSource[];
  title?: string | null;
  defaultExpanded?: boolean;
  onPartnerSelect?: (partnerId: string) => void;
  favoritesEnabled?: boolean;
  favoritePartnerIds?: ReadonlySet<string>;
  locateEnabled?: boolean;
  holdLoadingOverlay?: boolean;
  onMapReady?: () => void;
  onFavoriteToggle?: (partnerId: string) => void;
  favoritesTerm?: string;
  markerSettings?: MapMarkerCustomSettings | null;
};

type RewardModalState = {
  kind: "win" | "lose" | "completion";
  title: string;
  body: string;
  banner: string | null;
  rewardName: string | null;
  rewardImg: string | null;
  showGiftButton: boolean;
};

// --------------------------------------------------------------------------
// 구글 스프레드시트 웹훅 로깅 함수
// --------------------------------------------------------------------------
const sendMapStampLog = (params: {
  action: "도장 찍기" | "스탬프 완주" | "당첨 보상" | "미당첨";
  eventTitle: string;
  storeName: string;
  currentCount: number;
  maxCount: number;
  studentId: string;
  studentName: string;
  department?: string;
  rewardMessage?: string;
}) => {
  try {
    const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_WEBHOOK_URL;
    if (!webhookUrl) return;

    const payload = {
      sheetName: "이벤트로그",
      action: params.action,
      timestamp: new Date().toISOString(),
      studentId: params.studentId || "비회원/익명",
      studentName: params.studentName || "-",
      department: params.department || "-",
      target: params.storeName || params.eventTitle,
      details:
        params.action === "도장 찍기"
          ? `[${params.eventTitle}] ${params.storeName} (${params.currentCount}/${params.maxCount}번째 도장 획득)`
          : `[${params.eventTitle}] 완주/보상 (${params.currentCount}/${params.maxCount}) - ${params.rewardMessage || ""}`,
    };

    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      mode: "no-cors",
    }).catch(() => {});
  } catch (_) {}
};

export default function MapEventMapSection(props: MapEventMapSectionProps) {
  const [config, setConfig] = useState<MapAppConfig>({
    default_map_tab_name: DEFAULT_MAP_TAB_NAME,
    default_map_marker_img: "",
    default_benefit_btn_label: DEFAULT_BENEFIT_BTN_LABEL,
    event_stamp_btn_label: DEFAULT_STAMP_BTN_LABEL,
  });
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [activeTabId, setActiveTabId] = useState(DEFAULT_TAB_ID);
  const [progress, setProgress] = useState<UserEventProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rewardModal, setRewardModal] = useState<RewardModalState | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const liveEvents = useMemo(
    () => events.filter((event) => isEventLive(event, nowMs)),
    [events, nowMs],
  );

  const activeEvent = liveEvents.find((event) => event.id === activeTabId) ?? null;
  const cooldownRemainMs = remainingCooldownMs(
    progress?.last_stamped_at,
    activeEvent?.cooldown_minutes ?? 0,
    nowMs,
  );

  useEffect(() => {
    const nextEnd = events
      .map((event) => (event.end_at ? Date.parse(event.end_at) : Number.NaN))
      .filter((value) => Number.isFinite(value) && value > Date.now())
      .sort((a, b) => a - b)[0];
    const cooldownActive = cooldownRemainMs > 0;
    if (!nextEnd && !cooldownActive) {
      return;
    }
    const delay = cooldownActive
      ? 1000
      : Math.min(Math.max(250, nextEnd - Date.now() + 250), 60_000);
    const timerId = window.setTimeout(() => setNowMs(Date.now()), delay);
    return () => window.clearTimeout(timerId);
  }, [events, nowMs, cooldownRemainMs]);

  useEffect(() => {
    if (activeTabId === DEFAULT_TAB_ID) {
      return;
    }
    if (!liveEvents.some((event) => event.id === activeTabId)) {
      setActiveTabId(DEFAULT_TAB_ID);
      setMessage("이벤트 기간이 종료되어 도장을 찍을 수 없습니다.");
    }
  }, [activeTabId, liveEvents]);

  const loadPublic = useCallback(async () => {
    try {
      const [configRes, eventsRes] = await Promise.all([
        fetch("/api/map-events/config", { cache: "no-store" }),
        fetch("/api/map-events", { cache: "no-store" }),
      ]);
      const configPayload = (await configRes.json()) as { config?: MapAppConfig };
      const eventsPayload = (await eventsRes.json()) as { events?: MapEvent[] };
      if (configPayload.config) setConfig(configPayload.config);
      setEvents((eventsPayload.events ?? []).filter((event) => isEventLive(event)));
    } catch {
      // 테이블 미생성 시 기본 제휴 탭만 표시
    }
  }, []);

  useEffect(() => {
    void loadPublic();
  }, [loadPublic]);

  const student = getSiteMemberSession()?.student;
  const userId = student?.studentId?.trim() || "";

  const loadProgress = useCallback(async () => {
    if (!activeEvent || !userId) {
      setProgress(null);
      return;
    }
    try {
      const response = await fetch(
        `/api/event/progress?userId=${encodeURIComponent(userId)}&eventId=${encodeURIComponent(activeEvent.id)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as { progress?: UserEventProgress };
      setProgress(payload.progress ?? null);
    } catch {
      setProgress(null);
    }
  }, [activeEvent, userId]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__activeMapEventId =
      activeEvent?.id ?? null;
    return () => {
      (window as unknown as Record<string, unknown>).__activeMapEventId = null;
    };
  }, [activeEvent]);

  useEffect(() => {
    const onStampChanged = () => void loadProgress();
    window.addEventListener("site-stamp-progress-changed", onStampChanged);
    return () => window.removeEventListener("site-stamp-progress-changed", onStampChanged);
  }, [loadProgress]);

  const visiblePartners = useMemo(() => {
    const pin =
      activeEvent?.marker_icon_img?.trim() ||
      (!activeEvent ? config.default_map_marker_img.trim() : "") ||
      null;
    const allowed = activeEvent?.partner_ids ?? [];
    const filtered =
      activeEvent && allowed.length > 0
        ? props.partners.filter((partner) => allowed.includes(partner.id))
        : props.partners;

    return filtered.map((partner) => ({
      ...partner,
      pinImageUrl: pin,
    }));
  }, [activeEvent, config.default_map_marker_img, props.partners]);

  const stampedPlaceIds = useMemo(
    () => new Set(progress?.stamped_places ?? []),
    [progress],
  );

  async function handleStamp(partner: { id: string; name: string }) {
    if (!activeEvent) return;
    if (!isEventLive(activeEvent)) {
      setMessage("이벤트 기간이 종료되어 도장을 찍을 수 없습니다.");
      return;
    }
    const sessionStudent = getSiteMemberSession()?.student;
    const sessionUserId = sessionStudent?.studentId?.trim() || "";
    const sessionName = sessionStudent?.name?.trim() || "";
    const sessionDepartment = sessionStudent?.department?.trim() || "";

    if (!sessionUserId || !sessionStudent || !sessionName) {
      window.dispatchEvent(new Event(SITE_STUDENT_NEED_LOGIN_EVENT));
      setMessage("도장을 찍으려면 학생 로그인이 필요합니다.");
      return;
    }
    if (stampedPlaceIds.has(partner.id) || busy) return;
    if (cooldownRemainMs > 0) {
      setRewardModal({
        kind: "lose",
        title: "잠시 후 도장을 찍을 수 있어요",
        body: `${formatCooldownRemain(cooldownRemainMs)} 후에 도장을 찍을 수 있습니다.`,
        banner: null,
        rewardName: null,
        rewardImg: null,
        showGiftButton: false,
      });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const geo = await getCurrentGeolocation({ maximumAge: 5_000, timeout: 15_000 });
      const response = await fetch("/api/event/stamp-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: activeEvent.id,
          placeId: partner.id,
          placeName: partner.name,
          userId: sessionUserId,
          studentId: sessionUserId,
          name: sessionName,
          department: sessionDepartment,
          latitude: geo.latitude,
          longitude: geo.longitude,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        progress?: UserEventProgress;
        giftCount?: number;
        popup?: "win" | "lose" | "completion";
        guaranteed?: { reward?: MapEventReward | null };
        step?: { won?: boolean; reward?: MapEventReward | null };
        completion?: { reached?: boolean; reward?: MapEventReward | null };
        messages?: { win?: string; lose?: string; completion?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error || "도장을 찍지 못했습니다.");
      }
      if (payload.progress) setProgress(payload.progress);

      const maxStamps = activeEvent.max_stamps || 5;
      const nextStampCount = payload.progress?.current_stamps ?? (progress?.current_stamps ?? 0) + 1;

      // 1. 도장 찍기 성공 시 구글 시트 로깅 호출
      sendMapStampLog({
        action: "도장 찍기",
        eventTitle: activeEvent.title,
        storeName: partner.name,
        currentCount: nextStampCount,
        maxCount: maxStamps,
        studentId: sessionUserId,
        studentName: sessionName,
        department: sessionDepartment,
      });

      const completionReward = payload.completion?.reward;
      const winReward = payload.step?.reward || payload.guaranteed?.reward || null;
      const popupKind = payload.popup || (payload.completion?.reached ? "completion" : (payload.giftCount ?? 0) > 0 ? "win" : "lose");

      if (popupKind === "completion") {
        const completionMsg = payload.messages?.completion || "완주 보상이 선물함으로 지급되었습니다!";
        setRewardModal({
          kind: "completion",
          title: "완주 보상",
          body: completionMsg,
          banner: activeEvent.banner_img,
          rewardName: completionReward?.reward_name || winReward?.reward_name || null,
          rewardImg: completionReward?.reward_img || winReward?.reward_img || null,
          showGiftButton: (payload.giftCount ?? 0) > 0,
        });

        // 2. 완주 보상 획득 시 구글 시트 로깅 호출
        sendMapStampLog({
          action: "스탬프 완주",
          eventTitle: activeEvent.title,
          storeName: partner.name,
          currentCount: nextStampCount,
          maxCount: maxStamps,
          studentId: sessionUserId,
          studentName: sessionName,
          department: sessionDepartment,
          rewardMessage: completionMsg,
        });
      } else if (popupKind === "win") {
        setRewardModal({
          kind: "win",
          title: "당첨",
          body: payload.messages?.win || "선물함으로 보상이 지급되었습니다!",
          banner: activeEvent.banner_img,
          rewardName: winReward?.reward_name || null,
          rewardImg: winReward?.reward_img || null,
          showGiftButton: true,
        });
      } else {
        setRewardModal({
          kind: "lose",
          title: "미당첨",
          body: payload.messages?.lose || "아쉽지만 이번엔 당첨되지 않았습니다.",
          banner: activeEvent.banner_img,
          rewardName: null,
          rewardImg: null,
          showGiftButton: false,
        });
      }
      if ((payload.giftCount ?? 0) > 0) {
        window.dispatchEvent(new Event("site-gift-inbox-refresh"));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "도장 찍기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const maxStamps = activeEvent?.max_stamps ?? 0;
  const current = progress?.current_stamps ?? 0;
  const completionPreview = activeEvent ? completionRewardsOf(activeEvent)[0] : null;
  const completionBadgeSrc =
    activeEvent?.completion_badge_img?.trim() || completionPreview?.reward_img || null;
  const stampEnabled =
    Boolean(activeEvent) &&
    isEventLive(activeEvent!) &&
    !progress?.is_completed &&
    cooldownRemainMs <= 0;

  return (
    <div className="map-event-shell">
      <div className="map-event-tabs" role="tablist" aria-label="지도 이벤트 탭">
        <button
          type="button"
          role="tab"
          aria-selected={activeTabId === DEFAULT_TAB_ID}
          className={`map-event-tab ${activeTabId === DEFAULT_TAB_ID ? "map-event-tab--active" : ""}`}
          onClick={() => setActiveTabId(DEFAULT_TAB_ID)}
        >
          {config.default_map_tab_name || DEFAULT_MAP_TAB_NAME}
        </button>
        {liveEvents.map((event) => (
          <button
            key={event.id}
            type="button"
            role="tab"
            aria-selected={activeTabId === event.id}
            className={`map-event-tab ${activeTabId === event.id ? "map-event-tab--active" : ""}`}
            onClick={() => setActiveTabId(event.id)}
          >
            {event.tab_name || event.title}
          </button>
        ))}
      </div>

      {activeEvent ? (
        <div className="map-event-stamp-bar" style={stampBarCssVars(activeEvent)}>
          <div className="map-event-stamp-bar__copy">
            <p className="map-event-stamp-bar__title">{activeEvent.title}</p>
            <p className="map-event-stamp-bar__meta">
              {current} / {maxStamps}
              {progress?.is_completed ? " · 완주" : ""}
              {!isEventLive(activeEvent) ? " · 기간 종료" : ""}
              {cooldownRemainMs > 0
                ? ` · ${formatCooldownRemain(cooldownRemainMs)} 후 도장 가능`
                : ""}
            </p>
            {activeEvent.guide_text ? (
              <p className="map-event-stamp-bar__guide">{activeEvent.guide_text}</p>
            ) : null}
          </div>
          <div className="map-event-stamps" aria-hidden="true">
            {Array.from({ length: maxStamps }, (_, index) => {
              const filled = index < current;
              const src = filled
                ? activeEvent.stamp_active_img
                : activeEvent.stamp_inactive_img;
              return src ? (
                <img
                  key={index}
                  src={src}
                  alt=""
                  className={`map-event-stamp ${filled ? "map-event-stamp--on" : "map-event-stamp--off"}`}
                />
              ) : (
                <span
                  key={index}
                  className={`map-event-stamp map-event-stamp--fallback ${filled ? "map-event-stamp--on" : ""}`}
                />
              );
            })}
            {completionBadgeSrc || completionPreview ? (
              <span
                className="map-event-completion-reward"
                title={completionPreview?.reward_name || "완주 보상"}
              >
                {completionBadgeSrc ? (
                  <img src={completionBadgeSrc} alt="" />
                ) : (
                  <span className="map-event-completion-reward__fallback" />
                )}
                <span className="map-event-completion-reward__label">완주</span>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {message ? <p className="map-event-message">{message}</p> : null}

      <PartnerMainMapPanel
        {...props}
        partners={visiblePartners}
        markerSettings={props.markerSettings}
        stampAction={
          activeEvent
            ? {
                enabled: stampEnabled,
                stampedPlaceIds,
                label:
                  cooldownRemainMs > 0
                    ? `${formatCooldownRemain(cooldownRemainMs)} 후 가능`
                    : config.event_stamp_btn_label || DEFAULT_STAMP_BTN_LABEL,
                onStamp: (partner) => {
                  void handleStamp(partner);
                },
              }
            : undefined
        }
        favoriteCountdownEndAt={
          activeEvent?.end_at ||
          liveEvents.find((event) => event.end_at)?.end_at ||
          null
        }
        detailButtonLabel={config.default_benefit_btn_label || DEFAULT_BENEFIT_BTN_LABEL}
      />

      {rewardModal ? (
        <div className="map-event-modal" role="dialog" aria-modal="true">
          <div className="map-event-modal__card">
            {rewardModal.banner ? (
              <img src={rewardModal.banner} alt="" className="map-event-modal__banner" />
            ) : null}
            <h3 className="map-event-modal__title">{rewardModal.title}</h3>
            <p className="map-event-modal__body">{rewardModal.body}</p>
            {rewardModal.rewardImg ? (
              <img src={rewardModal.rewardImg} alt="" className="map-event-modal__reward-img" />
            ) : null}
            {rewardModal.rewardName ? (
              <p className="map-event-modal__reward">{rewardModal.rewardName}</p>
            ) : null}
            {rewardModal.showGiftButton ? (
              <button
                type="button"
                className="map-event-modal__btn"
                onClick={() => {
                  setRewardModal(null);
                  window.dispatchEvent(new Event("site-gift-inbox-open"));
                }}
              >
                선물함 열기
              </button>
            ) : null}
            <button
              type="button"
              className="map-event-modal__btn"
              style={{ background: "#6b7280" }}
              onClick={() => setRewardModal(null)}
            >
              확인
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}