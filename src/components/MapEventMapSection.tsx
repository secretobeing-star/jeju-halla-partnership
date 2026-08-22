"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
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
  type UserEventProgress,
} from "@/lib/map-events";
import type { MapMarkerCustomSettings } from "@/lib/naver-map-partner-ui";
import { getCurrentGeolocation } from "@/lib/geolocation";
import { getSiteMemberSession } from "@/lib/site-member-session";
import { SITE_STUDENT_NEED_LOGIN_EVENT } from "@/lib/site-student-auth-settings";
import { supabase } from "@/lib/supabase";

const DEFAULT_TAB_ID = "__default_partners__";
const DEFAULT_STAMP_BAR_BG = "#ecfdf5";
const DEFAULT_DISTANCE_ERROR_MSG = "제휴와의 거리가 {distance}m 남았습니다. 지정된 반경({radius}m) 내에서 도장을 찍어주세요.";
const DEFAULT_LOGIN_REQUIRED_MSG = "로그인 후 이벤트 도장을 찍고 보상을 받을 수 있습니다. 로그인하시겠습니까?";
const DEFAULT_COOLDOWN_TITLE = "잠시 후 도장을 찍을 수 있어요";
const DEFAULT_COOLDOWN_MSG = "시간이 조금 더 지난 후({remain})에 도장을 찍을 수 있어요!";
const DEFAULT_TIMER_TEMPLATE = "다음 도장까지 {remain}";

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
}

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
  const [currentGeo, setCurrentGeo] = useState<{ latitude: number; longitude: number } | null>(null);
  
  const [cooldownTargetTime, setCooldownTargetTime] = useState<number>(0);
  const [cooldownRemainMs, setCooldownRemainMs] = useState<number>(0);

  const student = getSiteMemberSession()?.student;
  const userId = student?.studentId?.trim() || "";
  const isGuest = !userId;

  const isDefaultTab = !activeTabId || activeTabId === DEFAULT_TAB_ID;
  const hasFavorites = Boolean(props.favoritePartnerIds && props.favoritePartnerIds.size > 0);

  const liveEvents = useMemo(
    () => events.filter((event) => isEventLive(event)),
    [events],
  );

  const activeEvent = useMemo(
    () => (isDefaultTab ? null : liveEvents.find((event) => event.id === activeTabId) ?? null),
    [isDefaultTab, liveEvents, activeTabId],
  );

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

  const stampedPlaceIds = useMemo(
    () => new Set((progress?.stamped_places ?? []).map(String)),
    [progress],
  );

  const getIntroConfirmedKey = useCallback(
    (eventId: string) => `site_intro_confirmed_${userId || "guest"}_${eventId}`,
    [userId],
  );

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (pos.coords.latitude && pos.coords.longitude) {
          setCurrentGeo({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 5000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const nearestTargetPartner = useMemo(() => {
    if (isDefaultTab || !activeEvent || !currentGeo || !hasFavorites) return null;

    const radius = Number(activeEvent?.radius_meters) || 30;
    let closest: { partner: PartnerSource; distance: number; isInside: boolean } | null = null;

    const favSet = props.favoritePartnerIds!;
    const targets = visiblePartners.filter((p) => favSet.has(String(p.id)));

    for (const p of targets) {
      if (stampedPlaceIds.has(String(p.id))) continue;

      const pLat = Number(p.latitude);
      const pLon = Number(p.longitude);
      if (!pLat || !pLon || isNaN(pLat) || isNaN(pLon)) continue;

      const dist = getDistanceInMeters(currentGeo.latitude, currentGeo.longitude, pLat, pLon);
      if (!closest || dist < closest.distance) {
        closest = { partner: p, distance: dist, isInside: dist <= radius };
      }
    }
    return closest;
  }, [isDefaultTab, activeEvent, currentGeo, hasFavorites, props.favoritePartnerIds, visiblePartners, stampedPlaceIds]);

  const nearestUnstampedPartnerInside = useMemo(() => {
    if (nearestTargetPartner && nearestTargetPartner.isInside) {
      return { partner: nearestTargetPartner.partner, distance: nearestTargetPartner.distance };
    }
    return null;
  }, [nearestTargetPartner]);

  const getPartnerCooldownKey = useCallback(
    (eventId: string, placeId: string) => `site_event_remain_seconds_${userId || "guest"}_${eventId}_${placeId}`,
    [userId],
  );

  const getPartnerInitializedKey = useCallback(
    (eventId: string, placeId: string) => `site_event_initialized_${userId || "guest"}_${eventId}_${placeId}`,
    [userId],
  );

  const currentActivePartnerId = nearestUnstampedPartnerInside?.partner.id || "";

  useEffect(() => {
    if (isDefaultTab || !activeEvent || isGuest || !currentActivePartnerId) {
      setCooldownTargetTime(0);
      setCooldownRemainMs(0);
      return;
    }

    const storageKey = getPartnerCooldownKey(activeEvent.id, currentActivePartnerId);
    const initKey = getPartnerInitializedKey(activeEvent.id, currentActivePartnerId);
    const savedTarget = localStorage.getItem(storageKey);
    const isInitialized = localStorage.getItem(initKey);
    const now = Date.now();
    const cooldownMinutes = Math.max(0, Number(activeEvent?.cooldown_minutes) || 0);

    if (savedTarget !== null) {
      const targetTime = Number(savedTarget);
      if (targetTime > now) {
        setCooldownTargetTime(targetTime);
        setCooldownRemainMs(targetTime - now);
        return;
      }
    }

    if (!isInitialized && cooldownMinutes > 0) {
      const newTargetTime = now + cooldownMinutes * 60_000;
      localStorage.setItem(storageKey, String(newTargetTime));
      localStorage.setItem(initKey, "true");
      setCooldownTargetTime(newTargetTime);
      setCooldownRemainMs(cooldownMinutes * 60_000);
      return;
    }

    setCooldownTargetTime(0);
    setCooldownRemainMs(0);
  }, [activeEvent, activeTabId, isDefaultTab, isGuest, currentActivePartnerId, getPartnerCooldownKey, getPartnerInitializedKey]);

  useEffect(() => {
    if (isDefaultTab || !activeEvent || isGuest || !currentActivePartnerId || cooldownTargetTime <= 0) {
      return;
    }

    const updateRemain = () => {
      const now = Date.now();
      const remain = cooldownTargetTime - now;
      if (remain <= 0) {
        setCooldownRemainMs(0);
        setCooldownTargetTime(0);
        localStorage.removeItem(getPartnerCooldownKey(activeEvent.id, currentActivePartnerId));
      } else {
        setCooldownRemainMs(remain);
      }
    };

    updateRemain();
    const timer = window.setInterval(updateRemain, 1000);
    return () => window.clearInterval(timer);
  }, [isDefaultTab, activeEvent, isGuest, currentActivePartnerId, cooldownTargetTime, getPartnerCooldownKey]);

  const isTimerPaused = useMemo(() => {
    if (isDefaultTab || !activeEvent) return false;
    return visiblePartners.length === 0 || !nearestTargetPartner;
  }, [isDefaultTab, activeEvent, visiblePartners.length, nearestTargetPartner]);

  const handleTabChange = (nextTabId: string) => {
    if (activeTabId === nextTabId) return;

    if (props.onPartnerSelect) {
      props.onPartnerSelect("");
    }

    setShowIntroModal(false);
    setMessage(null);
    setActiveTabId(nextTabId);
  };

  useEffect(() => {
    if (isDefaultTab || !activeEvent) {
      setShowIntroModal(false);
      return;
    }

    if (isGuest) {
      setShowIntroModal(true);
    } else {
      const hasConfirmed = localStorage.getItem(getIntroConfirmedKey(activeEvent.id));
      setShowIntroModal(!hasConfirmed);
    }
  }, [activeTabId, activeEvent, isDefaultTab, isGuest, getIntroConfirmedKey]);

  const handleConfirmStartEvent = useCallback(() => {
    if (!activeEvent) return;

    if (!isGuest && userId) {
      localStorage.setItem(getIntroConfirmedKey(activeEvent.id), "true");
    }

    setShowIntroModal(false);
  }, [activeEvent, isGuest, userId, getIntroConfirmedKey]);

  const isCooldownOver = cooldownRemainMs === 0;
  const isZeroCooldownEvent = Number(activeEvent?.cooldown_minutes || 0) <= 0;
  const isReadyToStamp = !isDefaultTab && !isGuest && hasFavorites && Boolean(nearestUnstampedPartnerInside) && (isCooldownOver || isZeroCooldownEvent);

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

  useEffect(() => {
    if (!activeEvent || !userId) return;

    const channel = supabase
      .channel(`user-progress-${userId}-${activeEvent.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_event_progress",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as UserEventProgress).event_id === activeEvent.id) {
            setProgress(payload.new as UserEventProgress);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeEvent, userId]);

  const handleFullRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadPublic(), loadProgress()]);
    setTimeout(() => setRefreshing(false), 300);
  }, [loadPublic, loadProgress]);

  const openLoginModal = useCallback(() => {
    setRewardModal({
      kind: "login_required",
      title: "로그인이 필요합니다",
      body: config.login_required_message || DEFAULT_LOGIN_REQUIRED_MSG,
      banner: activeEvent?.banner_img || null,
      rewardName: null,
      rewardImg: null,
      showGiftButton: false,
    });
  }, [config.login_required_message, activeEvent]);

  async function handleStamp(partner: { id: string; name: string; latitude?: number | string | null; longitude?: number | string | null }) {
    if (isDefaultTab || !activeEvent || busy) return;

    if (isGuest) {
      openLoginModal();
      return;
    }

    if (cooldownRemainMs > 0) {
      const remainText = formatCooldownRemain(cooldownRemainMs);
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

    const sessionStudent = getSiteMemberSession()?.student;
    const sessionUserId = sessionStudent?.studentId?.trim() || "";
    const sessionName = sessionStudent?.name?.trim() || "";
    const sessionDepartment = sessionStudent?.department?.trim() || "";
    const sessionToken = localStorage.getItem("sessionToken") || "";

    if (!sessionUserId || !sessionStudent || !sessionName) {
      openLoginModal();
      return;
    }

    if (stampedPlaceIds.has(String(partner.id))) return;

    let geo = currentGeo;
    if (!geo?.latitude || !geo?.longitude) {
      try {
        const fetched = await getCurrentGeolocation({ enableHighAccuracy: true, timeout: 4000 });
        geo = { latitude: fetched.latitude, longitude: fetched.longitude };
        setCurrentGeo(geo);
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
        return;
      }
    }

    setBusy(true);
    setMessage(null);

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
          sessionToken,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        if (payload.cooldownError) {
          const remainMs = payload.cooldownMs ?? 60_000;
          if (activeEvent) {
            const targetTime = Date.now() + remainMs;
            localStorage.setItem(getPartnerCooldownKey(activeEvent.id, partner.id), String(targetTime));
            setCooldownTargetTime(targetTime);
            setCooldownRemainMs(remainMs);
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
          const radiusVal = Math.round(payload.radiusMeters ?? 30);
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

      localStorage.removeItem(getPartnerCooldownKey(activeEvent.id, partner.id));
      setCooldownTargetTime(0);
      setCooldownRemainMs(0);

      if (payload.progress) setProgress(payload.progress);

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
    ? timerTemplate.replace(/\{remain\}/g, formatCooldownRemain(cooldownRemainMs))
    : `${timerTemplate} ${formatCooldownRemain(cooldownRemainMs)}`;

  return (
    <div className="map-event-shell" style={{ position: "relative" }}>
      <div className="map-event-tabs" role="tablist">
        <button
          type="button"
          className={`map-event-tab ${isDefaultTab ? "map-event-tab--active" : ""}`}
          onClick={() => handleTabChange(DEFAULT_TAB_ID)}
        >
          {config.default_map_tab_name || DEFAULT_MAP_TAB_NAME}
        </button>
        {liveEvents.map((event) => (
          <button
            key={event.id}
            type="button"
            className={`map-event-tab ${activeTabId === event.id ? "map-event-tab--active" : ""}`}
            onClick={() => handleTabChange(event.id)}
          >
            {event.tab_name || event.title}
          </button>
        ))}
      </div>

      {!isDefaultTab && activeEvent ? (
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

      <div style={{ position: "relative", width: "100%", overflow: "visible" }}>
        
        {!isDefaultTab && activeEvent && !isCompleted && !rewardModal && !showIntroModal && (
          isGuest ? (
            <div
              onClick={openLoginModal}
              style={{
                position: "absolute",
                top: "16px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 20,
                backgroundColor: "#059669",
                color: "#ffffff",
                padding: "8px 18px",
                borderRadius: "9999px",
                fontSize: "13px",
                fontWeight: "700",
                boxShadow: "0 6px 16px rgba(5, 150, 105, 0.4)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <span>🔒 로그인 후 도장을 찍을 수 있어요!</span>
            </div>
          ) : !hasFavorites ? (
            <div
              style={{
                position: "absolute",
                top: "16px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 20,
                backgroundColor: "rgba(31, 41, 55, 0.95)",
                color: "#f9fafb",
                padding: "8px 18px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: "600",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                pointerEvents: "none",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                whiteSpace: "nowrap",
              }}
            >
              <span>❤️</span>
              <span>찜한 제휴가 없습니다. 제휴의 ❤️를 먼저 눌러주세요!</span>
            </div>
          ) : isTimerPaused ? (
            <div
              style={{
                position: "absolute",
                top: "16px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 20,
                backgroundColor: "rgba(31, 41, 55, 0.95)",
                color: "#f9fafb",
                padding: "8px 18px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: "600",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                pointerEvents: "none",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                whiteSpace: "nowrap",
              }}
            >
              <span>⏸️</span>
              <span>주변 제휴처를 찾을 수 없어 타이머가 일시정지되었습니다.</span>
            </div>
          ) : nearestUnstampedPartnerInside ? (
            cooldownRemainMs > 0 ? (
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
            ) : isReadyToStamp ? (
              <div
                style={{
                  position: "absolute",
                  top: "16px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 20,
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  padding: "8px 18px",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  fontWeight: "700",
                  boxShadow: "0 6px 16px rgba(5, 150, 105, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  pointerEvents: "none",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <span>지금 바로 도장을 찍어보세요!</span>
              </div>
            ) : null
          ) : (
            <div
              style={{
                position: "absolute",
                top: "16px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 20,
                backgroundColor: "rgba(31, 41, 55, 0.95)",
                color: "#f9fafb",
                padding: "8px 18px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: "600",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                pointerEvents: "none",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                whiteSpace: "nowrap",
              }}
            >
              <span>📍</span>
              <span>
                {nearestTargetPartner
                  ? `${nearestTargetPartner.partner.name} (약 ${formatDistance(nearestTargetPartner.distance)}) · 가까운 제휴 찾으러 가볼까요?`
                  : "가까운 제휴를 찾을 수 없습니다."}
              </span>
            </div>
          )
        )}

        <PartnerMainMapPanel
          key={activeTabId}
          {...props}
          partners={visiblePartners}
          stampAction={
            isStampFeatureActive
              ? {
                  enabled: true,
                  stampedPlaceIds,
                  isPartnerDisabled: (partner: PartnerSource) => {
                    if (busy) return true;
                    if (isGuest) return false;
                    if (stampedPlaceIds.has(String(partner.id))) return true;
                    if (cooldownRemainMs > 0) return true;

                    const radius = Number(activeEvent?.radius_meters) || 30;
                    const pLat = Number(partner.latitude);
                    const pLon = Number(partner.longitude);

                    if (currentGeo && pLat && pLon && !isNaN(pLat) && !isNaN(pLon)) {
                      const dist = getDistanceInMeters(currentGeo.latitude, currentGeo.longitude, pLat, pLon);
                      return dist > radius;
                    }
                    return true;
                  },
                  getPartnerLabel: (partner: PartnerSource) => {
                    if (busy) return "확인 중...";
                    if (isGuest) return "로그인 후 도장 가능";
                    if (stampedPlaceIds.has(String(partner.id))) return "도장 찍기 완료";
                    if (cooldownRemainMs > 0) {
                      return `${formatCooldownRemain(cooldownRemainMs)} 후 가능`;
                    }

                    const radius = Number(activeEvent?.radius_meters) || 30;
                    const pLat = Number(partner.latitude);
                    const pLon = Number(partner.longitude);

                    if (currentGeo && pLat && pLon && !isNaN(pLat) && !isNaN(pLon)) {
                      const dist = getDistanceInMeters(currentGeo.latitude, currentGeo.longitude, pLat, pLon);
                      if (dist > radius) {
                        return "제휴 방문 시 도장 가능";
                      }
                    }
                    return config.event_stamp_btn_label || DEFAULT_STAMP_BTN_LABEL;
                  },
                  label: isGuest ? "로그인 후 도장 가능" : (config.event_stamp_btn_label || DEFAULT_STAMP_BTN_LABEL),
                  onStamp: (partner) => {
                    void handleStamp(partner);
                  },
                }
              : undefined
          }
          detailButtonLabel={config.default_benefit_btn_label || DEFAULT_BENEFIT_BTN_LABEL}
        />
      </div>

      <MapEventIntroModal
        event={activeEvent}
        isOpen={showIntroModal}
        onClose={() => setShowIntroModal(false)}
        onConfirm={handleConfirmStartEvent}
      />

      {rewardModal ? (
        <div
          className="map-event-modal"
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            className="map-event-modal__card"
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "20px",
              maxWidth: "340px",
              width: "90%",
              textAlign: "center",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            {rewardModal.banner ? (
              <img
                src={rewardModal.banner}
                alt=""
                className="map-event-modal__banner"
                style={{ width: "100%", borderRadius: "8px", marginBottom: "12px" }}
              />
            ) : null}
            <h3
              className="map-event-modal__title"
              style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px", color: "#111827" }}
            >
              {rewardModal.title}
            </h3>
            <p
              className="map-event-modal__body"
              style={{ whiteSpace: "pre-line", fontSize: "14px", color: "#4b5563", marginBottom: "12px", lineHeight: 1.5 }}
            >
              {rewardModal.body}
            </p>
            {rewardModal.rewardImg ? (
              <img
                src={rewardModal.rewardImg}
                alt=""
                className="map-event-modal__reward-img"
                style={{ width: "80px", height: "80px", margin: "0 auto 12px", objectFit: "contain" }}
              />
            ) : null}
            {rewardModal.rewardName ? (
              <p
                className="map-event-modal__reward"
                style={{ fontSize: "15px", fontWeight: "600", color: "#059669", marginBottom: "12px" }}
              >
                {rewardModal.rewardName}
              </p>
            ) : null}

            {rewardModal.kind === "login_required" ? (
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", width: "100%" }}>
                <button
                  type="button"
                  className="map-event-modal__btn"
                  style={{ background: "#6b7280", flex: 1, padding: "10px", borderRadius: "8px", color: "#fff", fontWeight: "600" }}
                  onClick={() => setRewardModal(null)}
                >
                  닫기
                </button>
                <button
                  type="button"
                  className="map-event-modal__btn"
                  style={{ background: "#059669", flex: 1.2, padding: "10px", borderRadius: "8px", color: "#fff", fontWeight: "600" }}
                  onClick={() => {
                    setRewardModal(null);
                    window.dispatchEvent(new Event(SITE_STUDENT_NEED_LOGIN_EVENT));
                  }}
                >
                  로그인하기
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", width: "100%" }}>
                {rewardModal.showGiftButton ? (
                  <button
                    type="button"
                    className="map-event-modal__btn"
                    style={{ background: "#059669", flex: 1, padding: "10px", borderRadius: "8px", color: "#fff", fontWeight: "600" }}
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
                  style={{ background: "#6b7280", flex: 1, padding: "10px", borderRadius: "8px", color: "#fff", fontWeight: "600" }}
                  onClick={() => {
                    setRewardModal(null);
                    void handleFullRefresh();
                  }}
                >
                  확인
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}