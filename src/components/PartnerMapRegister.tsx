"use client";

import { useEffect, useState } from "react";
import NaverMapEmbed from "@/components/NaverMapEmbed";
import { adminApiFetch } from "@/lib/admin-api";
import type { MapGeocodeProvider } from "@/lib/geocode";
import { normalizePartnerMapUrl, parsePartnerMapUrl } from "@/lib/partner-map-url";

type PartnerMapRegisterProps = {
  partnerId: string | null;
  address: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  mapUrl?: string | null;
  geocodeApiEnabled?: boolean;
  onCoordinatesChange: (latitude: number | null, longitude: number | null) => void;
  onMapUrlChange?: (mapUrl: string | null) => void;
  disabled?: boolean;
};

type MapCoords = {
  latitude: number;
  longitude: number;
};

type MapRegisterResponse = MapCoords & {
  provider?: MapGeocodeProvider | null;
  roadAddress?: string | null;
  jibunAddress?: string | null;
  map_url?: string | null;
  error?: string;
};

type GeocodeConfigResponse = {
  apiEnabled?: boolean;
  defaultProvider?: MapGeocodeProvider;
  providers?: MapGeocodeProvider[];
};

const PROVIDER_LABELS: Record<MapGeocodeProvider, string> = {
  naver: "네이버 지도 API",
  nominatim: "OpenStreetMap (보조)",
};

type ResolveMapUrlResponse = {
  url?: string;
  parsed?: {
    latitude: number;
    longitude: number;
    embedUrl?: string;
  } | null;
  error?: string;
};

async function resolveMapLinkForParse(rawLink: string) {
  const direct = parsePartnerMapUrl(rawLink);
  if (direct) {
    return { url: rawLink, parsed: direct };
  }

  const response = await fetch(`/api/resolve-map-url?url=${encodeURIComponent(rawLink)}`);
  const data = (await response.json()) as ResolveMapUrlResponse;

  if (!response.ok || !data.parsed) {
    throw new Error(
      data.error ??
        "지원하지 않는 링크입니다. 네이버 지도에서 「공유 → URL 복사」로 받은 링크를 붙여넣어 주세요.",
    );
  }

  return {
    url: data.url?.trim() || rawLink,
    parsed: {
      latitude: data.parsed.latitude,
      longitude: data.parsed.longitude,
      embedUrl: data.parsed.embedUrl ?? "",
    },
  };
}

