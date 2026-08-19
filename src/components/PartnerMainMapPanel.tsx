"use client";

import { useEffect, useMemo, useState } from "react";
import NaverMapPartnersView, {
  type NaverMapPartnerMarker,
} from "@/components/NaverMapPartnersView";
import { parsePartnerMapCoordinate } from "@/lib/naver-map-partner-ui";
import { hasValidPartnerMapCoords } from "@/lib/partner-map-url";
import { loadNaverMapsSdk } from "@/lib/naver-maps-loader";
import { useNaverMapConfig } from "@/lib/use-naver-map-config";

type PartnerMainMapSource = {
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

type PartnerMainMapPanelProps = {
  partners: PartnerMainMapSource[];
  title?: string | null;
  defaultExpanded?: boolean;
  onPartnerSelect?: (partnerId: string) => void;
  favoritesEnabled?: boolean;
  favoritePartnerIds?: ReadonlySet<string>;
  locateEnabled?: boolean;
  /** PWA 로딩 사진이 끝나기 전까지 위치 버튼 등을 숨김 */
  holdLoadingOverlay?: boolean;
  /** 지도가 표시 가능해지면 호출 */
  onMapReady?: () => void;
  onFavoriteToggle?: (partnerId: string) => void;
  favoritesTerm?: string;
  stampAction?: {
    enabled: boolean;
    stampedPlaceIds: ReadonlySet<string>;
    label?: string;
    onStamp: (partner: { id: string; name: string }) => void;
  };
  favoriteCountdownEndAt?: string | null;
  detailButtonLabel?: string;
};

export default function PartnerMainMapPanel({
  partners,
  title = null,
  defaultExpanded = true,
  onPartnerSelect,
  favoritesEnabled = false,
  favoritePartnerIds,
  locateEnabled = true,
  holdLoadingOverlay = false,
  onMapReady,
  onFavoriteToggle,
  favoritesTerm = "즐겨찾기",
  stampAction,
  favoriteCountdownEndAt = null,
  detailButtonLabel,
}: PartnerMainMapPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { clientId, loading: configLoading, available: naverJsAvailable, geocodeKeyFallback } =
    useNaverMapConfig();

  useEffect(() => {
    if (!expanded || !clientId) {
      return;
    }

    void loadNaverMapsSdk(clientId, ["markerClustering"], { waitForSubmodules: true }).catch(
      () => {},
    );
  }, [clientId, expanded]);

  useEffect(() => {
    if (!expanded) {
      onMapReady?.();
      return;
    }

    if (configLoading) {
      return;
    }

    if (!naverJsAvailable || !clientId) {
      onMapReady?.();
    }
  }, [clientId, configLoading, expanded, naverJsAvailable, onMapReady]);

  const mapPartners = useMemo(
    () =>
      partners.flatMap((partner) => {
        const latitude = parsePartnerMapCoordinate(partner.latitude);
        const longitude = parsePartnerMapCoordinate(partner.longitude);

        if (!hasValidPartnerMapCoords(latitude, longitude)) {
          return [];
        }

        return [
          {
            id: partner.id,
            name: partner.name,
            latitude,
            longitude,
            imageUrl: partner.image_url ?? null,
            pinImageUrl: partner.pinImageUrl ?? null,
            category: partner.category ?? null,
            address: partner.address ?? null,
            benefit: partner.benefit ?? null,
          } satisfies NaverMapPartnerMarker,
        ];
      }),
    [partners],
  );

  return (
    <section className="partner-main-map mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className={`flex items-start gap-3 ${title ? "justify-between" : "justify-end"}`}>
        {title ? (
          <h2 className="min-w-0 text-sm font-semibold text-gray-900 sm:text-base">{title}</h2>
        ) : null}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 sm:text-sm"
          aria-expanded={expanded}
        >
          {expanded ? "접기" : "펼치기"}
        </button>
      </div>

      {expanded ? (
        <div className="partner-main-map__frame mt-3 rounded-xl border border-gray-200 bg-gray-50">
          {geocodeKeyFallback ? (
            <p className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              현재 Geocoding Client ID로 지도를 불러오고 있습니다. 메인 지도는 NCP Maps Application의
              Dynamic Map Client ID(<code className="text-[0.7rem]">NEXT_PUBLIC_NAVER_MAP_CLIENT_ID</code>
              )가 필요합니다.
            </p>
          ) : null}
          {configLoading ? (
            <div className="partner-main-map__canvas partner-main-map__canvas--loading">
              <div className="partner-main-map__loading-overlay partner-main-map__loading-overlay--static">
                <span className="partner-main-map__loading-text">로딩중...</span>
              </div>
            </div>
          ) : naverJsAvailable && clientId ? (
            <NaverMapPartnersView
              partners={mapPartners}
              clientId={clientId}
              onPartnerClick={onPartnerSelect}
              favoritesEnabled={favoritesEnabled}
              favoritePartnerIds={favoritePartnerIds}
              locateEnabled={locateEnabled}
              holdLoadingOverlay={holdLoadingOverlay}
              onReady={onMapReady}
              onFavoriteToggle={onFavoriteToggle}
              favoritesTerm={favoritesTerm}
              stampAction={stampAction}
              favoriteCountdownEndAt={favoriteCountdownEndAt}
              detailButtonLabel={detailButtonLabel}
            />
          ) : (
            <div className="partner-main-map__canvas partner-main-map__canvas--loading flex items-center justify-center px-4 text-center text-sm text-gray-500">
              네이버 지도 API 설정이 필요합니다. 관리자에서 지도 API를 확인해 주세요.
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-500">지도가 접혀 있습니다.</p>
      )}
    </section>
  );
}
