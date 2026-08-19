"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createPartnerMapHtmlIcon,
  createPartnerMapUserLocationElement,
  PARTNER_MAP_USER_LOCATION_SIZE,
} from "@/lib/naver-map-partner-ui";
import {
  GeolocationError,
  getCurrentGeolocation,
  isWithinJejuIsland,
} from "@/lib/geolocation";
import { isPwaLocationAccessDisabled } from "@/lib/site-pwa-permissions";

const USER_LOCATION_ZOOM = 15;

export function usePartnerMapLocate() {
  const userLocationMarkerRef = useRef<naver.maps.Marker | null>(null);
  const locateMessageTimerRef = useRef<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateMessage, setLocateMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (locateMessageTimerRef.current != null) {
        window.clearTimeout(locateMessageTimerRef.current);
      }
    };
  }, []);

  const clearUserLocationOverlay = useCallback(() => {
    userLocationMarkerRef.current?.setMap(null);
    userLocationMarkerRef.current = null;
  }, []);

  const showLocateMessage = useCallback((message: string | null) => {
    if (locateMessageTimerRef.current != null) {
      window.clearTimeout(locateMessageTimerRef.current);
      locateMessageTimerRef.current = null;
    }

    setLocateMessage(message);

    if (message) {
      locateMessageTimerRef.current = window.setTimeout(() => {
        setLocateMessage(null);
        locateMessageTimerRef.current = null;
      }, 4000);
    }
  }, []);

  const handleLocateMe = useCallback(async (map: naver.maps.Map | null) => {
    if (!map || !window.naver?.maps || locating) {
      return;
    }

    setLocating(true);
    showLocateMessage(null);

    try {
      if (isPwaLocationAccessDisabled()) {
        showLocateMessage("앱 설정에서 위치 사용을 켜 주세요.");
        return;
      }

      const coords = await getCurrentGeolocation();
      const position = new window.naver.maps.LatLng(coords.latitude, coords.longitude);

      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setPosition(position);
      } else {
        userLocationMarkerRef.current = new window.naver.maps.Marker({
          map,
          position,
          zIndex: 200,
          icon: createPartnerMapHtmlIcon(createPartnerMapUserLocationElement(), {
            width: PARTNER_MAP_USER_LOCATION_SIZE,
            height: PARTNER_MAP_USER_LOCATION_SIZE,
            anchorX: PARTNER_MAP_USER_LOCATION_SIZE / 2,
            anchorY: PARTNER_MAP_USER_LOCATION_SIZE / 2,
          }),
        });
      }

      map.setCenter(position);
      map.setZoom(Math.max(map.getZoom(), USER_LOCATION_ZOOM));

      if (!isWithinJejuIsland(coords.latitude, coords.longitude)) {
        showLocateMessage("제주 지역 밖입니다. 현재 위치만 표시했습니다.");
      } else {
        showLocateMessage("현재 위치로 이동했습니다.");
      }
    } catch (error) {
      if (error instanceof GeolocationError) {
        showLocateMessage(error.message);
      } else {
        showLocateMessage("현재 위치를 확인하지 못했습니다.");
      }
    } finally {
      setLocating(false);
    }
  }, [locating, showLocateMessage]);

  return {
    locating,
    locateMessage,
    handleLocateMe,
    clearUserLocationOverlay,
  };
}
