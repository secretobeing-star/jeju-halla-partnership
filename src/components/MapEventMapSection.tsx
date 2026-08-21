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

const DEFAULT_TAB_ID = "__default_partners__";
const DEFAULT_STAMP_BAR_BG = "#ecfdf5";
const DEFAULT_DISTANCE_ERROR_MSG = "제휴처와의 거리가 {distance}m 남았습니다. 지정된 반경({radius}m) 내에서 도장을 찍어주세요.";
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
  const [currentGeo, setCurrentGeo] = useState<{ latitude: number; longitude: number } | null>(null);
  const [timerState, setTimerState] = useState<{ cooldown_end_time: string | null; intro_confirmed: boolean }>({
    cooldown_end_time: null,
    intro_confirmed: false,
  });

  const student = getSiteMemberSession()?.student;
  const userId = student?.studentId?.trim() || "";
  const isGuest = !userId;

  const isDefaultTab = activeTabId === DEFAULT_TAB_ID;

  const liveEvents = useMemo(
    () => events.filter((event) => isEventLive(event, nowMs)),
    [events, nowMs],
  );

  const activeEvent = useMemo(
    () => (isDefaultTab ? null : liveEvents.find((event) => event.id === activeTabId) ?? null),
    [isDefaultTab, liveEvents, activeTabId],
  );

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

  const stampedPlaceIds = useMemo(
    () => new Set(progress?.stamped_places ?? []),
    [progress],
  );

  const getEventCooldownKey = useCallback(
    (eventId: string) => `site_event_timer_${userId || "guest"}_${eventId}`,
    [userId],
  );

  const getIntroConfirmedKey = useCallback(
    (eventId: string) => `site_intro_confirmed_${userId || "guest"}_${eventId}`,
    [userId],
  );

  // DB에서 타이머 상태 로드
  const loadTimerState = useCallback(async () => {
    if (!activeEvent || !userId) {
      setTimerState({ cooldown_end_time: null, intro_confirmed: false });
      return;
    }
    try {
      const response = await fetch(
        `/api/event/timer-state?userId=${encodeURIComponent(userId)}&eventId=${encodeURIComponent(activeEvent.id)}`,
        { cache: "no-store" },
      );
      const payload = await response.json();
      setTimerState({
        cooldown_end_time: payload.cooldown_end_time || null,
        intro_confirmed: Boolean(payload.intro_confirmed),
      });
    } catch {
      setTimerState({ cooldown_end_time: null, intro_confirmed: false });
    }
  }, [activeEvent, userId]);

  // DB에 타이머 상태 저장
  const saveTimerState = useCallback(async (cooldownEndTime: string | null, introConfirmed: boolean) => {
    if (!activeEvent || !userId) return;
    try {
      await fetch("/api/event/timer-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          eventId: activeEvent.id,
          cooldownEndTime,
          introConfirmed,
        }),
      });
    } catch {}
  }, [activeEvent, userId]);

  // DB에서 타이머 상태 삭제
  const deleteTimerState = useCallback(async () => {
    if (!activeEvent || !userId) return;
    try {
      await fetch(
        `/api/event/timer-state?userId=${encodeURIComponent(userId)}&eventId=${encodeURIComponent(activeEvent.id)}`,
        { method: "DELETE" },
      );
    } catch {}
  }, [activeEvent, userId]);

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

  // 반경 내 미방문 제휴처 감지 (이벤트 탭에서만 활성화)
  const nearestUnstampedPartnerInside = useMemo(() => {
    if (isDefaultTab || !activeEvent || !currentGeo) return null;

    const radius = Number(activeEvent?.radius_meters) || 30;

    for (const p of visiblePartners) {
      if (stampedPlaceIds.has(String(p.id))) continue;

      const pLat = Number(p.latitude);
      const pLon = Number(p.longitude);
      if (!pLat || !pLon || isNaN(pLat) || isNaN(pLon)) continue;

      const dist = getDistanceInMeters(currentGeo.latitude, currentGeo.longitude, pLat, pLon);
      if (dist <= radius) {
        return { partner: p, distance: dist };
      }
    }
    return null;
  }, [isDefaultTab, activeEvent, currentGeo, visiblePartners, stampedPlaceIds]);

  // 반경 이탈 시 타이머 즉시 롤백 및 진입 시 타이머 생성
  useEffect(() => {
    if (isDefaultTab || !activeEvent) return;

    if (!nearestUnstampedPartnerInside) {
      // 반경 이탈 시 DB에서 타이머 상태 삭제
      if (timerState.cooldown_end_time) {
        void deleteTimerState();
        setTimerState({ cooldown_end_time: null, intro_confirmed: timerState.intro_confirmed });
        setNowMs(Date.now());
      }
      return;
    }

    const cooldownMinutes = Math.max(0, Number(activeEvent?.cooldown_minutes) || 0);
    if (cooldownMinutes <= 0) return;

    // 반경 진입 시 DB에 타이머 상태 저장
    if (!timerState.cooldown_end_time) {
      const targetEndTime = new Date(Date.now() + cooldownMinutes * 60_000).toISOString();
      void saveTimerState(targetEndTime, timerState.intro_confirmed);
      setTimerState({ cooldown_end_time: targetEndTime, intro_confirmed: timerState.intro_confirmed });
      setNowMs(Date.now());
    }
  }, [activeEvent, isDefaultTab, nearestUnstampedPartnerInside, timerState, deleteTimerState, saveTimerState]);

  const handleTabChange = (nextTabId: string) => {
    if (activeTabId === nextTabId) return;

    if (props.onPartnerSelect) {
      props.onPartnerSelect("");
    }

    // 탭 전환 시 기존 활성 이벤트의 타이머 상태 정리
    if (activeEvent) {
      void deleteTimerState();
    }

    setShowIntroModal(false);
    setMessage(null);
    setActiveTabId(nextTabId);
    setNowMs(Date.now());
  };

  useEffect(() => {
    if (isDefaultTab || !activeEvent) {
      setShowIntroModal(false);
      return;
    }

    if (isGuest) {
      setShowIntroModal(true);
    } else {
      // DB에서 타이머 상태 로드 후 인트로 확인 여부 확인
      void loadTimerState();
      setShowIntroModal(!timerState.intro_confirmed);
    }
  }, [activeTabId, activeEvent, isDefaultTab, isGuest, timerState.intro_confirmed, loadTimerState]);

  const handleConfirmStartEvent = useCallback(() => {
    if (!activeEvent) return;

    if (!isGuest && userId) {
      // DB에 인트로 확인 상태 저장
      void saveTimerState(timerState.cooldown_end_time, true);
      setTimerState({ cooldown_end_time: timerState.cooldown_end_time, intro_confirmed: true });
    }

    setShowIntroModal(false);
  }, [activeEvent, isGuest, userId, timerState, saveTimerState]);

  const currentPlaceCooldownRemainMs = useMemo(() => {
    if (isDefaultTab || !activeEvent || !nearestUnstampedPartnerInside) return 0;

    const cooldownEndTime = timerState.cooldown_end_time;
    if (!cooldownEndTime) return 0;

    const targetEndTime = new Date(cooldownEndTime).getTime();
    if (isNaN(targetEndTime) || targetEndTime <= 0) return 0;

    return Math.max(0, targetEndTime - nowMs);
  }, [activeEvent, isDefaultTab, nearestUnstampedPartnerInside, timerState.cooldown_end_time, nowMs]);

  const hasTimerKey = useMemo(() => {
    if (isDefaultTab || !activeEvent || !nearestUnstampedPartnerInside) return false;
    return Boolean(timerState.cooldown_end_time);
  }, [activeEvent, isDefaultTab, nearestUnstampedPartnerInside, timerState.cooldown_end_time]);

  const isCooldownOver = hasTimerKey && currentPlaceCooldownRemainMs === 0;
  const isZeroCooldownEvent = Number(activeEvent?.cooldown_minutes || 0) <= 0;
  const isReadyToStamp = !isDefaultTab && Boolean(nearestUnstampedPartnerInside) && (isCooldownOver || isZeroCooldownEvent);

  const triggerPartnerPush = useCallback(
    async (partnerId: string, partnerName: string, type: "arrival" | "ready_stamp") => {
      const title = type === "ready_stamp" ? "도장 찍기 가능!" : `${partnerName} 도착!`;
      const body =
        type === "ready_stamp"
          ? `${partnerName}에서 지금 바로 이벤트 도장을 찍어보세요!`
          : `${partnerName} 근처에 도착했습니다. 스탬프를 확인해 보세요!`;

      console.log(`푸시 알림 시도: ${type} - ${partnerName}`);

      // PWA 환경에서는 로컬 Notification API보다 Web Push에 의존
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            // PWA에서도 로컬 알림 시도 (Service Worker가 활성화된 경우)
            if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
              // Service Worker를 통한 알림
              const registration = await navigator.serviceWorker.getRegistration();
              if (registration) {
                await registration.showNotification(title, {
                  body,
                  icon: "/icons/icon-192x192.png",
                  badge: "/icons/icon-192x192.png",
                  tag: `partner-${partnerId}-${type}`,
                  requireInteraction: true,
                });
                console.log("Service Worker를 통한 알림 전송 성공");
              }
            } else {
              // Service Worker가 없는 경우 기본 Notification
              new Notification(title, { body, icon: "/icons/icon-192x192.png" });
              console.log("로컬 Notification 전송 성공");
            }
          } catch (error) {
            console.error("로컬 알림 전송 실패:", error);
          }
        } else if (Notification.permission === "default") {
          console.log("알림 권한 요청 필요");
          // 권한 요청은 사용자 동작에서만 가능하므로 여기서는 로그만 남김
        } else {
          console.warn("알림 권한이 거부됨");
        }
      }

      // 서버 기반 Web Push 발송
      if (!userId) {
        console.warn("userId가 없어 서버 푸시 발송 불가");
        return;
      }

      try {
        console.log("서버 푸시 API 호출 시작...");
        const response = await fetch("/api/push/partner-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, partnerId, partnerName, type }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("서버 푸시 발송 성공:", result);
        } else {
          console.error("서버 푸시 발송 실패:", response.status);
        }
      } catch (error) {
        console.error("서버 푸시 API 호출 실패:", error);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (isDefaultTab) return;
    if (nearestUnstampedPartnerInside) {
      const partnerId = String(nearestUnstampedPartnerInside.partner.id);
      const pushKey = `push_sent_${userId || "guest"}_${partnerId}_arrival`;
      if (!sessionStorage.getItem(pushKey)) {
        sessionStorage.setItem(pushKey, "true");
        void triggerPartnerPush(partnerId, nearestUnstampedPartnerInside.partner.name, "arrival");
      }
    }
  }, [isDefaultTab, nearestUnstampedPartnerInside, userId, triggerPartnerPush]);

  useEffect(() => {
    if (isDefaultTab) return;
    if (isReadyToStamp && nearestUnstampedPartnerInside) {
      const partnerId = String(nearestUnstampedPartnerInside.partner.id);
      const pushKey = `push_sent_${userId || "guest"}_${partnerId}_ready`;
      if (!sessionStorage.getItem(pushKey)) {
        sessionStorage.setItem(pushKey, "true");
        void triggerPartnerPush(partnerId, nearestUnstampedPartnerInside.partner.name, "ready_stamp");
      }
    }
  }, [isDefaultTab, isReadyToStamp, nearestUnstampedPartnerInside, userId, triggerPartnerPush]);

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

  // 활성 이벤트 변경 시 타이머 상태 로드
  useEffect(() => {
    void loadTimerState();
  }, [loadTimerState]);

  const handleFullRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadPublic(), loadProgress()]);
    setNowMs(Date.now());
    setTimeout(() => setRefreshing(false), 300);
  }, [loadPublic, loadProgress]);

  async function handleStamp(partner: { id: string; name: string; latitude?: number | string | null; longitude?: number | string | null }) {
    if (isDefaultTab || !activeEvent || busy) return;

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
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        if (payload.cooldownError) {
          const remainMs = payload.cooldownMs ?? 60_000;
          if (activeEvent && payload.cooldownMs) {
            const targetEndTime = new Date(Date.now() + payload.cooldownMs).toISOString();
            void saveTimerState(targetEndTime, timerState.intro_confirmed);
            setTimerState({ cooldown_end_time: targetEndTime, intro_confirmed: timerState.intro_confirmed });
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

      void deleteTimerState();
      setTimerState({ cooldown_end_time: null, intro_confirmed: timerState.intro_confirmed });

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
        
        {/* 상단 알림 배지: 반경 내에 들어온 매장이 실제로 존재할 때(nearestUnstampedPartnerInside)만 렌더링 */}
        {!isDefaultTab && activeEvent && !isCompleted && !rewardModal && !showIntroModal && nearestUnstampedPartnerInside && (
          currentPlaceCooldownRemainMs > 0 ? (
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
                    if (stampedPlaceIds.has(String(partner.id))) return true;
                    if (currentPlaceCooldownRemainMs > 0) return true;

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
                    if (stampedPlaceIds.has(String(partner.id))) return "도장 찍기 완료";
                    if (currentPlaceCooldownRemainMs > 0) {
                      return `${formatCooldownRemain(currentPlaceCooldownRemainMs)} 후 가능`;
                    }

                    const radius = Number(activeEvent?.radius_meters) || 30;
                    const pLat = Number(partner.latitude);
                    const pLon = Number(partner.longitude);

                    if (currentGeo && pLat && pLon && !isNaN(pLat) && !isNaN(pLon)) {
                      const dist = getDistanceInMeters(currentGeo.latitude, currentGeo.longitude, pLat, pLon);
                      if (dist > radius) {
                        return "매장 방문 시 도장 가능";
                      }
                    }
                    return config.stamp_button_label || config.event_stamp_btn_label || DEFAULT_STAMP_BTN_LABEL;
                  },
                  label: config.stamp_button_label || config.event_stamp_btn_label || DEFAULT_STAMP_BTN_LABEL,
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