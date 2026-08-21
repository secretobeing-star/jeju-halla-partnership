"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadNaverMapsSdk } from "@/lib/naver-maps-loader";
import {
  createPartnerMapHtmlIcon,
  createPartnerMapClusterIcon,
  createPartnerMapMarkerElement,
  createPartnerMapMiniCardElement,
  getMapPartnerMarkersSignature,
  getPartnerMapMarkerButton,
  PARTNER_MAP_MARKER_ANCHOR,
  PARTNER_MAP_MARKER_SIZE,
  parsePartnerMapCoordinate,
  stylePartnerMapClusterMarker,
  updatePartnerMapMarkerFavorite,
  updatePartnerMapMiniCardFavorite,
  upsertPartnerMapCountdownBadge,
  type MapMarkerCustomSettings,
  type NaverMapPartnerMarker,
} from "@/lib/naver-map-partner-ui";
import { createPartnerMapMiniCardOverlay } from "@/lib/naver-map-mini-card-overlay";
import { refreshMapLayout, SITE_MAP_REFRESH_EVENT } from "@/lib/naver-map-layout";
import { usePartnerMapLocate } from "@/lib/use-partner-map-locate";
import PartnerMapLocateControl from "@/components/PartnerMapLocateControl";
import { hasValidPartnerMapCoords } from "@/lib/partner-map-url";
import { formatHeartCountdown, type MapEvent } from "@/lib/map-events";
import { supabase } from "@/lib/supabase";

export type { NaverMapPartnerMarker };

// 제주도 기본 중심 좌표
const JEJU_CENTER = { latitude: 33.3617, longitude: 126.5292 };
const MARKER_SIZE = PARTNER_MAP_MARKER_SIZE;
const MARKER_ANCHOR = PARTNER_MAP_MARKER_ANCHOR;
const MARKER_VISUAL_TOP_OFFSET = MARKER_ANCHOR.y + 14;
const MINI_CARD_MARKER_GAP = 12;
const EMPTY_ZOOM = 10;
const SINGLE_ZOOM = 15;
const FIT_BOUNDS_MARGIN = 70;

