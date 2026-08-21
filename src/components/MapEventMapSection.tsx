"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import PartnerMainMapPanel from "@/components/PartnerMainMapPanel";
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
const LOCAL_STORAGE_COOLDOWN_KEY = "site_place_cooldown_map";

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

  const [events, setEvents] = useState<
    (MapEvent & {
      distance_error_message?: string;
      login_required_message?: string;
      cooldown_popup_title?: string;
      cooldown_popup_message?: string;
      cooldown_timer_template?: string;
      cooldown_title?: string;
      cooldown_message?: string;
      win_popup_title?: string;
      completion_popup_title?: string;
    })[]
  >([]);
  const [activeTabId, setActiveTabId] = useState(DEFAULT_TAB_ID);
  const [progress, setProgress] = useState<UserEventProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rewardModal, setRewardModal] = useState<RewardModalState | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [placeEnteredAtMap, setPlaceEnteredAtMap] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COOLDOWN_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeNearbyPlaceId, setActiveNearbyPlaceId] = useState<string | null>(null);
  const lastKnownGeoRef = useRef<{ latitude: number; longitude: number } | null>(null);

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

  // 이벤트 탭 진입 시 즉시 시작 시간 등록
  useEffect(() => {
    if (isDefaultTab || !activeEvent || visiblePartners.length === 0) return;

    const cooldownMinutes = Math.max(0, Number(activeEvent.cooldown_minutes) || 0);
    if (cooldownMinutes <= 0) return;

    const targetPlaceId = activeNearbyPlaceId || visiblePartners[0]?.id;
    if (!targetPlaceId) return;

    if (!placeEnteredAtMap[targetPlaceId]) {
      const nowIso = new Date().toISOString();
      setPlaceEnteredAtMap((prev) => {
        const next = { ...prev, [targetPlaceId]: nowIso };
        try {
          localStorage.setItem(LOCAL_STORAGE_COOLDOWN_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, [activeTabId, activeEvent, isDefaultTab, visiblePartners, activeNearbyPlaceId, placeEnteredAtMap]);

  // 실시간 GPS 감지
  useEffect(() => {
    if (!lastKnownGeoRef.current || visiblePartners.length === 0) return;

    const currentLat = lastKnownGeoRef.current.latitude;
    const currentLng = lastKnownGeoRef.current.longitude;
    const radius = activeEvent?.radius_meters || 50;

    const nearby = visiblePartners.find((partner) => {
      const lat = Number(partner.latitude);
      const lng = Number(partner.longitude);
      if (isNaN(lat) || isNaN(lng)) return false;

      const dLat = ((lat - currentLat) * Math.PI) / 180;
      const dLng = ((lng - currentLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((currentLat * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const d = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return d <= radius;
    });

    if (nearby) {
      if (activeNearbyPlaceId !== nearby.id) {
        setActiveNearbyPlaceId(nearby.id);
        setPlaceEnteredAtMap((prev) => {
          const next = {
            ...prev,
            [nearby.id]: prev[nearby.id] || new Date().toISOString(),
          };
          try {
            localStorage.setItem(LOCAL_STORAGE_COOLDOWN_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    } else {
      setActiveNearbyPlaceId(null);
    }
  }, [nowMs, activeEvent, visiblePartners, activeNearbyPlaceId]);

  // 남은 쿨다운 시간 계산
  const currentPlaceCooldownRemainMs = useMemo(() => {
    if (!activeEvent) return 0;

    const cooldownMinutes = Math.max(0, Number(activeEvent.cooldown_minutes) || 0);
    if (cooldownMinutes <= 0) return 0;

    const targetPlaceId = activeNearbyPlaceId || visiblePartners[0]?.id;
    if (!targetPlaceId) return 0;

    const enteredAt = placeEnteredAtMap[targetPlaceId];
    if (!enteredAt) return 0;

    const enteredMs = Date.parse(enteredAt);
    return Math.max(0, enteredMs + cooldownMinutes * 60_000 - nowMs);
  }, [activeEvent, activeNearbyPlaceId, visiblePartners, placeEnteredAtMap, nowMs]);

  useEffect(() => {
    if (activeTabId === DEFAULT_TAB_ID) return;
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
      const configPayload = (await configRes.json()) as {
        config?: MapAppConfig & {
          distance_error_message?: string;
          login_required_message?: string;
          cooldown_popup_title?: string;
          cooldown_popup_message?: string;
          cooldown_timer_template?: string;
          win_popup_title?: string;
          completion_popup_title?: string;
        };
      };
      const eventsPayload = (await eventsRes.json()) as {
        events?: (MapEvent & {
          distance_error_message?: string;
          login_required_message?: string;
          cooldown_popup_title?: string;
          cooldown_popup_message?: string;
          cooldown_timer_template?: string;
          cooldown_title?: string;
          cooldown_message?: string;
          win_popup_title?: string;
          completion_popup_title?: string;
        })[];
      };
      if (configPayload.config) setConfig(configPayload.config);
      setEvents((eventsPayload.events ?? []).filter((event) => isEventLive(event)));
    } catch {}
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

  const stampedPlaceIds = useMemo(
    () => new Set(progress?.stamped_places ?? []),
    [progress],
  );

  async function handleStamp(partner: { id: string; name: string }) {
    if (isDefaultTab || !activeEvent || busy) return;
    if (!isEventLive(activeEvent)) {
      setMessage("이벤트 기간이 종료되어 도장을 찍을 수 없습니다.");
      return;
    }

    const isFavorited = Boolean(props.favoritePartnerIds?.has(partner.id));
    if (props.favoritesEnabled && !isFavorited) {
      setRewardModal({
        kind: "lose",
        title: "좋아요 매장 전용 이벤트",
        body: `먼저 '${partner.name}' 매장의 좋아요(💖)를 누른 후 도장을 찍어주세요!`,
        banner: activeEvent.banner_img || null,
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

    if (!sessionUserId || !sessionStudent || !sessionName) {
      const loginMsg =
        activeEvent.login_required_message?.trim() ||
        config.login_required_message?.trim() ||
        DEFAULT_LOGIN_REQUIRED_MSG;

      setRewardModal({
        kind: "login_required",
        title: "로그인이 필요합니다",
        body: loginMsg,
        banner: activeEvent.banner_img || null,
        rewardName: null,
        rewardImg: null,
        showGiftButton: false,
      });
      return;
    }

    if (stampedPlaceIds.has(partner.id)) return;

    // 클라이언트단 쿨다운 체크
    const cooldownMinutes = Math.max(0, Number(activeEvent.cooldown_minutes) || 0);
    const enteredAt = placeEnteredAtMap[partner.id] || placeEnteredAtMap[visiblePartners[0]?.id];
    const currentPlaceCooldown = (cooldownMinutes > 0 && enteredAt)
      ? Math.max(0, Date.parse(enteredAt) + cooldownMinutes * 60_000 - Date.now())
      : 0;

    if (currentPlaceCooldown > 0) {
      const remainText = formatCooldownRemain(currentPlaceCooldown);
      const customTitle =
        activeEvent.cooldown_popup_title?.trim() ||
        activeEvent.cooldown_title?.trim() ||
        config.cooldown_popup_title?.trim() ||
        DEFAULT_COOLDOWN_TITLE;

      const template =
        activeEvent.cooldown_popup_message?.trim() ||
        activeEvent.cooldown_message?.trim() ||
        config.cooldown_popup_message?.trim() ||
        DEFAULT_COOLDOWN_MSG;

      setRewardModal({
        kind: "lose",
        title: customTitle,
        body: template.replace(/\{remain\}/g, remainText),
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
    if (!geo || !geo.latitude || !geo.longitude) {
      try {
        const fetched = await getCurrentGeolocation({
          enableHighAccuracy: true,
          maximumAge: 30_000,
          timeout: 4000,
        });
        geo = { latitude: fetched.latitude, longitude: fetched.longitude };
        lastKnownGeoRef.current = geo;
      } catch {
        setRewardModal({
          kind: "distance",
          title: "위치 권한 확인",
          body: "현재 위치 정보를 가져올 수 없습니다. 브라우저/기기의 GPS 및 위치 권한을 확인해 주세요.",
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
        messages?: { win?: string; lose?: string; completion?: string; distance?: string };
        titles?: { win?: string; completion?: string };
        distanceError?: boolean;
        distanceMeters?: number;
        radiusMeters?: number;
        cooldownError?: boolean;
        cooldownMs?: number;
      };

      if (!response.ok) {
        // [수정] 서버에서 어색한 에러 문구가 와도, 설정된 커스텀 문구를 깔끔하게 치환하여 보여줌
        if (payload.cooldownError) {
          const remainText = payload.cooldownMs
            ? formatCooldownRemain(payload.cooldownMs)
            : formatCooldownRemain(currentPlaceCooldownRemainMs || 60_000);

          const customTitle =
            activeEvent.cooldown_popup_title?.trim() ||
            activeEvent.cooldown_title?.trim() ||
            config.cooldown_popup_title?.trim() ||
            DEFAULT_COOLDOWN_TITLE;

          const template =
            activeEvent.cooldown_popup_message?.trim() ||
            activeEvent.cooldown_message?.trim() ||
            config.cooldown_popup_message?.trim() ||
            DEFAULT_COOLDOWN_MSG;

          setRewardModal({
            kind: "lose",
            title: customTitle,
            body: template.replace(/\{remain\}/g, remainText),
            banner: null,
            rewardName: null,
            rewardImg: null,
            showGiftButton: false,
          });
          return;
        }

        if (payload.distanceError) {
          const template =
            payload.messages?.distance ||
            activeEvent.distance_error_message ||
            config.distance_error_message ||
            DEFAULT_DISTANCE_ERROR_MSG;

          const distanceVal = Math.round(payload.distanceMeters ?? 0);
          const radiusVal = Math.round(payload.radiusMeters ?? 50);

          const formattedBody = template
            .replace(/\{distance\}/g, String(distanceVal))
            .replace(/\{radius\}/g, String(radiusVal));

          setRewardModal({
            kind: "distance",
            title: "거리 확인 안내",
            body: formattedBody,
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
      } else {
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                current_stamps: prev.current_stamps + 1,
                stamped_places: [...(prev.stamped_places || []), partner.id],
              }
            : {
                event_id: activeEvent.id,
                user_id: sessionUserId,
                current_stamps: 1,
                max_stamps: activeEvent.max_stamps ?? 0,
                stamped_places: [partner.id],
                is_completed: false,
              },
        );
      }
      setNowMs(Date.now());

      const maxStamps = activeEvent.max_stamps || 5;
      const nextStampCount = payload.progress?.current_stamps ?? (progress?.current_stamps ?? 0) + 1;
      const completionReward = payload.completion?.reward;
      const winReward = payload.step?.reward || payload.guaranteed?.reward || null;
      const popupKind = payload.popup || (payload.completion?.reached ? "completion" : (payload.giftCount ?? 0) > 0 ? "win" : "lose");

      if (popupKind === "completion") {
        const completionTitle =
          payload.titles?.completion ||
          activeEvent.completion_popup_title?.trim() ||
          config.completion_popup_title?.trim() ||
          "완주 보상";

        const completionMsg =
          payload.messages?.completion ||
          (activeEvent as unknown as { completion_popup_message?: string })?.completion_popup_message ||
          "완주 보상이 선물함으로 지급되었습니다!";

        setRewardModal({
          kind: "completion",
          title: completionTitle,
          body: completionMsg,
          banner: activeEvent.banner_img,
          rewardName: completionReward?.reward_name || winReward?.reward_name || null,
          rewardImg: completionReward?.reward_img || winReward?.reward_img || null,
          showGiftButton: (payload.giftCount ?? 0) > 0,
        });
      } else if (popupKind === "win") {
        const winTitle =
          payload.titles?.win ||
          activeEvent.win_popup_title?.trim() ||
          config.win_popup_title?.trim() ||
          "당첨";

        const winMsg =
          payload.messages?.win ||
          (activeEvent as unknown as { win_popup_message?: string })?.win_popup_message ||
          "선물함으로 보상이 지급되었습니다!";

        setRewardModal({
          kind: "win",
          title: winTitle,
          body: winMsg,
          banner: activeEvent.banner_img,
          rewardName: winReward?.reward_name || null,
          rewardImg: winReward?.reward_img || null,
          showGiftButton: true,
        });
      } else {
        const loseMsg =
          payload.messages?.lose ||
          (activeEvent as unknown as { lose_popup_message?: string })?.lose_popup_message ||
          "아쉽지만 이번엔 당첨되지 않았습니다.";

        setRewardModal({
          kind: "lose",
          title: "미당첨",
          body: loseMsg,
          banner: activeEvent.banner_img,
          rewardName: null,
          rewardImg: null,
          showGiftButton: false,
        });
      }

      setTimeout(() => {
        sendMapStampLog({
          action: popupKind === "completion" ? "스탬프 완주" : "도장 찍기",
          eventTitle: activeEvent.title,
          storeName: partner.name,
          currentCount: nextStampCount,
          maxCount: maxStamps,
          studentId: sessionUserId,
          studentName: sessionName,
          department: sessionDepartment,
          rewardMessage: popupKind === "completion" ? (payload.messages?.completion || "") : undefined,
        });
      }, 0);

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
  const isCompleted = Boolean(progress?.is_completed || (maxStamps > 0 && current >= maxStamps));
  const completionPreview = activeEvent ? completionRewardsOf(activeEvent)[0] : null;
  const completionBadgeSrc =
    activeEvent?.completion_badge_img?.trim() || completionPreview?.reward_img || null;

  const isStampFeatureActive = !isDefaultTab && Boolean(activeEvent) && isEventLive(activeEvent!) && !isCompleted;

  const currentStampBtnLabel =
    (activeEvent as unknown as { stamp_btn_label?: string })?.stamp_btn_label?.trim() ||
    config.event_stamp_btn_label ||
    DEFAULT_STAMP_BTN_LABEL;

  const timerTemplate =
    activeEvent?.cooldown_timer_template?.trim() ||
    config.cooldown_timer_template?.trim() ||
    DEFAULT_TIMER_TEMPLATE;

  const timerBadgeText = timerTemplate.includes("{remain}")
    ? timerTemplate.replace(/\{remain\}/g, formatCooldownRemain(currentPlaceCooldownRemainMs))
    : `${timerTemplate} ${formatCooldownRemain(currentPlaceCooldownRemainMs)}`;

  return (
    <div className="map-event-shell" style={{ position: "relative" }}>
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

      {activeEvent && !isDefaultTab ? (
        <div className="map-event-stamp-bar" style={stampBarCssVars(activeEvent)}>
          <div className="map-event-stamp-bar__copy">
            <p className="map-event-stamp-bar__title">{activeEvent.title}</p>
            {!isEventLive(activeEvent) ? (
              <p className="map-event-stamp-bar__meta">기간 종료</p>
            ) : null}
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
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {message ? <p className="map-event-message">{message}</p> : null}

      {/* 지도 상단 실시간 타이머 플로팅 오버레이 */}
      <div style={{ position: "relative", width: "100%", overflow: "visible" }}>
        {!isDefaultTab && activeEvent && !isCompleted && currentPlaceCooldownRemainMs > 0 && (
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              backgroundColor: "rgba(17, 24, 39, 0.92)",
              backdropFilter: "blur(6px)",
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
              letterSpacing: "-0.02em",
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
                        : currentStampBtnLabel,
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
      </div>

      {rewardModal ? (
        <div className="map-event-modal" role="dialog" aria-modal="true">
          <div className="map-event-modal__card">
            {rewardModal.banner ? (
              <img src={rewardModal.banner} alt="" className="map-event-modal__banner" />
            ) : null}
            <h3 className="map-event-modal__title">{rewardModal.title}</h3>
            <p className="map-event-modal__body" style={{ whiteSpace: "pre-line" }}>{rewardModal.body}</p>
            {rewardModal.rewardImg ? (
              <img src={rewardModal.rewardImg} alt="" className="map-event-modal__reward-img" />
            ) : null}
            {rewardModal.rewardName ? (
              <p className="map-event-modal__reward">{rewardModal.rewardName}</p>
            ) : null}

            {rewardModal.kind === "login_required" ? (
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", width: "100%" }}>
                <button
                  type="button"
                  className="map-event-modal__btn"
                  style={{ background: "#6b7280", flex: 1 }}
                  onClick={() => setRewardModal(null)}
                >
                  닫기
                </button>
                <button
                  type="button"
                  className="map-event-modal__btn"
                  style={{ background: "#059669", flex: 1.2 }}
                  onClick={() => {
                    setRewardModal(null);
                    window.dispatchEvent(new Event(SITE_STUDENT_NEED_LOGIN_EVENT));
                  }}
                >
                  로그인하기
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}