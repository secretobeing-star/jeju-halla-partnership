"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import PartnerMainMapPanel from "@/components/PartnerMainMapPanel";
import MapEventIntroModal from "@/components/MapEventIntroModal";
import {
  DEFAULT_BENEFIT_BTN_LABEL,
  DEFAULT_MAP_TAB_NAME,
  DEFAULT_STAMP_BTN_LABEL,
  completionRewardsOf,
  formatCooldownRemain,
  isEventLive,
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
const DEFAULT_DISTANCE_ERROR_MSG = "제휴처와의 거리가 {distance}m 남았습니다. 지정된 반경({radius}m) 내에서 도장을 찍어주세요.";
const DEFAULT_LOGIN_REQUIRED_MSG = "로그인 후 이벤트 도장을 찍고 보상을 받을 수 있습니다. 로그인하시겠습니까?";
const DEFAULT_COOLDOWN_TITLE = "잠시 후 도장을 찍을 수 있어요";
const DEFAULT_COOLDOWN_MSG = "시간이 조금 더 지난 후({remain})에 도장을 찍을 수 있어요!";
const DEFAULT_TIMER_TEMPLATE = "다음 도장까지 {remain}";

function stampBarCssVars(
  event: Pick<MapEvent, "stamp_bar_bg_color" | "stamp_bar_bg_img">,
): CSSProperties {
  const style: CSSProperties & Record<string, string> = {
    "--stamp-bar-bg-color": event.stamp_bar_bg_color?.trim() || DEFAULT_STAMP_BAR_BG,
  };
  const bgImg = event.stamp_bar_bg_img?.trim();
  if (bgImg) {
    style["--stamp-bar-bg-image"] = `url(${JSON.stringify(bgImg)})`;
    style.backgroundImage = `url(${JSON.stringify(bgImg)})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }
  return style;
}

type PartnerSource = {
  id: string;
  name: string;
  latitude: number | string | null;
  longitude: number | string | null;
  image_url?: string | null;
  pinImageUrl?: string | null;
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
  kind: "win" | "lose" | "completion" | "distance" | "login_required";
  title: string;
  body: string;
  banner: string | null;
  rewardName: string | null;
  rewardImg: string | null;
  showGiftButton: boolean;
};

export default function MapEventMapSection(props: MapEventMapSectionProps) {
  const [config, setConfig] = useState<
    MapAppConfig & {
      distance_error_message?: string;
      login_required_message?: string;
      cooldown_popup_title?: string;
      cooldown_popup_message?: string;
      cooldown_timer_template?: string;
      win_popup_title?: string;
      completion_popup_title?: string;
    }
  >({
    default_map_tab_name: DEFAULT_MAP_TAB_NAME,
    default_map_marker_img: "",
    default_benefit_btn_label: DEFAULT_BENEFIT_BTN_LABEL,
    event_stamp_btn_label: DEFAULT_STAMP_BTN_LABEL,
    distance_error_message: DEFAULT_DISTANCE_ERROR_MSG,
    login_required_message: DEFAULT_LOGIN_REQUIRED_MSG,
    cooldown_popup_title: DEFAULT_COOLDOWN_TITLE,
    cooldown_popup_message: DEFAULT_COOLDOWN_MSG,
    cooldown_timer_template: DEFAULT_TIMER_TEMPLATE,
    win_popup_title: "당첨",
    completion_popup_title: "완주 보상",
  });

  const [events, setEvents] = useState<MapEvent[]>([]);
  const [activeTabId, setActiveTabId] = useState(DEFAULT_TAB_ID);
  const [progress, setProgress] = useState<UserEventProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rewardModal, setRewardModal] = useState<RewardModalState | null>(null);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const lastKnownGeoRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const student = getSiteMemberSession()?.student;
  const userId = student?.studentId?.trim() || "";

  const refreshLocationCache = useCallback(() => {
    void getCurrentGeolocation({
      enableHighAccuracy: true,
      maximumAge: 60_000,
      timeout: 4_000,
    })
      .then((geo) => {
        if (geo.latitude && geo.longitude) {
          lastKnownGeoRef.current = { latitude: geo.latitude, longitude: geo.longitude };
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshLocationCache();
    const interval = window.setInterval(refreshLocationCache, 20_000);
    return () => window.clearInterval(interval);
  }, [refreshLocationCache]);

  const liveEvents = useMemo(
    () => events.filter((event) => isEventLive(event, nowMs)),
    [events, nowMs],
  );

  const activeEvent = liveEvents.find((event) => event.id === activeTabId) ?? null;
  const isDefaultTab = activeTabId === DEFAULT_TAB_ID;

  // 이벤트 탭 클릭(전환) 시 해당 이벤트 안내 모달 자동 오픈
  useEffect(() => {
    if (!isDefaultTab && activeEvent) {
      setShowIntroModal(true);
    } else {
      setShowIntroModal(false);
    }
  }, [activeTabId, activeEvent, isDefaultTab]);

  // 1초마다 실시간 시각 갱신
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const visiblePartners = useMemo(() => {
    const raw = props.partners || [];
    if (raw.length === 0) return [];
    if (isDefaultTab || !activeEvent) return raw;

    const allowed = (activeEvent.partner_ids ?? []).map(String);
    if (allowed.length > 0) {
      const filtered = raw.filter((p) => allowed.includes(String(p.id)));
      return filtered.length > 0 ? filtered : raw;
    }
    return raw;
  }, [activeEvent, isDefaultTab, props.partners]);

  // 계정 및 이벤트별 쿨다운 키
  const getEventCooldownKey = useCallback(
    (eventId: string) => `site_event_timer_${userId || "guest"}_${eventId}`,
    [userId],
  );

  // 이벤트 탭 진입 시 기존 만료 시각이 없으면 최초 1회 생성
  useEffect(() => {
    if (isDefaultTab || !activeEvent) return;

    const cooldownMinutes = Math.max(0, Number(activeEvent.cooldown_minutes) || 0);
    if (cooldownMinutes <= 0) return;

    const storageKey = getEventCooldownKey(activeEvent.id);
    const existingEndTime = localStorage.getItem(storageKey);

    if (!existingEndTime) {
      const targetEndTime = Date.now() + cooldownMinutes * 60_000;
      localStorage.setItem(storageKey, String(targetEndTime));
    }
  }, [activeTabId, activeEvent, isDefaultTab, getEventCooldownKey]);

  // 남은 쿨다운 시간 계산
  const currentPlaceCooldownRemainMs = useMemo(() => {
    if (isDefaultTab || !activeEvent) return 0;

    const cooldownMinutes = Math.max(0, Number(activeEvent.cooldown_minutes) || 0);
    if (cooldownMinutes <= 0) return 0;

    const storageKey = getEventCooldownKey(activeEvent.id);
    let targetEndTimeStr: string | null = null;
    try {
      targetEndTimeStr = localStorage.getItem(storageKey);
    } catch {}

    if (!targetEndTimeStr) return 0;

    const targetEndTime = Number(targetEndTimeStr);
    if (isNaN(targetEndTime) || targetEndTime <= 0) return 0;

    return Math.max(0, targetEndTime - nowMs);
  }, [activeEvent, isDefaultTab, getEventCooldownKey, nowMs]);

  const loadPublic = useCallback(async () => {
    try {
      const [configRes, eventsRes] = await Promise.all([
        fetch("/api/map-events/config", { cache: "no-store" }),
        fetch("/api/map-events", { cache: "no-store" }),
      ]);
      const configPayload = await configRes.json();
      const eventsPayload = await eventsRes.json();
      if (configPayload.config) setConfig(configPayload.config);
      setEvents((eventsPayload.events ?? []).filter((event: MapEvent) => isEventLive(event)));
    } catch {}
  }, []);

  useEffect(() => {
    void loadPublic();
  }, [loadPublic]);

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
      const payload = await response.json();
      setProgress(payload.progress ?? null);
    } catch {
      setProgress(null);
    }
  }, [activeEvent, userId]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  // 새로고침 버튼 핸들러
  const handleFullRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshLocationCache();
    await Promise.all([loadPublic(), loadProgress()]);
    setNowMs(Date.now());
    setTimeout(() => setRefreshing(false), 300);
  }, [loadPublic, loadProgress, refreshLocationCache]);

  const stampedPlaceIds = useMemo(
    () => new Set(progress?.stamped_places ?? []),
    [progress],
  );

  async function handleStamp(partner: { id: string; name: string }) {
    if (isDefaultTab || !activeEvent || busy) return;

    // 좋아요 안 된 곳은 클릭 시 팝업 없이 즉시 리턴
    const isFavorited = Boolean(props.favoritePartnerIds?.has(String(partner.id)));
    if (props.favoritesEnabled && !isFavorited) {
      return;
    }

    const sessionStudent = getSiteMemberSession()?.student;
    const sessionUserId = sessionStudent?.studentId?.trim() || "";
    const sessionName = sessionStudent?.name?.trim() || "";
    const sessionDepartment = sessionStudent?.department?.trim() || "";

    if (!sessionUserId || !sessionStudent || !sessionName) {
      setRewardModal({
        kind: "login_required",
        title: "로그인이 필요합니다",
        body: config.login_required_message || DEFAULT_LOGIN_REQUIRED_MSG,
        banner: activeEvent.banner_img || null,
        rewardName: null,
        rewardImg: null,
        showGiftButton: false,
      });
      return;
    }

    if (stampedPlaceIds.has(partner.id)) return;

    // 클라이언트 쿨다운 검증
    if (currentPlaceCooldownRemainMs > 0) {
      const remainText = formatCooldownRemain(currentPlaceCooldownRemainMs);
      setRewardModal({
        kind: "lose",
        title: config.cooldown_popup_title || DEFAULT_COOLDOWN_TITLE,
        body: (config.cooldown_popup_message || DEFAULT_COOLDOWN_MSG).replace(/\{remain\}/g, remainText),
        banner: null,
        rewardName: null,
        rewardImg: null,
        showGiftButton: false,
      });
      return;
    }

    setBusy(true);
    setMessage(null);

    let geo = lastKnownGeoRef.current;
    if (!geo?.latitude || !geo?.longitude) {
      try {
        const fetched = await getCurrentGeolocation({ enableHighAccuracy: true, timeout: 4000 });
        geo = { latitude: fetched.latitude, longitude: fetched.longitude };
        lastKnownGeoRef.current = geo;
      } catch {
        setRewardModal({
          kind: "distance",
          title: "위치 권한 확인",
          body: "현재 위치 정보를 가져올 수 없습니다. GPS 권한을 확인해 주세요.",
          banner: activeEvent.banner_img || null,
          rewardName: null,
          rewardImg: null,
          showGiftButton: false,
        });
        setBusy(false);
        return;
      }
    }

    try {
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
          timestamp: Date.now(),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        if (payload.cooldownError) {
          const remainMs = payload.cooldownMs ?? 60_000;
          if (activeEvent && payload.cooldownMs) {
            localStorage.setItem(getEventCooldownKey(activeEvent.id), String(Date.now() + payload.cooldownMs));
            setNowMs(Date.now());
          }
          const remainText = formatCooldownRemain(remainMs);
          setRewardModal({
            kind: "lose",
            title: config.cooldown_popup_title || DEFAULT_COOLDOWN_TITLE,
            body: (config.cooldown_popup_message || DEFAULT_COOLDOWN_MSG).replace(/\{remain\}/g, remainText),
            banner: null,
            rewardName: null,
            rewardImg: null,
            showGiftButton: false,
          });
          return;
        }

        if (payload.distanceError) {
          const distanceVal = Math.round(payload.distanceMeters ?? 0);
          const radiusVal = Math.round(payload.radiusMeters ?? 50);
          const bodyMsg = (config.distance_error_message || DEFAULT_DISTANCE_ERROR_MSG)
            .replace(/\{distance\}/g, String(distanceVal))
            .replace(/\{radius\}/g, String(radiusVal));

          setRewardModal({
            kind: "distance",
            title: "거리 확인 안내",
            body: bodyMsg,
            banner: activeEvent.banner_img || null,
            rewardName: null,
            rewardImg: null,
            showGiftButton: false,
          });
          return;
        }
        throw new Error(payload.error || "도장을 찍지 못했습니다.");
      }

      // 도장 성공: 다음 쿨다운 만료 시각 갱신
      const cooldownMinutes = Math.max(0, Number(activeEvent.cooldown_minutes) || 0);
      if (cooldownMinutes > 0) {
        localStorage.setItem(getEventCooldownKey(activeEvent.id), String(Date.now() + cooldownMinutes * 60_000));
      }

      if (payload.progress) setProgress(payload.progress);
      setNowMs(Date.now());

      const popupKind = payload.popup || (payload.completion?.reached ? "completion" : (payload.giftCount ?? 0) > 0 ? "win" : "lose");

      if (popupKind === "completion") {
        setRewardModal({
          kind: "completion",
          title: config.completion_popup_title || "완주 보상",
          body: payload.messages?.completion || "완주 보상이 선물함으로 지급되었습니다!",
          banner: activeEvent.banner_img,
          rewardName: payload.completion?.reward?.reward_name || null,
          rewardImg: payload.completion?.reward?.reward_img || null,
          showGiftButton: (payload.giftCount ?? 0) > 0,
        });
      } else if (popupKind === "win") {
        setRewardModal({
          kind: "win",
          title: config.win_popup_title || "당첨",
          body: payload.messages?.win || "선물함으로 보상이 지급되었습니다!",
          banner: activeEvent.banner_img,
          rewardName: payload.step?.reward?.reward_name || null,
          rewardImg: payload.step?.reward?.reward_img || null,
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "도장 찍기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const maxStamps = activeEvent?.max_stamps ?? 0;
  const current = progress?.current_stamps ?? 0;
  const isCompleted = Boolean(progress?.is_completed || (maxStamps > 0 && current >= maxStamps));
  const completionPreview = activeEvent ? completionRewardsOf(activeEvent)[0] : null;
  const completionBadgeSrc = activeEvent?.completion_badge_img?.trim() || completionPreview?.reward_img || null;

  const isStampFeatureActive = !isDefaultTab && Boolean(activeEvent) && isEventLive(activeEvent!) && !isCompleted;

  const timerTemplate = config.cooldown_timer_template || DEFAULT_TIMER_TEMPLATE;
  const timerBadgeText = timerTemplate.includes("{remain}")
    ? timerTemplate.replace(/\{remain\}/g, formatCooldownRemain(currentPlaceCooldownRemainMs))
    : `${timerTemplate} ${formatCooldownRemain(currentPlaceCooldownRemainMs)}`;

  return (
    <div className="map-event-shell" style={{ position: "relative" }}>
      <div className="map-event-tabs" role="tablist">
        <button
          type="button"
          className={`map-event-tab ${activeTabId === DEFAULT_TAB_ID ? "map-event-tab--active" : ""}`}
          onClick={() => setActiveTabId(DEFAULT_TAB_ID)}
        >
          {config.default_map_tab_name || DEFAULT_MAP_TAB_NAME}
        </button>
        {liveEvents.map((event) => (
          <button
            key={event.id}
            type="button"
            className={`map-event-tab ${activeTabId === event.id ? "map-event-tab--active" : ""}`}
            onClick={() => setActiveTabId(event.id)}
          >
            {event.tab_name || event.title}
          </button>
        ))}
      </div>

      {activeEvent && !isDefaultTab ? (
        <>
          <div className="map-event-stamp-bar" style={stampBarCssVars(activeEvent)}>
            <div className="map-event-stamp-bar__copy">
              <p className="map-event-stamp-bar__title">{activeEvent.title}</p>
              {!isEventLive(activeEvent) ? <p className="map-event-stamp-bar__meta">기간 종료</p> : null}
              {activeEvent.guide_text ? <p className="map-event-stamp-bar__guide">{activeEvent.guide_text}</p> : null}
            </div>
            <div className="map-event-stamps" aria-hidden="true">
              {Array.from({ length: maxStamps }, (_, index) => {
                const filled = index < current;
                const src = filled ? activeEvent.stamp_active_img : activeEvent.stamp_inactive_img;
                return src ? (
                  <img key={index} src={src} alt="" className={`map-event-stamp ${filled ? "map-event-stamp--on" : "map-event-stamp--off"}`} />
                ) : (
                  <span key={index} className={`map-event-stamp map-event-stamp--fallback ${filled ? "map-event-stamp--on" : ""}`} />
                );
              })}
              {completionBadgeSrc || completionPreview ? (
                <span className="map-event-completion-reward">
                  {completionBadgeSrc ? <img src={completionBadgeSrc} alt="" /> : <span className="map-event-completion-reward__fallback" />}
                </span>
              ) : null}
            </div>
          </div>

          {/* 스탬프 바 바로 밑 새로고침 버튼 */}
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 8px 8px 8px" }}>
            <button
              type="button"
              onClick={() => void handleFullRefresh()}
              disabled={refreshing}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: "600",
                color: "#4b5563",
                backgroundColor: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                cursor: refreshing ? "not-allowed" : "pointer",
              }}
            >
              <span>🔄</span>
              <span>{refreshing ? "갱신 중..." : "새로고침"}</span>
            </button>
          </div>
        </>
      ) : null}

      {message ? <p className="map-event-message">{message}</p> : null}

      {/* 지도 상단 플로팅 카운트다운 타이머 (z-index를 20으로 설정하여 모달 뒤로 정상 배치 및 모달 오픈 시 숨김) */}
      <div style={{ position: "relative", width: "100%", overflow: "visible" }}>
        {!isDefaultTab && activeEvent && !isCompleted && currentPlaceCooldownRemainMs > 0 && !rewardModal && !showIntroModal && (
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 20,
              backgroundColor: "rgba(17, 24, 39, 0.92)",
              color: "#ffffff",
              padding: "8px 18px",
              borderRadius: "9999px",
              fontSize: "13px",
              fontWeight: "700",
              boxShadow: "0 6px 16px rgba(0, 0, 0, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              pointerEvents: "none",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            <span>⏰</span>
            <span>{timerBadgeText}</span>
          </div>
        )}

        <PartnerMainMapPanel
          {...props}
          partners={visiblePartners}
          stampAction={
            isStampFeatureActive
              ? {
                  enabled: true,
                  stampedPlaceIds,
                  label:
                    busy
                      ? "확인 중..."
                      : currentPlaceCooldownRemainMs > 0
                        ? `${formatCooldownRemain(currentPlaceCooldownRemainMs)} 후 가능`
                        : config.event_stamp_btn_label || DEFAULT_STAMP_BTN_LABEL,
                  onStamp: (partner) => {
                    void handleStamp(partner);
                  },
                }
              : undefined
          }
          detailButtonLabel={config.default_benefit_btn_label || DEFAULT_BENEFIT_BTN_LABEL}
        />
      </div>

      {/* 관리자 커스텀 이벤트 참여 안내 모달 */}
      <MapEventIntroModal
        event={activeEvent}
        isOpen={showIntroModal}
        onClose={() => setShowIntroModal(false)}
        onConfirm={() => {
          setShowIntroModal(false);
        }}
      />

      {/* 보상 / 로그인 / 오류 팝업 모달 */}
      {rewardModal ? (
        <div className="map-event-modal" role="dialog" aria-modal="true">
          <div className="map-event-modal__card">
            {rewardModal.banner ? <img src={rewardModal.banner} alt="" className="map-event-modal__banner" /> : null}
            <h3 className="map-event-modal__title">{rewardModal.title}</h3>
            <p className="map-event-modal__body" style={{ whiteSpace: "pre-line" }}>{rewardModal.body}</p>
            {rewardModal.rewardImg ? <img src={rewardModal.rewardImg} alt="" className="map-event-modal__reward-img" /> : null}
            {rewardModal.rewardName ? <p className="map-event-modal__reward">{rewardModal.rewardName}</p> : null}

            {rewardModal.kind === "login_required" ? (
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", width: "100%" }}>
                <button type="button" className="map-event-modal__btn" style={{ background: "#6b7280", flex: 1 }} onClick={() => setRewardModal(null)}>닫기</button>
                <button type="button" className="map-event-modal__btn" style={{ background: "#059669", flex: 1.2 }} onClick={() => { setRewardModal(null); window.dispatchEvent(new Event(SITE_STUDENT_NEED_LOGIN_EVENT)); }}>로그인하기</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", width: "100%" }}>
                {rewardModal.showGiftButton ? (
                  <button type="button" className="map-event-modal__btn" onClick={() => { setRewardModal(null); window.dispatchEvent(new Event("site-gift-inbox-open")); }}>선물함 열기</button>
                ) : null}
                <button type="button" className="map-event-modal__btn" style={{ background: "#6b7280" }} onClick={() => { setRewardModal(null); void handleFullRefresh(); }}>확인</button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}