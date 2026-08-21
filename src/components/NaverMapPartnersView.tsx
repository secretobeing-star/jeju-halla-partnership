"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_BENEFIT_BTN_LABEL,
  DEFAULT_STAMP_BTN_LABEL,
} from "@/lib/map-events";
import {
  createPartnerMapClusterIcon,
  createPartnerMapMarkerElement,
  createPartnerMapMiniCardElement,
  type MapMarkerCustomSettings,
} from "@/lib/naver-map-partner-ui";

type PartnerPoint = {
  id: string;
  name: string;
  latitude: number | string | null;
  longitude: number | string | null;
  category?: string | null;
  address?: string | null;
  image_url?: string | null;
  pinImageUrl?: string | null;
  benefit?: string | null;
};

type MapStampActionOptions = {
  enabled: boolean;
  stampedPlaceIds?: ReadonlySet<string> | Set<string>;
  label?: string;
  onStamp: (partner: { id: string; name: string }) => void;
};

type OverlayLike = {
  setMap: (map: any) => void;
};

type NaverMapPartnersViewProps = {
  partners: PartnerPoint[];
  selectedPartnerId?: string | null;
  onPartnerSelect?: (partnerId: string) => void;
  favoritesEnabled?: boolean;
  favoritePartnerIds?: ReadonlySet<string>;
  onFavoriteToggle?: (partnerId: string) => void;
  favoritesTerm?: string;
  stampAction?: MapStampActionOptions;
  markerSettings?: MapMarkerCustomSettings | null;
  detailButtonLabel?: string;
  onMapReady?: () => void;
};

