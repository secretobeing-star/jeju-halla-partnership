"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
import { getBoardVoterKey } from "@/lib/board-voter";
import { SITE_STUDENT_NEED_LOGIN_EVENT } from "@/lib/site-student-auth-settings";
import { studentAuthFetch } from "@/lib/student-session";
import { supabase } from "@/lib/supabase";
import { OPEN_SITE_MAP_EVENT } from "@/lib/ai-chatbot";

const DEFAULT_TAB_ID = "__default_partners__";
const DEFAULT_STAMP_BAR_BG = "#ecfdf5";
const DEFAULT_DISTANCE_ERROR_MSG = "제휴와의 거리가 {distance}m 남았습니다. 지정된 반경({radius}m) 내에서 도장을 찍어주세요.";
const DEFAULT_LOGIN_REQUIRED_MSG = "로그인 후 이벤트 도장을 찍고 보상을 받을 수 있습니다. 로그인하시겠습니까?";

function MapEventStatusChip({
  children,
  tone,
  onClick,
}: {
  children: ReactNode;
  tone: "green" | "dark";
  onClick?: () => void;
}) {
  return (
    <div
      className={`map-event-status-chip map-event-status-chip--${tone}${
        onClick ? " map-event-status-chip--clickable" : ""
      }`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {children}
    </div>
  );
}
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
  const bgColor = event.stamp_bar_bg_color?.trim() || DEFAULT_STAMP_BAR_BG;
  const style: CSSProperties & Record<string, string> = {
    "--stamp-bar-bg-color": bgColor,
    backgroundColor: bgColor,
  };
  const bgImg = event.stamp_bar_bg_img?.trim();
  if (bgImg) {
    style["--stamp-bar-bg-image"] = `url(${JSON.stringify(bgImg)})`;
    style.backgroundImage = `url(${JSON.stringify(bgImg)})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
    style.backgroundRepeat = "no-repeat";
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
  onSearchReset?: () => void;
  customCategoryBookmarkEnabled?: boolean;
  customCategoryBookmarkedIds?: ReadonlySet<string>;
  onCustomCategoryBookmark?: (partnerId: string) => void;
};

type GoldGrantModalState = {
  gold: number;
  exp: number;
  goldBefore: number;
  goldAfter: number;
  goldIconUrl: string | null;
};
  kind: "win" | "lose" | "completion" | "distance" | "login_required";
  title: string;
  body: string;
  banner: string | null;
  rewardName: string | null;
  rewardImg: string | null;
  showGiftButton: boolean;
};

export default function MapEventMapSection(props: MapEventMapSectionProps) {
  const [isPwaMode, setIsPwaMode] = useState<boolean | null>(null);
  const [isDuplicateAccess, setIsDuplicateAccess] = useState(false);

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
  const [queuedRewardModal, setQueuedRewardModal] = useState<RewardModalState | null>(null);
  const [goldGrantModal, setGoldGrantModal] = useState<GoldGrantModalState | null>(null);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [currentGeo, setCurrentGeo] = useState<{ latitude: number; longitude: number } | null>(null);
  
  const [cooldownTargetTime, setCooldownTargetTime] = useState<number>(0);
  const [cooldownRemainMs, setCooldownRemainMs] = useState<number>(0);
  const stampReadyPushSentRef = useRef<Set<string>>(new Set());
  const forceIntroFromChatRef = useRef(false);

  const student = getSiteMemberSession()?.student;
  const userId = student?.studentId?.trim() || "";
  const isGuest = !userId;

  useEffect(() => {
    const checkEnvironment = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;

      setIsPwaMode(standalone);
    };

    checkEnvironment();

    if (!userId) return;

    const deviceSessionKey = `halla_event_device_token_${userId}`;
    let currentDeviceToken = localStorage.getItem(deviceSessionKey);
    if (!currentDeviceToken) {
      currentDeviceToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem(deviceSessionKey, currentDeviceToken);
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === deviceSessionKey && e.newValue && e.newValue !== currentDeviceToken) {
        setIsDuplicateAccess(true);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [userId]);

  const isDefaultTab = !activeTabId || activeTabId === DEFAULT_TAB_ID;
  const hasFavorites = Boolean(props.favoritePartnerIds && props.favoritePartnerIds.size > 0);

  const liveEvents = useMemo(
    () => (Array.isArray(events) ? events.filter((event) => isEventLive(event)) : []),
    [events],
  );

  const activeEvent = useMemo(
    () => (isDefaultTab ? null : liveEvents.find((event) => event.id === activeTabId) ?? null),
    [isDefaultTab, liveEvents, activeTabId],
  );

  const tabMarkerSettings = useMemo((): MapMarkerCustomSettings | null => {
    if (isDefaultTab) {
      return {
        ...(props.markerSettings ?? {}),
        topIconImg: config.default_map_marker_img?.trim() || props.markerSettings?.topIconImg || null,
      };
    }
    if (!activeEvent) {
      return props.markerSettings ?? null;
    }
    return {
      ...(props.markerSettings ?? {}),
      topIconImg: activeEvent.marker_icon_img?.trim() || null,
      borderColor: activeEvent.marker_border_color?.trim() || props.markerSettings?.borderColor || null,
      timeIcon: activeEvent.marker_time_icon?.trim() || props.markerSettings?.timeIcon || null,
      timeFormat: activeEvent.marker_time_format?.trim() || props.markerSettings?.timeFormat || null,
    };
  }, [
    activeEvent,
    config.default_map_marker_img,
    isDefaultTab,
    props.markerSettings,
  ]);

  // 🌟 원본 파트너 데이터 유지 (pinImageUrl 강제 초기화 제거)[cite: 6]
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
  const currentActivePartnerName = nearestUnstampedPartnerInside?.partner.name || "";

  const notifyStampReady = useCallback(
    (eventId: string, partnerId: string, partnerName: string, fireAt: number) => {
      if (!userId || fireAt <= 0) {
        return;
      }
      const dedupeKey = `${userId}:${eventId}:${partnerId}:${fireAt}`;
      if (stampReadyPushSentRef.current.has(dedupeKey)) {
        return;
      }
      stampReadyPushSentRef.current.add(dedupeKey);
      void fetch("/api/event/stamp-ready-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          eventId,
          clientKey: getBoardVoterKey(),
          partnerId,
          partnerName,
          eventTitle: activeEvent?.title,
        }),
      }).catch(() => undefined);
    },
    [userId, activeEvent?.title],
  );

  const scheduleStampReadyOnDevice = useCallback((fireAt: number, partnerName: string) => {
    const delay = fireAt - Date.now();
    if (delay <= 0 || typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    void navigator.serviceWorker.ready
      .then((registration) => {
        registration.active?.postMessage({
          type: "schedule-stamp-ready",
          fireAt,
          title: "도장 찍기 가능!",
          body: `${partnerName}에서 지금 바로 이벤트 도장을 찍어보세요!`,
        });
      })
      .catch(() => undefined);
  }, []);

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
        notifyStampReady(
          activeEvent.id,
          currentActivePartnerId,
          currentActivePartnerName,
          cooldownTargetTime,
        );
      } else {
        setCooldownRemainMs(remain);
      }
    };

    updateRemain();
    const timer = window.setInterval(updateRemain, 1000);
    return () => window.clearInterval(timer);
  }, [isDefaultTab, activeEvent, isGuest, currentActivePartnerId, currentActivePartnerName, cooldownTargetTime, getPartnerCooldownKey, notifyStampReady]);

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

  const handleMapSearchReset = () => {
    if (props.onPartnerSelect) {
      props.onPartnerSelect("");
    }
    props.onSearchReset?.();
  };

  useEffect(() => {
    if (isDefaultTab || !activeEvent) {
      setShowIntroModal(false);
      return;
    }

    if (forceIntroFromChatRef.current) {
      forceIntroFromChatRef.current = false;
      setShowIntroModal(true);
      return;
    }

    if (isGuest) {
      setShowIntroModal(true);
    } else {
      const hasConfirmed = localStorage.getItem(getIntroConfirmedKey(activeEvent.id));
      setShowIntroModal(!hasConfirmed);
    }
  }, [activeTabId, activeEvent, isDefaultTab, isGuest, getIntroConfirmedKey]);

  useEffect(() => {
    function onOpenMapEvent(event: Event) {
      const id = String((event as CustomEvent<{ id?: string }>).detail?.id ?? "").trim();
      if (!id) return;
      if (props.onPartnerSelect) {
        props.onPartnerSelect("");
      }
      forceIntroFromChatRef.current = true;
      setMessage(null);
      setActiveTabId(id);
      setShowIntroModal(true);
      window.requestAnimationFrame(() => {
        document.querySelector(".map-event-shell")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    window.addEventListener(OPEN_SITE_MAP_EVENT, onOpenMapEvent);
    return () => window.removeEventListener(OPEN_SITE_MAP_EVENT, onOpenMapEvent);
  }, [props.onPartnerSelect]);

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
      const response = await studentAuthFetch(
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
      const response = await studentAuthFetch("/api/event/stamp-action", {
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
          clientKey: getBoardVoterKey(),
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

      if (payload.progress) {
        setProgress(payload.progress);
      }

      const activeCooldownMinutes = Number(activeEvent?.cooldown_minutes) || 0;
      if (activeCooldownMinutes > 0) {
        const nextTargetTime = Date.now() + activeCooldownMinutes * 60_000;
        localStorage.setItem(getPartnerCooldownKey(activeEvent.id, partner.id), String(nextTargetTime));
        setCooldownTargetTime(nextTargetTime);
        setCooldownRemainMs(activeCooldownMinutes * 60_000);
        scheduleStampReadyOnDevice(nextTargetTime, partner.name);
      } else {
        localStorage.removeItem(getPartnerCooldownKey(activeEvent.id, partner.id));
        setCooldownTargetTime(0);
        setCooldownRemainMs(0);
      }

      const popupKind = payload.popup || (payload.completion?.reached ? "completion" : (payload.giftCount ?? 0) > 0 ? "win" : "lose");

      let nextReward: RewardModalState;
      if (popupKind === "completion") {
        nextReward = {
          kind: "completion",
          title: config.completion_popup_title || "완주 보상",
          body: payload.messages?.completion || "완주 보상이 선물함으로 지급되었습니다!",
          banner: activeEvent.banner_img,
          rewardName: payload.completion?.reward?.reward_name || null,
          rewardImg: payload.completion?.reward?.reward_img || null,
          showGiftButton: (payload.giftCount ?? 0) > 0,
        };
      } else if (popupKind === "win") {
        nextReward = {
          kind: "win",
          title: config.win_popup_title || "당첨",
          body: payload.messages?.win || "선물함으로 보상이 지급되었습니다!",
          banner: activeEvent.banner_img,
          rewardName: payload.step?.reward?.reward_name || null,
          rewardImg: payload.step?.reward?.reward_img || null,
          showGiftButton: true,
        };
      } else {
        nextReward = {
          kind: "lose",
          title: "미당첨",
          body: payload.messages?.lose || "아쉽지만 이번엔 당첨되지 않았습니다.",
          banner: activeEvent.banner_img,
          rewardName: null,
          rewardImg: null,
          showGiftButton: false,
        };
      }

      const seasonVisit = payload.seasonPass as {
        applied?: boolean;
        visitGold?: number;
        visitExp?: number;
        goldBefore?: number;
        goldAfter?: number;
        goldIconUrl?: string | null;
      } | undefined;
      const gainedGold = Math.max(0, Number(seasonVisit?.visitGold) || 0);
      const gainedExp = Math.max(0, Number(seasonVisit?.visitExp) || 0);
      if (seasonVisit?.applied && (gainedGold > 0 || gainedExp > 0)) {
        setGoldGrantModal({
          gold: gainedGold,
          exp: gainedExp,
          goldBefore: Math.max(0, Number(seasonVisit.goldBefore) || 0),
          goldAfter: Math.max(0, Number(seasonVisit.goldAfter) || 0),
          goldIconUrl: seasonVisit.goldIconUrl ?? null,
        });
        setQueuedRewardModal(nextReward);
        setRewardModal(null);
      } else {
        setGoldGrantModal(null);
        setQueuedRewardModal(null);
        setRewardModal(nextReward);
      }
      window.dispatchEvent(new Event("site-stamp-progress-changed"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "도장 찍기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const maxStamps = activeEvent?.max_stamps ?? 0;
  const current = isGuest ? 0 : (progress?.current_stamps ?? 0);
  const isCompleted = Boolean(progress?.is_completed || (maxStamps > 0 && current >= maxStamps));
  const completionPreview = activeEvent ? completionRewardsOf(activeEvent)[0] : null;
  const completionBadgeSrc = activeEvent?.completion_badge_img?.trim() || completionPreview?.reward_img || null;

  const isStampFeatureActive = !isDefaultTab && Boolean(activeEvent) && isEventLive(activeEvent!) && !isCompleted;

  const timerTemplate = config.cooldown_timer_template || DEFAULT_TIMER_TEMPLATE;
  const timerBadgeText = timerTemplate.includes("{remain}")
    ? timerTemplate.replace(/\{remain\}/g, formatCooldownRemain(cooldownRemainMs))
    : `${timerTemplate} ${formatCooldownRemain(cooldownRemainMs)}`;

  const hasStampBarBgImg = Boolean(activeEvent?.stamp_bar_bg_img?.trim());

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

      {!isDefaultTab && isPwaMode === false ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", padding: "24px", textAlign: "center", background: "#f9fafb", borderRadius: "16px", margin: "16px" }}>
          <div style={{ fontSize: "52px", marginBottom: "16px" }}>📱</div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111827", marginBottom: "10px" }}>
            PWA 전용 이벤트 안내
          </h2>
          <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: "1.6", wordBreak: "keep-all", marginBottom: "20px" }}>
            공정하고 원활한 이벤트 참여를 위해 이벤트 참여 기능은 일반 웹 브라우저(크롬, 사파리, 삼성 인터넷 등)에서 제한됩니다.<br />
            반드시 <b>홈 화면에 추가된 전용 PWA 앱</b>을 실행해서 참여해 주세요!
          </p>
          <div style={{ background: "#e5e7eb", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", color: "#374151", textAlign: "left" }}>
            💡 <b>홈 화면 추가 방법:</b><br />
            • 크롬/삼성: 우측 상단 메뉴 ➔ '앱 설치' 또는 '홈 화면에 추가'<br />
            • 사파리(아이폰): 하단 공유 버튼 ➔ '홈 화면에 추가'
          </div>
        </div>
      ) : !isDefaultTab && isDuplicateAccess ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", maxWidth: "340px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "42px", marginBottom: "12px" }}>⚠️</div>
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>동시 접속 감지</h3>
            <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: "1.5", marginBottom: "20px" }}>
              다른 기기 또는 다른 창에서 이미 해당 계정으로 이벤트에 접속 중입니다.<br />
              동일 계정으로 중복 접속은 이용하실 수 없습니다.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ width: "100%", background: "#059669", color: "#fff", padding: "12px", borderRadius: "8px", fontWeight: "600", border: "none", cursor: "pointer" }}
            >
              이 기기에서 다시 접속하기
            </button>
          </div>
        </div>
      ) : (
        <>
          {!isDefaultTab && activeEvent ? (
            <>
              <div 
                className={`map-event-stamp-bar${hasStampBarBgImg ? " map-event-stamp-bar--has-bg" : ""}`}
                style={stampBarCssVars(activeEvent)}
              >
                {!hasStampBarBgImg && (
                  <div className="map-event-stamp-bar__copy">
                    <p className="map-event-stamp-bar__title">{activeEvent.title}</p>
                    {!isEventLive(activeEvent) ? (
                      <p className="map-event-stamp-bar__meta">기간 종료</p>
                    ) : null}
                  </div>
                )}

                <div className="map-event-stamps" aria-hidden="true">
                  {Array.from({ length: maxStamps }, (_, index) => {
                    const filled = !isGuest && index < current;
                    const src = filled ? activeEvent.stamp_active_img : activeEvent.stamp_inactive_img;
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
                    <span className="map-event-completion-reward">
                      {completionBadgeSrc ? (
                        <img src={completionBadgeSrc} alt="" />
                      ) : (
                        <span className="map-event-completion-reward__fallback" />
                      )}
                    </span>
                  ) : null}
                </div>
              </div>
              {activeEvent.guide_text?.trim() ? (
                <p className="map-event-map-guide">{activeEvent.guide_text.trim()}</p>
              ) : null}

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

          <PartnerMainMapPanel
            key={`${activeTabId}:${tabMarkerSettings?.topIconImg ?? ""}:${tabMarkerSettings?.borderColor ?? ""}`}
            {...props}
            onSearchReset={props.onSearchReset ? handleMapSearchReset : undefined}
            markerSettings={tabMarkerSettings}
            partners={visiblePartners}
            favoriteCountdownEndAt={activeEvent?.end_at ?? null}
            statusOverlay={
              !isDefaultTab && activeEvent && !isCompleted && !rewardModal && !showIntroModal ? (
                isGuest ? (
                  <MapEventStatusChip tone="green" onClick={openLoginModal}>
                    로그인 후 도장을 찍을 수 있어요!
                  </MapEventStatusChip>
                ) : !hasFavorites ? (
                  <MapEventStatusChip tone="dark">찜한 제휴가 없습니다. 제휴의 하트를 먼저 눌러주세요!</MapEventStatusChip>
                ) : isTimerPaused ? (
                  <MapEventStatusChip tone="dark">주변 제휴처를 찾을 수 없어 타이머가 일시정지되었습니다.</MapEventStatusChip>
                ) : nearestUnstampedPartnerInside ? (
                  cooldownRemainMs > 0 ? (
                    <MapEventStatusChip tone="dark">
                      {timerBadgeText}
                    </MapEventStatusChip>
                  ) : isReadyToStamp ? (
                    <MapEventStatusChip tone="green">지금 바로 도장을 찍어보세요!</MapEventStatusChip>
                  ) : null
                ) : (
                  <MapEventStatusChip tone="dark">
                    {nearestTargetPartner
                      ? `${nearestTargetPartner.partner.name} (약 ${formatDistance(nearestTargetPartner.distance)}) · 가까운 제휴 찾으러 가볼까요?`
                      : "가까운 제휴를 찾을 수 없습니다."}
                  </MapEventStatusChip>
                )
              ) : null
            }
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

          <MapEventIntroModal
            event={activeEvent}
            isOpen={showIntroModal}
            onClose={() => setShowIntroModal(false)}
            onConfirm={handleConfirmStartEvent}
          />

          {goldGrantModal && typeof document !== "undefined"
            ? createPortal(
                <div
                  className="season-pass-claim-overlay"
                  role="presentation"
                  onClick={() => {
                    setGoldGrantModal(null);
                    if (queuedRewardModal) {
                      setRewardModal(queuedRewardModal);
                      setQueuedRewardModal(null);
                    }
                  }}
                >
                  <div
                    className="season-pass-shop-receipt"
                    role="dialog"
                    aria-modal="true"
                    aria-label="골드 획득"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="season-pass-shop-receipt__head">골드 획득</div>
                    <div className="season-pass-shop-receipt__body">
                      <div className="season-pass-shop-receipt__row">
                        <div className="season-pass-shop-receipt__art">
                          {goldGrantModal.goldIconUrl ? (
                            <img src={goldGrantModal.goldIconUrl} alt="" />
                          ) : (
                            <span />
                          )}
                        </div>
                        <div className="season-pass-shop-receipt__fields">
                          <label>
                            <span>* 아이템 이름</span>
                            <strong>제휴 도장</strong>
                          </label>
                          <label>
                            <span>* 획득 골드</span>
                            <strong>
                              {goldGrantModal.gold.toLocaleString("ko-KR")}
                              {goldGrantModal.goldIconUrl ? (
                                <img src={goldGrantModal.goldIconUrl} alt="" />
                              ) : (
                                " 골드"
                              )}
                            </strong>
                          </label>
                          {goldGrantModal.exp > 0 ? (
                            <label>
                              <span>* 획득 EXP</span>
                              <strong>{goldGrantModal.exp.toLocaleString("ko-KR")}</strong>
                            </label>
                          ) : null}
                        </div>
                      </div>
                      <dl className="season-pass-shop-receipt__gold">
                        <div>
                          <dt>현재 골드</dt>
                          <dd>
                            {goldGrantModal.goldBefore.toLocaleString("ko-KR")}
                            {goldGrantModal.goldIconUrl ? (
                              <img src={goldGrantModal.goldIconUrl} alt="" />
                            ) : (
                              " 골드"
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>획득 후 골드</dt>
                          <dd className="is-ok">
                            {goldGrantModal.goldAfter.toLocaleString("ko-KR")}
                            {goldGrantModal.goldIconUrl ? (
                              <img src={goldGrantModal.goldIconUrl} alt="" />
                            ) : (
                              " 골드"
                            )}
                          </dd>
                        </div>
                      </dl>
                      <p className="season-pass-shop-receipt__note">
                        * 제휴 도장으로 골드가 지급되었습니다.
                      </p>
                    </div>
                    <div className="season-pass-shop-receipt__actions">
                      <button
                        type="button"
                        className="is-primary"
                        onClick={() => {
                          setGoldGrantModal(null);
                          if (queuedRewardModal) {
                            setRewardModal(queuedRewardModal);
                            setQueuedRewardModal(null);
                          }
                        }}
                      >
                        확인
                      </button>
                    </div>
                  </div>
                </div>,
                document.body,
              )
            : null}

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
                      }}
                    >
                      확인
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}