"use client";

import { useMemo } from "react";
import NaverMapJsView from "@/components/NaverMapJsView";
import {
  buildPartnerMapEmbedUrl,
  buildPartnerMapMobileFallbackEmbedUrl,
  hasValidPartnerMapCoords,
} from "@/lib/partner-map-url";
import { useNaverMapConfig } from "@/lib/use-naver-map-config";
import { useNarrowViewport } from "@/lib/use-narrow-viewport";

type NaverMapEmbedProps = {
  latitude: number;
  longitude: number;
  title?: string;
  embedUrl?: string | null;
  iframeClassName?: string;
  address?: string | null;
  mapUrl?: string | null;
  markerPartnerId?: string | null;
  markerImageUrl?: string | null;
  markerFavorited?: boolean;
  locateEnabled?: boolean;
};

export default function NaverMapEmbed({
  latitude,
  longitude,
  title = "위치",
  embedUrl = null,
  iframeClassName = "h-48 w-full sm:h-56",
  address = null,
  mapUrl = null,
  markerPartnerId = null,
  markerImageUrl = null,
  markerFavorited = false,
  locateEnabled = true,
}: NaverMapEmbedProps) {
  const isMobile = useNarrowViewport();
  const { clientId, loading: configLoading, available: naverJsAvailable } = useNaverMapConfig();
  const hasCoords = hasValidPartnerMapCoords(latitude, longitude);
  const useNaverJs = hasCoords && naverJsAvailable;

  const fallbackMobileSrc = useMemo(() => {
    if (!isMobile || useNaverJs || configLoading || !hasCoords) {
      return "";
    }

    return buildPartnerMapMobileFallbackEmbedUrl(latitude, longitude) ?? "";
  }, [configLoading, hasCoords, isMobile, latitude, longitude, useNaverJs]);

  const desktopIframeSrc = useMemo(() => {
    if (isMobile || useNaverJs) {
      return "";
    }

    if (embedUrl?.trim()) {
      return embedUrl.trim();
    }

    return buildPartnerMapEmbedUrl(latitude, longitude, mapUrl, address) ?? "";
  }, [address, embedUrl, isMobile, latitude, longitude, mapUrl, useNaverJs]);

  if (hasCoords && configLoading) {
    return (
      <div className="naver-map-embed">
        <div
          className={`naver-map-embed__placeholder flex items-center justify-center px-4 text-center text-xs text-gray-500 ${iframeClassName}`}
        >
          네이버 지도를 불러오는 중...
        </div>
      </div>
    );
  }

  if (useNaverJs && clientId) {
    return (
      <div className="naver-map-embed">
        <NaverMapJsView
          latitude={latitude}
          longitude={longitude}
          title={title}
          clientId={clientId}
          className={iframeClassName}
          markerPartnerId={markerPartnerId}
          markerImageUrl={markerImageUrl}
          markerFavorited={markerFavorited}
          locateEnabled={locateEnabled}
        />
      </div>
    );
  }

  const src = isMobile ? fallbackMobileSrc : desktopIframeSrc;

  if (!src) {
    return null;
  }

  return (
    <div className="naver-map-embed">
      <iframe
        title={`${title} 지도`}
        src={src}
        className={iframeClassName}
        loading="eager"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
