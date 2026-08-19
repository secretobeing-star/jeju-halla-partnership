"use client";

import { useEffect, useRef, useState } from "react";
import PartnerMapLocateControl from "@/components/PartnerMapLocateControl";
import { loadNaverMapsSdk } from "@/lib/naver-maps-loader";
import {
  createPartnerMapHtmlIcon,
  createPartnerMapMarkerElement,
  getPartnerMapMarkerButton,
  PARTNER_MAP_MARKER_ANCHOR,
  PARTNER_MAP_MARKER_SIZE,
} from "@/lib/naver-map-partner-ui";
import { MOBILE_MAP_ZOOM } from "@/lib/partner-map-url";
import { usePartnerMapLocate } from "@/lib/use-partner-map-locate";

type NaverMapJsViewProps = {
  latitude: number;
  longitude: number;
  clientId: string;
  title?: string;
  className?: string;
  markerPartnerId?: string | null;
  markerImageUrl?: string | null;
  markerFavorited?: boolean;
  locateEnabled?: boolean;
};

export default function NaverMapJsView({
  latitude,
  longitude,
  clientId,
  title = "위치",
  className = "h-[28rem] w-full",
  markerPartnerId = null,
  markerImageUrl = null,
  markerFavorited = false,
  locateEnabled = true,
}: NaverMapJsViewProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const partnerMarkerRef = useRef<naver.maps.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { locating, locateMessage, handleLocateMe, clearUserLocationOverlay } =
    usePartnerMapLocate();

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    setMapReady(false);
    setLoadError(null);
    clearUserLocationOverlay();

    void loadNaverMapsSdk(clientId)
      .then(() => {
        if (cancelled || !mapElementRef.current || !window.naver?.maps) {
          return;
        }

        const center = new window.naver.maps.LatLng(latitude, longitude);
        const map = new window.naver.maps.Map(mapElementRef.current, {
          center,
          zoom: MOBILE_MAP_ZOOM,
          scaleControl: false,
          mapDataControl: false,
          logoControl: false,
          zoomControl: false,
        });
        mapRef.current = map;

        partnerMarkerRef.current?.setMap(null);
        partnerMarkerRef.current = null;

        if (markerPartnerId && title) {
          const markerElement = createPartnerMapMarkerElement(
            {
              id: markerPartnerId,
              name: title,
              latitude,
              longitude,
              imageUrl: markerImageUrl,
            },
            true,
            markerFavorited,
          );

          getPartnerMapMarkerButton(markerElement)?.setAttribute("tabindex", "-1");

          partnerMarkerRef.current = new window.naver.maps.Marker({
            position: center,
            map,
            title,
            icon: createPartnerMapHtmlIcon(markerElement, {
              width: PARTNER_MAP_MARKER_SIZE.width,
              height: PARTNER_MAP_MARKER_SIZE.height,
              anchorX: PARTNER_MAP_MARKER_ANCHOR.x,
              anchorY: PARTNER_MAP_MARKER_ANCHOR.y,
            }),
          });
        } else {
          partnerMarkerRef.current = new window.naver.maps.Marker({
            position: center,
            map,
            title,
          });
        }

        const resizeMap = () => {
          map.autoResize();
        };

        requestAnimationFrame(resizeMap);

        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(resizeMap);
          resizeObserver.observe(mapElementRef.current);
        }

        if (!cancelled) {
          setMapReady(true);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        mapRef.current = null;
        const message =
          error instanceof Error ? error.message : "네이버 지도를 불러오지 못했습니다.";
        setLoadError(message);
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      partnerMarkerRef.current?.setMap(null);
      partnerMarkerRef.current = null;
      clearUserLocationOverlay();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [
    clientId,
    latitude,
    longitude,
    title,
    markerPartnerId,
    markerImageUrl,
    markerFavorited,
    clearUserLocationOverlay,
  ]);

  if (loadError) {
    return (
      <div
        className={`naver-map-embed__placeholder flex items-center justify-center px-4 text-center text-xs text-gray-500 ${className}`}
      >
        {loadError}
      </div>
    );
  }

  return (
    <div className="relative">
      {!mapReady ? (
        <div
          className={`naver-map-embed__placeholder absolute inset-0 z-[1] flex items-center justify-center px-4 text-center text-xs text-gray-500 ${className}`}
          aria-hidden="true"
        >
          로딩중...
        </div>
      ) : null}
      <div
        ref={mapElementRef}
        className={className}
        role="img"
        aria-label={`${title} 네이버 지도`}
      />
      {mapReady && locateEnabled ? (
        <PartnerMapLocateControl
          locating={locating}
          locateMessage={locateMessage}
          onLocate={() => void handleLocateMe(mapRef.current)}
        />
      ) : null}
    </div>
  );
}