export default function NaverMapPartnersView({
  partners,
  selectedPartnerId,
  onPartnerSelect,
  favoritesEnabled = false,
  favoritePartnerIds,
  onFavoriteToggle,
  favoritesTerm = "좋아요",
  stampAction,
  markerSettings,
  detailButtonLabel = DEFAULT_BENEFIT_BTN_LABEL,
  onMapReady,
}: NaverMapPartnersViewProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const clustererRef = useRef<any>(null);
  const miniCardOverlayRef = useRef<OverlayLike | null>(null);
  const miniCardElementRef = useRef<HTMLElement | null>(null);

  const favoritesEnabledRef = useRef(favoritesEnabled);
  favoritesEnabledRef.current = favoritesEnabled;

  const favoritePartnerIdsRef = useRef(favoritePartnerIds);
  favoritePartnerIdsRef.current = favoritePartnerIds;

  const favoritesTermRef = useRef(favoritesTerm);
  favoritesTermRef.current = favoritesTerm;

  const onFavoriteToggleRef = useRef(onFavoriteToggle);
  onFavoriteToggleRef.current = onFavoriteToggle;

  const onPartnerClickRef = useRef(onPartnerSelect);
  onPartnerClickRef.current = onPartnerSelect;

  const stampActionRef = useRef(stampAction);
  stampActionRef.current = stampAction;

  const detailButtonLabelRef = useRef(detailButtonLabel);
  detailButtonLabelRef.current = detailButtonLabel;

  const markerSettingsRef = useRef(markerSettings);
  markerSettingsRef.current = markerSettings;

  const effectiveStampLabel = stampAction?.label || DEFAULT_STAMP_BTN_LABEL;

  const closeMiniCard = useCallback((clearRef = true) => {
    if (miniCardOverlayRef.current) {
      try {
        miniCardOverlayRef.current.setMap(null);
      } catch {}
      if (clearRef) {
        miniCardOverlayRef.current = null;
        miniCardElementRef.current = null;
      }
    }
  }, []);

  const openMiniCard = useCallback(
    (partner: PartnerPoint) => {
      const map = mapInstanceRef.current;
      if (!map || !window.naver?.maps) return;

      const lat = Number(partner.latitude);
      const lng = Number(partner.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      closeMiniCard(true);

      const isFav = Boolean(
        favoritesEnabledRef.current &&
          favoritePartnerIdsRef.current?.has(String(partner.id))
      );
      const isAlreadyStamped = Boolean(
        stampActionRef.current?.stampedPlaceIds?.has(String(partner.id))
      );
      const isStampDisabledByFav = Boolean(
        favoritesEnabledRef.current && !isFav
      );

      const resolvedPartner = {
        ...partner,
        latitude: lat,
        longitude: lng,
      };

      const cardElement = createPartnerMapMiniCardElement(
        resolvedPartner as any,
        () => {
          closeMiniCard(true);
          onPartnerClickRef.current?.(partner.id);
        },
        {
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
          stamp: stampActionRef.current?.enabled
            ? {
                visible: true,
                disabled: isAlreadyStamped || isStampDisabledByFav,
                label: isStampDisabledByFav
                  ? "좋아요 필요"
                  : isAlreadyStamped
                    ? "도장 완료"
                    : (stampActionRef.current?.label || effectiveStampLabel),
                onStamp: () => {
                  if (isStampDisabledByFav || isAlreadyStamped) return;
                  stampActionRef.current?.onStamp(partner);
                },
              }
            : undefined,
          detailLabel:
            detailButtonLabelRef.current || DEFAULT_BENEFIT_BTN_LABEL,
        }
      );

      miniCardElementRef.current = cardElement;

      const position = new window.naver.maps.LatLng(lat, lng);
      const overlay = new window.naver.maps.OverlayView();

      overlay.onAdd = function () {
        const panes = this.getPanes();
        panes.floatPane.appendChild(cardElement);
      };

      overlay.draw = function () {
        const projection = this.getProjection();
        if (!projection || !cardElement) return;
        const pixel = projection.fromCoordToOffset(position);
        cardElement.style.left = `${pixel.x}px`;
        cardElement.style.top = `${pixel.y - 12}px`;
      };

      overlay.onRemove = function () {
        if (cardElement.parentElement) {
          cardElement.parentElement.removeChild(cardElement);
        }
      };

      overlay.setMap(map);
      miniCardOverlayRef.current = overlay;

      if (typeof (map as any).panTo === "function") {
        (map as any).panTo(position);
      } else {
        map.setCenter(position);
      }
    },
    [closeMiniCard, effectiveStampLabel]
  );

  useEffect(() => {
    if (!mapElementRef.current || mapInstanceRef.current || !window.naver?.maps)
      return;

    const initialCenter = new window.naver.maps.LatLng(33.3846, 126.5535);
    const mapOptions: any = {
      center: initialCenter,
      zoom: 10,
      minZoom: 8,
      maxZoom: 19,
      zoomControl: true,
      zoomControlOptions: {
        position: window.naver.maps.Position.RIGHT_BOTTOM,
      },
    };

    const map = new window.naver.maps.Map(mapElementRef.current, mapOptions);

    mapInstanceRef.current = map;

    window.naver.maps.Event.addListener(map, "click", () => {
      closeMiniCard(true);
    });

    onMapReady?.();
  }, [closeMiniCard, onMapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const newMarkers = partners
      .filter((p) => {
        const lat = Number(p.latitude);
        const lng = Number(p.longitude);
        return Number.isFinite(lat) && Number.isFinite(lng);
      })
      .map((partner) => {
        const lat = Number(partner.latitude);
        const lng = Number(partner.longitude);
        const position = new window.naver.maps.LatLng(lat, lng);

        const isFav = Boolean(
          favoritesEnabledRef.current &&
            favoritePartnerIdsRef.current?.has(String(partner.id))
        );

        const resolvedPartner = {
          ...partner,
          latitude: lat,
          longitude: lng,
        };

        const markerEl = createPartnerMapMarkerElement(
          resolvedPartner as any,
          isFav,
          markerSettingsRef.current
        );

        const marker = new window.naver.maps.Marker({
          position,
          map,
          icon: {
            content: markerEl,
            anchor: new window.naver.maps.Point(20, 20),
          },
        });

        window.naver.maps.Event.addListener(marker, "click", () => {
          openMiniCard(partner);
        });

        return marker;
      });

    markersRef.current = newMarkers;

    if (clustererRef.current) {
      try {
        clustererRef.current.setMap(null);
      } catch {}
    }

    if ((window as any).MarkerClustering) {
      clustererRef.current = new (window as any).MarkerClustering({
        minClusterSize: 2,
        maxZoom: 13,
        map,
        markers: newMarkers,
        disableClickZoom: false,
        gridSize: 120,
        icons: [createPartnerMapClusterIcon()],
        indexGenerator: [10, 20, 50, 100],
        stylingFunction: (clusterMarker: any, count: number) => {
          const el = clusterMarker
            .getElement()
            ?.querySelector(".partner-map-cluster");
          if (el) {
            el.textContent = String(count);
          }
        },
      });
    }
  }, [partners, openMiniCard]);

  useEffect(() => {
    if (!selectedPartnerId) return;
    const target = partners.find((p) => String(p.id) === String(selectedPartnerId));
    if (target) {
      openMiniCard(target);
    }
  }, [selectedPartnerId, partners, openMiniCard]);

  return (
    <div
      ref={mapElementRef}
      style={{
        width: "100%",
        height: "500px",
        minHeight: "400px",
        borderRadius: "12px",
        position: "relative",
        overflow: "hidden",
      }}
    />
  );
}