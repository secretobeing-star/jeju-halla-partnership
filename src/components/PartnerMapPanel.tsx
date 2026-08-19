"use client";



import { useEffect, useMemo, useState } from "react";

import NaverMapEmbed from "@/components/NaverMapEmbed";

import {

  buildPartnerMapEmbedUrl,

  canShowPartnerMapPreview,

} from "@/lib/partner-map-url";

import { Partner } from "@/lib/supabase";



type PartnerMapPanelProps = {
  partner: Pick<
    Partner,
    "id" | "name" | "address" | "latitude" | "longitude" | "map_url" | "image_url"
  >;
  mapSectionLabel?: string | null;
  favoritesEnabled?: boolean;
  favorited?: boolean;
  locateEnabled?: boolean;
  splitPanelMode?: boolean;
};



type MapCoords = {

  latitude: number;

  longitude: number;

};



type ResolveMapUrlResponse = {

  parsed?: {

    latitude: number;

    longitude: number;

  } | null;

  error?: string;

};



function hasStoredCoords(partner: PartnerMapPanelProps["partner"]) {

  return (

    partner.latitude != null &&

    partner.longitude != null &&

    Number.isFinite(partner.latitude) &&

    Number.isFinite(partner.longitude)

  );

}



async function fetchGeocode(address: string): Promise<MapCoords | null> {

  const query = encodeURIComponent(address.trim());

  if (!query) {

    return null;

  }



  const response = await fetch(`/api/geocode?address=${query}`);

  if (!response.ok) {

    return null;

  }



  const data = (await response.json()) as MapCoords | { error?: string };

  if ("latitude" in data && "longitude" in data) {

    return data;

  }



  return null;

}



async function resolveMapLink(rawLink: string): Promise<MapCoords | null> {

  const response = await fetch(`/api/resolve-map-url?url=${encodeURIComponent(rawLink)}`);

  const data = (await response.json()) as ResolveMapUrlResponse;



  if (

    !response.ok ||

    !data.parsed ||

    !Number.isFinite(data.parsed.latitude) ||

    !Number.isFinite(data.parsed.longitude)

  ) {

    return null;

  }



  return {

    latitude: data.parsed.latitude,

    longitude: data.parsed.longitude,

  };

}



export default function PartnerMapPanel({
  partner,
  mapSectionLabel = null,
  favoritesEnabled = false,
  favorited = false,
  locateEnabled = true,
  splitPanelMode = false,
}: PartnerMapPanelProps) {

  const [resolvedCoords, setResolvedCoords] = useState<MapCoords | null>(null);

  const [loading, setLoading] = useState(false);

  const [mapExpanded, setMapExpanded] = useState(true);

  const mapQuery = partner.address?.trim() || partner.name;

  const mapLink = partner.map_url?.trim() || null;



  const storedCoords = hasStoredCoords(partner)

    ? {

        latitude: partner.latitude as number,

        longitude: partner.longitude as number,

      }

    : null;



  const displayCoords = storedCoords ?? resolvedCoords;



  const embedUrl = useMemo(

    () =>

      buildPartnerMapEmbedUrl(

        displayCoords?.latitude ?? partner.latitude,

        displayCoords?.longitude ?? partner.longitude,

        partner.map_url,

        partner.address,

      ),

    [

      displayCoords?.latitude,

      displayCoords?.longitude,

      partner.latitude,

      partner.longitude,

      partner.map_url,

      partner.address,

    ],

  );



  const canShowMap = canShowPartnerMapPreview(
    displayCoords?.latitude ?? partner.latitude,
    displayCoords?.longitude ?? partner.longitude,
    partner.map_url,
    partner.address,
  );

  useEffect(() => {

    setMapExpanded(true);

  }, [partner.name, partner.map_url]);



  useEffect(() => {

    if (storedCoords) {

      setResolvedCoords(null);

      setLoading(false);

      return;

    }



    let cancelled = false;



    async function resolveCoords() {

      setLoading(true);



      if (mapLink) {

        const fromLink = await resolveMapLink(mapLink);

        if (!cancelled && fromLink) {

          setResolvedCoords(fromLink);

          setLoading(false);

          return;

        }

      }



      if (mapQuery) {

        const fromAddress = await fetchGeocode(mapQuery);

        if (!cancelled) {

          setResolvedCoords(fromAddress);

          setLoading(false);

          return;

        }

      }



      if (!cancelled) {

        setResolvedCoords(null);

        setLoading(false);

      }

    }



    void resolveCoords();



    return () => {

      cancelled = true;

    };

  }, [storedCoords, mapLink, mapQuery]);



  return (

    <section
      id="partner-map-panel"
      className={[
        "rounded-xl border border-gray-200 bg-gray-50 p-4",
        splitPanelMode ? "partner-map-panel--split-mode" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">
          {mapSectionLabel ? (
            <p className="text-sm font-semibold text-gray-800">{mapSectionLabel}</p>
          ) : null}

          {!mapExpanded && canShowMap && (

            <p className="mt-1 text-xs text-gray-500">지도가 접혀 있습니다.</p>

          )}

          {canShowMap && !splitPanelMode && (
            <p className="mt-1 text-xs text-gray-500">
              네이버 지도 미리보기가 표시됩니다. 메뉴·리뷰·사진 등 장소 상세는 아래 링크를 이용해 주세요.
            </p>
          )}

        </div>



        <div className="flex shrink-0 items-center gap-2">

          {!splitPanelMode && (storedCoords || mapLink) && (

            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">

              {mapLink ? "링크 등록됨" : "지도 등록됨"}

            </span>

          )}

          {canShowMap && !splitPanelMode && (

            <button

              type="button"

              onClick={() => setMapExpanded((prev) => !prev)}

              className="text-xs font-medium text-emerald-600 hover:text-emerald-700"

              aria-expanded={mapExpanded}

            >

              {mapExpanded ? "접기" : "펼치기"}

            </button>

          )}

        </div>

      </div>



      <div className="mt-3 space-y-2">

        {mapExpanded && canShowMap ? (
          <>
            <NaverMapEmbed
              latitude={displayCoords?.latitude ?? partner.latitude ?? 33.499621}
              longitude={displayCoords?.longitude ?? partner.longitude ?? 126.531188}
              embedUrl={embedUrl}
              title={partner.name}
              address={partner.address}
              mapUrl={partner.map_url}
              iframeClassName={
                splitPanelMode
                  ? "partner-map-panel__embed h-[21rem] w-full"
                  : "h-[28rem] w-full sm:h-[58.8rem]"
              }
              markerPartnerId={partner.id}
              markerImageUrl={partner.image_url}
              markerFavorited={favoritesEnabled && favorited}
              locateEnabled={locateEnabled}
            />
            {loading && !displayCoords && !storedCoords ? (
              <p className="text-center text-xs text-gray-500 sm:hidden">지도 미리보기를 불러오는 중...</p>
            ) : null}
          </>
        ) : null}



        {!canShowMap && (

          <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">

            {loading

              ? "지도를 불러오는 중..."

              : mapLink

                ? "지도 링크를 확인하지 못했습니다. 관리자에서 링크를 다시 등록해 주세요."

                : "등록된 지도 정보가 없습니다. 관리자에서 네이버 지도 공유 링크를 등록해 주세요."}

          </div>

        )}

      </div>

    </section>

  );

}