function formatEventTimeBadge(endAt: string, timeIcon = "⏰", timeFormat = "D_DAY_TIME"): string | null {
  if (timeFormat === "NONE") return null;

  const target = new Date(endAt).getTime();
  const now = Date.now();
  const diffMs = target - now;

  if (diffMs <= 0) return "종료";

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const icon = timeIcon ? `${timeIcon} ` : "";

  if (timeFormat === "D_DAY") {
    return `${icon}D-${days > 0 ? days : "Day"}`;
  }

  if (timeFormat === "TIME_ONLY") {
    const totalHours = Math.floor(totalSec / 3600);
    return `${icon}${pad(totalHours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  if (days > 0) {
    return `${icon}${days}일 ${pad(hours)}:${pad(minutes)}`;
  }
  return `${icon}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

type NaverMapPartnersViewProps = {
  partners: NaverMapPartnerMarker[];
  clientId: string;
  className?: string;
  onPartnerClick?: (partnerId: string) => void;
  favoritesEnabled?: boolean;
  favoritePartnerIds?: ReadonlySet<string>;
  locateEnabled?: boolean;
  favoritesTerm?: string;
  holdLoadingOverlay?: boolean;
  onReady?: () => void;
  onFavoriteToggle?: (partnerId: string) => void;
  stampAction?: {
    enabled: boolean;
    stampedPlaceIds: ReadonlySet<string>;
    label?: string;
    onStamp: (partner: NaverMapPartnerMarker) => void;
  };
  favoriteCountdownEndAt?: string | null;
  detailButtonLabel?: string;
  markerSettings?: MapMarkerCustomSettings | null;
};

export default function NaverMapPartnersView({
  partners,
  clientId,
  className = "",
  onPartnerClick,
  favoritesEnabled = false,
  favoritePartnerIds,
  locateEnabled = true,
  favoritesTerm = "즐겨찾기",
  holdLoadingOverlay = false,
  onReady,
  onFavoriteToggle,
  stampAction,
  favoriteCountdownEndAt = null,
  detailButtonLabel,
  markerSettings: initialMarkerSettings = null,
}: NaverMapPartnersViewProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const miniCardOverlayRef = useRef<ReturnType<typeof createPartnerMapMiniCardOverlay> | null>(null);
  const miniCardElementRef = useRef<HTMLElement | null>(null);
  const markerClusteringRef = useRef<naver.maps.MarkerClustering | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const markerElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const mapListenersRef = useRef<unknown[]>([]);
  const onPartnerClickRef = useRef(onPartnerClick);
  const onFavoriteToggleRef = useRef(onFavoriteToggle);
  const stampActionRef = useRef(stampAction);
  const detailButtonLabelRef = useRef(detailButtonLabel);
  const favoriteCountdownEndAtRef = useRef(favoriteCountdownEndAt);
  const selectedPartnerIdRef = useRef<string | null>(null);
  const ignoreNextMapClickRef = useRef(false);
  const favoritePartnerIdsRef = useRef(favoritePartnerIds);
  const favoritesEnabledRef = useRef(favoritesEnabled);
  const favoritesTermRef = useRef(favoritesTerm);
  const mapMarkersSignatureRef = useRef("");
  const holdLoadingOverlayRef = useRef(holdLoadingOverlay);
  const wasHoldingLoadingRef = useRef(holdLoadingOverlay);
  const { locating, locateMessage, handleLocateMe, clearUserLocationOverlay } =
    usePartnerMapLocate();
  const [mapReady, setMapReady] = useState(false);
  const [tilesReady, setTilesReady] = useState(false);
  const [mapRevealed, setMapRevealed] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeDbEvent, setActiveDbEvent] = useState<MapEvent | null>(null);

  useEffect(() => {
    let isCancelled = false;
    async function fetchActiveEvent() {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          const res = await fetch("/api/map-events");
          const json = (await res.json()) as { events?: MapEvent[] };
          if (!isCancelled && json.events?.length) {
            const ev = json.events.find((e) => e.is_active) ?? json.events[0];
            setActiveDbEvent(ev);
          }
          return;
        }

        if (!isCancelled && data && data.length > 0) {
          setActiveDbEvent(data[0] as MapEvent);
        }
      } catch {}
    }
    void fetchActiveEvent();
    return () => {
      isCancelled = true;
    };
  }, []);

  const effectiveEndAt = favoriteCountdownEndAt || activeDbEvent?.end_at || null;
  const effectiveStampLabel =
    stampAction?.label?.trim() ||
    activeDbEvent?.stamp_btn_label?.trim() ||
    "도장 찍기";

  const effectiveMarkerSettings = useMemo<MapMarkerCustomSettings>(() => {
    const extra = (activeDbEvent ?? {}) as unknown as {
      marker_border_color?: string;
      marker_time_icon?: string;
      marker_time_format?: string;
    };

    return {
      borderColor: extra.marker_border_color || initialMarkerSettings?.borderColor || null,
      topIconImg: activeDbEvent?.marker_icon_img || initialMarkerSettings?.topIconImg || null,
      timeIcon: extra.marker_time_icon || initialMarkerSettings?.timeIcon || "🔥",
      timeFormat: extra.marker_time_format || initialMarkerSettings?.timeFormat || "D_DAY_TIME",
      thumbnailEnabled: initialMarkerSettings?.thumbnailEnabled ?? true,
      bgImg: initialMarkerSettings?.bgImg || null,
    };
  }, [initialMarkerSettings, activeDbEvent]);

  const markerSettingsRef = useRef(effectiveMarkerSettings);

  const normalizedPartners = useMemo<NaverMapPartnerMarker[]>(
    () =>
      partners.flatMap((partner) => {
        const latitude = parsePartnerMapCoordinate(partner.latitude);
        const longitude = parsePartnerMapCoordinate(partner.longitude);
        if (
          latitude === null ||
          longitude === null ||
          !hasValidPartnerMapCoords(latitude, longitude)
        ) {
          return [];
        }

        return [
          {
            ...partner,
            latitude: latitude as number,
            longitude: longitude as number,
          } as NaverMapPartnerMarker,
        ];
      }),
    [partners],
  );

  useEffect(() => {
    holdLoadingOverlayRef.current = holdLoadingOverlay;
  }, [holdLoadingOverlay]);

  useEffect(() => {
    onPartnerClickRef.current = onPartnerClick;
  }, [onPartnerClick]);

  useEffect(() => {
    onFavoriteToggleRef.current = onFavoriteToggle;
  }, [onFavoriteToggle]);

  useEffect(() => {
    markerSettingsRef.current = effectiveMarkerSettings;
  }, [effectiveMarkerSettings]);

  useEffect(() => {
    stampActionRef.current = stampAction;
  }, [stampAction]);

  useEffect(() => {
    detailButtonLabelRef.current = detailButtonLabel;
    const openCard = miniCardElementRef.current;
    if (openCard && detailButtonLabel) {
      const detailBtn = openCard.querySelector<HTMLButtonElement>(".partner-map-mini-card__detail-btn");
      if (detailBtn) {
        detailBtn.textContent = detailButtonLabel;
      }
    }
  }, [detailButtonLabel]);

  useEffect(() => {
    favoriteCountdownEndAtRef.current = effectiveEndAt;
  }, [effectiveEndAt]);

  useEffect(() => {
    favoritePartnerIdsRef.current = favoritePartnerIds;
    favoritesEnabledRef.current = favoritesEnabled;
    favoritesTermRef.current = favoritesTerm;
  }, [favoritePartnerIds, favoritesEnabled, favoritesTerm]);

  useEffect(() => {
    if (!mapReady || !favoritesEnabled) {
      return;
    }

    for (const [partnerId, element] of markerElementsRef.current.entries()) {
      updatePartnerMapMarkerFavorite(
        element,
        Boolean(favoritePartnerIds?.has(partnerId)),
      );
    }

    const openCard = miniCardElementRef.current;
    const openPartnerId = selectedPartnerIdRef.current;
    if (openCard && openPartnerId) {
      const partnerName =
        openCard.querySelector(".partner-map-mini-card__title")?.textContent ?? "";
      updatePartnerMapMiniCardFavorite(openCard, Boolean(favoritePartnerIds?.has(openPartnerId)), {
        partnerName,
        favoritesTerm,
      });
    }
  }, [favoritePartnerIds, favoritesEnabled, favoritesTerm, mapReady]);

  // 지도 초기화
  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    setLoadError(null);
    setTilesReady(false);
    setMapReady(false);
    setMapRevealed(false);
    mapRef.current = null;

    void loadNaverMapsSdk(clientId, ["markerClustering"], { waitForSubmodules: true })
      .then(() => {
        if (cancelled) return;

        const initMap = () => {
          if (mapRef.current) return true;
          const mapContainer = mapElementRef.current;
          if (!mapContainer || !window.naver?.maps) return false;

          const map = new window.naver.maps.Map(mapContainer, {
            center: new window.naver.maps.LatLng(JEJU_CENTER.latitude, JEJU_CENTER.longitude),
            zoom: EMPTY_ZOOM,
            scaleControl: false,
            mapDataControl: false,
            logoControl: false,
            zoomControl: false,
          });

          mapRef.current = map;
          mapListenersRef.current = [
            window.naver.maps.Event.addListener(map, "click", () => {
              if (ignoreNextMapClickRef.current) {
                ignoreNextMapClickRef.current = false;
                return;
              }
              miniCardOverlayRef.current?.close();
              miniCardOverlayRef.current = null;
              miniCardElementRef.current = null;
              selectedPartnerIdRef.current = null;
              for (const element of markerElementsRef.current.values()) {
                getPartnerMapMarkerButton(element)?.classList.remove("partner-map-marker--selected");
              }
            }),
            window.naver.maps.Event.addListener(map, "idle", () => {
              if (!holdLoadingOverlayRef.current) {
                setTilesReady(true);
              }
              map.autoResize();
              miniCardOverlayRef.current?.draw?.();
            }),
          ];

          const resizeMap = () => {
            map.autoResize();
            miniCardOverlayRef.current?.draw?.();
          };

          refreshMapLayout(map);

          if (typeof ResizeObserver !== "undefined") {
            resizeObserver?.disconnect();
            resizeObserver = new ResizeObserver(resizeMap);
            resizeObserver.observe(mapContainer);
          }

          return true;
        };

        if (initMap()) {
          setMapReady(true);
          return;
        }

        let attempts = 0;
        const retryInit = () => {
          if (cancelled) return;
          if (initMap()) {
            setMapReady(true);
            return;
          }
          attempts += 1;
          if (attempts < 40) {
            requestAnimationFrame(retryInit);
            return;
          }
          setLoadError("지도를 초기화하지 못했습니다. 새로고침 후 다시 시도해 주세요.");
        };

        requestAnimationFrame(retryInit);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "네이버 지도를 불러오지 못했습니다.");
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      for (const listener of mapListenersRef.current) {
        window.naver?.maps?.Event.removeListener(listener);
      }
      mapListenersRef.current = [];
      miniCardOverlayRef.current?.close();
      miniCardOverlayRef.current = null;
      miniCardElementRef.current = null;
      markerClusteringRef.current?.setMap(null);
      markerClusteringRef.current = null;
      for (const marker of markersRef.current) {
        marker.setMap(null);
      }
      markersRef.current = [];
      markerElementsRef.current.clear();
      clearUserLocationOverlay();
      mapRef.current = null;
    };
  }, [clientId, clearUserLocationOverlay]);

  // 마커 렌더링
  useEffect(() => {
    const map = mapRef.current;
    const mapContainer = mapElementRef.current;
    if (!mapReady || !map || !mapContainer || !window.naver?.maps) {
      return;
    }

    const activeMap = map;
    const validPartners = normalizedPartners.filter((partner) =>
      hasValidPartnerMapCoords(partner.latitude, partner.longitude),
    );

    const favKey = Array.from(favoritePartnerIds ?? []).sort().join(",");
    const pinSignature = validPartners
      .map((partner) => `${partner.id}:${partner.pinImageUrl ?? ""}`)
      .join("|");
    const nextSignature = `${getMapPartnerMarkersSignature(validPartners)}:${Boolean(stampAction?.enabled)}:${detailButtonLabel ?? ""}:${favKey}:${pinSignature}:${effectiveMarkerSettings?.topIconImg ?? ""}`;

    if (mapMarkersSignatureRef.current === nextSignature && markersRef.current.length > 0) {
      return;
    }
    mapMarkersSignatureRef.current = nextSignature;

    // 이전 마커 정리
    if (markerClusteringRef.current) {
      markerClusteringRef.current.setMap(null);
      markerClusteringRef.current = null;
    }
    for (const marker of markersRef.current) {
      marker.setMap(null);
    }
    markersRef.current = [];
    markerElementsRef.current.clear();

    if (validPartners.length === 0) {
      setTilesReady(true);
      return;
    }

    const bounds = new window.naver.maps.LatLngBounds();
    const markers: naver.maps.Marker[] = [];

    function closeMiniCard(resetSelection = true) {
      miniCardOverlayRef.current?.close();
      miniCardOverlayRef.current = null;
      miniCardElementRef.current = null;
      if (resetSelection) {
        selectedPartnerIdRef.current = null;
        for (const element of markerElementsRef.current.values()) {
          getPartnerMapMarkerButton(element)?.classList.remove("partner-map-marker--selected");
        }
      }
    }

    function openMiniCard(partner: NaverMapPartnerMarker, position: naver.maps.LatLng) {
      closeMiniCard(false);
      selectedPartnerIdRef.current = partner.id;

      for (const [partnerId, element] of markerElementsRef.current.entries()) {
        getPartnerMapMarkerButton(element)?.classList.toggle(
          "partner-map-marker--selected",
          partnerId === partner.id,
        );
      }

      const activeStampAction = stampActionRef.current ?? stampAction;
      const isFav = Boolean(
        favoritesEnabledRef.current && favoritePartnerIdsRef.current?.has(partner.id)
      );

      // 💡 [핵심] 즐겨찾기(좋아요)가 켜져 있을 때, 좋아요가 안 된 매장은 stamp 버튼을 아예 생성하지 않음(undefined)
      const showStampButton = Boolean(activeStampAction?.enabled) && (!favoritesEnabledRef.current || isFav);
      const isAlreadyStamped = Boolean(activeStampAction?.stampedPlaceIds?.has(partner.id));

      const card = createPartnerMapMiniCardElement(partner, () => {
        miniCardOverlayRef.current?.close();
        miniCardOverlayRef.current = null;
        miniCardElementRef.current = null;
        onPartnerClickRef.current?.(partner.id);
      }, {
        favorited: isFav,
        favoritesEnabled: favoritesEnabledRef.current,
        favoritesTerm: favoritesTermRef.current,
        onClose: () => {
          closeMiniCard(true);
        },
        onFavoriteToggle: favoritesEnabledRef.current
          ? () => {
              onFavoriteToggleRef.current?.(partner.id);
            }
          : undefined,
        stamp: showStampButton
          ? {
              visible: true,
              disabled: isAlreadyStamped,
              label: isAlreadyStamped
                ? "도장 완료"
                : (activeStampAction?.label || effectiveStampLabel),
              onStamp: () => {
                if (isAlreadyStamped) return;
                activeStampAction?.onStamp(partner);
              },
            }
          : undefined,
        detailLabel: detailButtonLabelRef.current || detailButtonLabel,
      });
      miniCardElementRef.current = card;

      miniCardOverlayRef.current = createPartnerMapMiniCardOverlay({
        map: activeMap,
        mapContainer,
        position,
        element: card,
        anchorOffsetY: -(MARKER_VISUAL_TOP_OFFSET + MINI_CARD_MARKER_GAP),
        markerVisualTopOffset: MARKER_VISUAL_TOP_OFFSET,
        markerGap: MINI_CARD_MARKER_GAP,
        placement: "marker",
      });

      ignoreNextMapClickRef.current = true;
      window.requestAnimationFrame(() => {
        miniCardOverlayRef.current?.draw?.();
      });
    }

    for (const partner of validPartners) {
      const position = new window.naver.maps.LatLng(partner.latitude, partner.longitude);
      bounds.extend(position);

      const isFav = favoritesEnabled && Boolean(favoritePartnerIds?.has(partner.id));

      const favoriteTopIconImg =
        partner.pinImageUrl?.trim() ||
        effectiveMarkerSettings.topIconImg?.trim() ||
        null;

      const markerCustomSettings = isFav
        ? { ...effectiveMarkerSettings, topIconImg: favoriteTopIconImg }
        : { ...effectiveMarkerSettings, topIconImg: null };

      const markerElement = createPartnerMapMarkerElement(
        partner,
        false,
        isFav,
        markerCustomSettings,
      );
      markerElementsRef.current.set(partner.id, markerElement);

      const marker = new window.naver.maps.Marker({
        position,
        title: partner.name,
        map: activeMap,
        icon: {
          ...createPartnerMapHtmlIcon(markerElement, {
            width: MARKER_SIZE.width,
            height: MARKER_SIZE.height,
            anchorX: MARKER_ANCHOR.x,
            anchorY: MARKER_ANCHOR.y,
          }),
        },
      });
      markers.push(marker);

      const markerButton = getPartnerMapMarkerButton(markerElement);
      markerButton?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openMiniCard(partner, position);
      });
    }

    markersRef.current = markers;

    // 클러스터링 적용
    if (markers.length > 1 && window.naver.maps.MarkerClustering) {
      try {
        markerClusteringRef.current = new window.naver.maps.MarkerClustering({
          map: activeMap,
          markers,
          minClusterSize: 2,
          maxZoom: 18,
          gridSize: 140,
          disableClickZoom: false,
          icons: [
            createPartnerMapClusterIcon(40),
            createPartnerMapClusterIcon(46),
            createPartnerMapClusterIcon(52),
            createPartnerMapClusterIcon(58),
          ],
          indexGenerator: [10, 30, 60, 100],
          stylingFunction: stylePartnerMapClusterMarker,
        });
      } catch {}
    }

    // 제휴처 위치 범위에 맞춘 카메라 최적화
    if (validPartners.length === 1) {
      activeMap.setCenter(new window.naver.maps.LatLng(validPartners[0].latitude, validPartners[0].longitude));
      activeMap.setZoom(SINGLE_ZOOM);
    } else if (validPartners.length > 1) {
      activeMap.fitBounds(bounds, FIT_BOUNDS_MARGIN);
      window.setTimeout(() => {
        const fittedZoom = activeMap.getZoom();
        if (fittedZoom > 16) {
          activeMap.setZoom(15);
        } else if (fittedZoom < 10) {
          activeMap.setZoom(10);
        }
      }, 50);
    } else {
      activeMap.setCenter(new window.naver.maps.LatLng(JEJU_CENTER.latitude, JEJU_CENTER.longitude));
      activeMap.setZoom(EMPTY_ZOOM);
    }

    setTilesReady(true);
    refreshMapLayout(activeMap);
  }, [
    clientId,
    detailButtonLabel,
    mapReady,
    effectiveMarkerSettings,
    normalizedPartners,
    effectiveStampLabel,
    favoritePartnerIds,
    favoritesEnabled,
    stampAction,
  ]);

  useEffect(() => {
    const wasHolding = wasHoldingLoadingRef.current;
    wasHoldingLoadingRef.current = holdLoadingOverlay;
    if (holdLoadingOverlay) {
      setTilesReady(false);
      return;
    }
    if (!wasHolding || !mapReady) return;

    const map = mapRef.current;
    if (!map || !window.naver?.maps) {
      setTilesReady(true);
      return;
    }

    setTilesReady(true);
    refreshMapLayout(map);
  }, [holdLoadingOverlay, mapReady]);

  useEffect(() => {
    if (mapReady && tilesReady && !holdLoadingOverlay) {
      setMapRevealed(true);
    }
  }, [holdLoadingOverlay, mapReady, tilesReady]);

  useEffect(() => {
    const refreshVisibleMap = () => {
      const map = mapRef.current;
      if (!map) return;
      refreshMapLayout(map, () => {
        miniCardOverlayRef.current?.draw?.();
      });
    };
    window.addEventListener(SITE_MAP_REFRESH_EVENT, refreshVisibleMap);
    return () => window.removeEventListener(SITE_MAP_REFRESH_EVENT, refreshVisibleMap);
  }, []);

  useEffect(() => {
    if (loadError || (mapReady && tilesReady)) {
      onReady?.();
    }
  }, [loadError, mapReady, onReady, tilesReady]);

  const canvasClassName = ["partner-main-map__canvas", className].filter(Boolean).join(" ");
  const showLoadingOverlay =
    holdLoadingOverlay || (!mapRevealed && (!mapReady || !tilesReady));

  return (
    <div className="partner-main-map__stage relative">
      {loadError ? (
        <div
          className="partner-main-map__loading-overlay partner-main-map__loading-overlay--error"
          role="alert"
        >
          {loadError}
        </div>
      ) : showLoadingOverlay ? (
        <div className="partner-main-map__loading-overlay" aria-live="polite">
          <span className="partner-main-map__loading-text">로딩중...</span>
        </div>
      ) : null}
      <div
        ref={mapElementRef}
        className={canvasClassName}
        role="img"
        aria-label="제휴 업체 지도"
      />
      {mapReady && tilesReady && !holdLoadingOverlay && !loadError && locateEnabled ? (
        <PartnerMapLocateControl
          locating={locating}
          locateMessage={locateMessage}
          onLocate={() => void handleLocateMe(mapRef.current)}
          onRefresh={() => {
            const map = mapRef.current;
            if (!map) return;
            refreshMapLayout(map, () => {
              miniCardOverlayRef.current?.draw?.();
            });
          }}
        />
      ) : null}
    </div>
  );
}