export default function PartnerMapRegister({
  partnerId,
  address,
  name,
  latitude,
  longitude,
  mapUrl = null,
  geocodeApiEnabled = true,
  onCoordinatesChange,
  onMapUrlChange,
  disabled = false,
}: PartnerMapRegisterProps) {
  const [previewCoords, setPreviewCoords] = useState<MapCoords | null>(null);
  const [loadingMode, setLoadingMode] = useState<"address" | "link" | null>(null);
  const [mapLinkInput, setMapLinkInput] = useState(mapUrl ?? "");
  const [message, setMessage] = useState("");
  const [geocodeApiAvailable, setGeocodeApiAvailable] = useState(geocodeApiEnabled);
  const [availableProviders, setAvailableProviders] = useState<MapGeocodeProvider[]>([
    "nominatim",
  ]);
  const [selectedProvider, setSelectedProvider] = useState<MapGeocodeProvider | "auto">("auto");
  const [lastProvider, setLastProvider] = useState<MapGeocodeProvider | null>(null);
  const [lastResolvedAddress, setLastResolvedAddress] = useState<string | null>(null);

  const displayCoords =
    latitude != null && longitude != null ? { latitude, longitude } : previewCoords;

  useEffect(() => {
    setPreviewCoords(null);
    setMessage("");
    setLastProvider(null);
    setLastResolvedAddress(null);
  }, [partnerId, address]);

  useEffect(() => {
    setMapLinkInput(mapUrl ?? "");
  }, [mapUrl, partnerId]);

  useEffect(() => {
    setGeocodeApiAvailable(geocodeApiEnabled);
  }, [geocodeApiEnabled]);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/geocode")
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as GeocodeConfigResponse;
      })
      .then((config) => {
        if (cancelled || !config) {
          return;
        }

        const apiEnabled = (config.apiEnabled ?? true) && geocodeApiEnabled;
        const providers =
          config.providers && config.providers.length > 0
            ? config.providers
            : (["nominatim"] as MapGeocodeProvider[]);

        setGeocodeApiAvailable(apiEnabled && providers.length > 0);
        setAvailableProviders(providers);
        setSelectedProvider(config.defaultProvider ?? providers[0] ?? "auto");
      })
      .catch(() => {
        if (!cancelled) {
          setGeocodeApiAvailable(geocodeApiEnabled);
          setAvailableProviders(["nominatim"]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [geocodeApiEnabled]);

  async function registerFromAddress() {
    const query = address.trim() || name.trim();
    if (!query) {
      setMessage("주소 또는 업체명을 먼저 입력해 주세요.");
      return;
    }

    setLoadingMode("address");
    setMessage("");

    try {
      if (partnerId) {
        const data = (await adminApiFetch(`/api/admin/partners/${partnerId}/map`, {
          method: "POST",
          body: JSON.stringify({
            address: query,
            provider: selectedProvider,
          }),
        })) as MapRegisterResponse;

        const nextLatitude = Number(data.latitude);
        const nextLongitude = Number(data.longitude);

        if (!Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude)) {
          setMessage("지도 등록에 실패했습니다.");
          return;
        }

        onCoordinatesChange(nextLatitude, nextLongitude);
        onMapUrlChange?.(null);
        setPreviewCoords({ latitude: nextLatitude, longitude: nextLongitude });
        setLastProvider(data.provider ?? null);
        setLastResolvedAddress(data.roadAddress ?? data.jibunAddress ?? null);
        setMessage(
          data.provider
            ? `${PROVIDER_LABELS[data.provider]}로 지도 좌표가 등록되었습니다.`
            : "주소로 지도 좌표가 등록되었습니다.",
        );
        return;
      }

      const providerQuery =
        selectedProvider === "auto" ? "" : `&provider=${encodeURIComponent(selectedProvider)}`;
      const response = await fetch(
        `/api/geocode?address=${encodeURIComponent(query)}${providerQuery}`,
      );
      const raw: unknown = await response.json();
      const data = raw as MapRegisterResponse;

      if (!response.ok || typeof data.latitude !== "number" || typeof data.longitude !== "number") {
        setMessage(data.error ?? "주소로 좌표를 찾지 못했습니다.");
        return;
      }

      onCoordinatesChange(data.latitude, data.longitude);
      onMapUrlChange?.(null);
      setPreviewCoords({ latitude: data.latitude, longitude: data.longitude });
      setLastProvider(data.provider ?? null);
      setLastResolvedAddress(data.roadAddress ?? data.jibunAddress ?? null);
      setMessage(
        data.provider
          ? `${PROVIDER_LABELS[data.provider]}로 좌표를 찾았습니다. 업체 저장 시 함께 반영됩니다.`
          : "주소로 좌표를 찾았습니다. 업체 저장 시 함께 반영됩니다.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "지도 등록에 실패했습니다.");
    } finally {
      setLoadingMode(null);
    }
  }

  async function registerFromMapLink() {
    const rawLink = mapLinkInput.trim();
    if (!rawLink) {
      setMessage("네이버 지도 공유 링크를 입력해 주세요.");
      return;
    }

    setLoadingMode("link");
    setMessage("");

    try {
      const { url: resolvedLink, parsed } = await resolveMapLinkForParse(rawLink);
      const normalizedUrl = normalizePartnerMapUrl(resolvedLink) ?? normalizePartnerMapUrl(rawLink);

      if (partnerId) {
        const data = (await adminApiFetch(`/api/admin/partners/${partnerId}/map`, {
          method: "POST",
          body: JSON.stringify({ map_url: rawLink }),
        })) as MapRegisterResponse;

        const savedLatitude = Number(data.latitude);
        const savedLongitude = Number(data.longitude);

        if (!Number.isFinite(savedLatitude) || !Number.isFinite(savedLongitude)) {
          setMessage("지도 링크 등록에 실패했습니다.");
          return;
        }

        onCoordinatesChange(savedLatitude, savedLongitude);
        onMapUrlChange?.(data.map_url ?? normalizedUrl);
        setMapLinkInput(data.map_url ?? normalizedUrl ?? rawLink);
        setPreviewCoords({ latitude: savedLatitude, longitude: savedLongitude });
        setLastProvider(null);
        setLastResolvedAddress(null);
        setMessage("지도 링크가 등록되었습니다.");
        return;
      }

      onCoordinatesChange(parsed.latitude, parsed.longitude);
      onMapUrlChange?.(normalizedUrl);
      setMapLinkInput(normalizedUrl ?? rawLink);
      setPreviewCoords({ latitude: parsed.latitude, longitude: parsed.longitude });
      setLastProvider(null);
      setLastResolvedAddress(null);
      setMessage("지도 링크를 확인했습니다. 업체 저장 시 함께 반영됩니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "지도 링크 등록에 실패했습니다.");
    } finally {
      setLoadingMode(null);
    }
  }

  function clearCoordinates() {
    onCoordinatesChange(null, null);
    onMapUrlChange?.(null);
    setPreviewCoords(null);
    setMapLinkInput("");
    setLastProvider(null);
    setLastResolvedAddress(null);
    setMessage("등록된 지도 정보를 지웠습니다.");
  }

  const isLoading = loadingMode !== null;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">지도 등록</p>
        {displayCoords && (
          <span className="text-xs text-gray-500">
            {displayCoords.latitude.toFixed(5)}, {displayCoords.longitude.toFixed(5)}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        네이버 지도 공유 링크
        {geocodeApiAvailable ? " 또는 주소 API" : ""}로 제휴 자세히 보기 지도를 등록할 수
        있습니다.
      </p>

      <div className="mt-4 space-y-4">
        <section className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-sm font-semibold text-gray-800">지도 링크로 등록</p>
          <p className="mt-1 text-xs text-gray-500">
            네이버 지도 앱·웹에서 「공유」로 복사한 URL을 붙여넣으면 자세히 보기에 지도가
            표시됩니다.
          </p>

          <label className="mt-3 block text-sm font-medium text-gray-700">
            네이버 지도 링크
            <input
              type="url"
              value={mapLinkInput}
              onChange={(event) => setMapLinkInput(event.target.value)}
              placeholder="https://map.naver.com/... 또는 https://naver.me/..."
              disabled={disabled || isLoading}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>

          <button
            type="button"
            onClick={() => void registerFromMapLink()}
            disabled={disabled || isLoading}
            className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loadingMode === "link" ? "등록 중..." : "링크로 지도 등록"}
          </button>
        </section>

        {geocodeApiAvailable && (
          <section className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-sm font-semibold text-gray-800">주소로 등록 (API)</p>
            <p className="mt-1 text-xs text-gray-500">
              위에 입력한 주소를 네이버 지도 API로 좌표로 변환합니다.
            </p>

            <label className="mt-3 block text-sm font-medium text-gray-700">
              지도 API
              <select
                value={selectedProvider}
                onChange={(event) =>
                  setSelectedProvider(event.target.value as MapGeocodeProvider | "auto")
                }
                disabled={disabled || isLoading}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              >
                <option value="auto">자동 (설정된 API 우선)</option>
                {availableProviders.map((provider) => (
                  <option key={provider} value={provider}>
                    {PROVIDER_LABELS[provider]}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void registerFromAddress()}
              disabled={disabled || isLoading}
              className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loadingMode === "address" ? "등록 중..." : "주소로 지도 등록"}
            </button>
          </section>
        )}
      </div>

      {(displayCoords || mapUrl) && (
        <button
          type="button"
          onClick={clearCoordinates}
          disabled={disabled || isLoading}
          className="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          지도 등록 해제
        </button>
      )}

      {displayCoords && (
        <div className="mt-3">
          <NaverMapEmbed
            latitude={displayCoords.latitude}
            longitude={displayCoords.longitude}
            title={name || "업체"}
          />
        </div>
      )}

      {lastResolvedAddress && (
        <p className="mt-2 text-xs text-gray-500">검색 주소: {lastResolvedAddress}</p>
      )}

      {lastProvider && !message && (
        <p className="mt-2 text-xs text-gray-500">사용 API: {PROVIDER_LABELS[lastProvider]}</p>
      )}

      {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
