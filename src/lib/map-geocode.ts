export type MapGeocodeProvider = "naver" | "nominatim";

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  provider: MapGeocodeProvider;
  roadAddress?: string | null;
  jibunAddress?: string | null;
};

export type GeocodeOptions = {
  provider?: MapGeocodeProvider | "auto";
  allowedProviders?: MapGeocodeProvider[];
};

function normalizeJejuQuery(address: string) {
  const trimmed = address.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.includes("제주") ? trimmed : `${trimmed} 제주`;
}

function hasNaverGeocodeKeys() {
  const clientId =
    process.env.NAVER_GEOCODE_CLIENT_ID?.trim() || process.env.NCP_CLIENT_ID?.trim();
  const clientSecret =
    process.env.NAVER_GEOCODE_CLIENT_SECRET?.trim() ||
    process.env.NCP_CLIENT_SECRET?.trim();

  return Boolean(clientId && clientSecret);
}

export function getConfiguredMapGeocodeProviders(): MapGeocodeProvider[] {
  const providers: MapGeocodeProvider[] = [];

  if (hasNaverGeocodeKeys()) {
    providers.push("naver");
  }

  providers.push("nominatim");
  return providers;
}

export function getDefaultMapGeocodeProvider(): MapGeocodeProvider {
  const configured = process.env.MAP_GEOCODE_PROVIDER?.trim().toLowerCase();

  if (configured === "naver" && hasNaverGeocodeKeys()) {
    return "naver";
  }

  if (configured === "nominatim") {
    return "nominatim";
  }

  if (hasNaverGeocodeKeys()) {
    return "naver";
  }

  return "nominatim";
}

function filterAllowedProviders(providers: MapGeocodeProvider[], allowed?: MapGeocodeProvider[]) {
  if (!allowed || allowed.length === 0) {
    return providers;
  }

  const allowedSet = new Set(allowed);
  return providers.filter((provider) => allowedSet.has(provider));
}

function resolveProvider(
  requested: GeocodeOptions["provider"] | undefined,
  allowedProviders?: MapGeocodeProvider[],
): MapGeocodeProvider {
  const configured = filterAllowedProviders(getConfiguredMapGeocodeProviders(), allowedProviders);

  if (requested && requested !== "auto") {
    if (!configured.includes(requested)) {
      throw new Error("선택한 지도 API를 사용할 수 없습니다.");
    }

    if (requested === "naver" && !hasNaverGeocodeKeys()) {
      throw new Error("NAVER Geocoding API 키가 설정되지 않았습니다.");
    }

    return requested;
  }

  const preferred = getDefaultMapGeocodeProvider();
  if (configured.includes(preferred)) {
    return preferred;
  }

  if (configured.length === 0) {
    throw new Error("사용 가능한 지도 API가 없습니다.");
  }

  return configured[0];
}

async function geocodeWithNaver(address: string): Promise<GeocodeResult | null> {
  const clientId =
    process.env.NAVER_GEOCODE_CLIENT_ID?.trim() || process.env.NCP_CLIENT_ID?.trim();
  const clientSecret =
    process.env.NAVER_GEOCODE_CLIENT_SECRET?.trim() ||
    process.env.NCP_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  const query = normalizeJejuQuery(address);
  const endpoint = new URL("https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode");
  endpoint.searchParams.set("query", query);

  const response = await fetch(endpoint.toString(), {
    headers: {
      Accept: "application/json",
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    status?: string;
    addresses?: Array<{
      x?: string;
      y?: string;
      roadAddress?: string;
      jibunAddress?: string;
    }>;
  };

  const first = data.addresses?.[0];
  if (data.status !== "OK" || !first?.x || !first?.y) {
    return null;
  }

  const latitude = Number(first.y);
  const longitude = Number(first.x);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    provider: "naver",
    roadAddress: first.roadAddress ?? null,
    jibunAddress: first.jibunAddress ?? null,
  };
}

function readCoordsFromUnknown(value: unknown): GeocodeResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const nested =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record.result && typeof record.result === "object"
        ? (record.result as Record<string, unknown>)
        : record;

  const latitude = Number(
    nested.latitude ?? nested.lat ?? nested.y ?? record.latitude ?? record.lat ?? record.y,
  );
  const longitude = Number(
    nested.longitude ?? nested.lng ?? nested.lon ?? nested.x ?? record.longitude ?? record.lng ?? record.lon ?? record.x,
  );

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    provider: "nominatim",
    roadAddress:
      typeof nested.roadAddress === "string"
        ? nested.roadAddress
        : typeof nested.address === "string"
          ? nested.address
          : null,
    jibunAddress: typeof nested.jibunAddress === "string" ? nested.jibunAddress : null,
  };
}

async function geocodeWithNominatim(address: string): Promise<GeocodeResult | null> {
  const query = normalizeJejuQuery(address);
  const endpoint = new URL("https://nominatim.openstreetmap.org/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "jeju-halla-partnership/1.0",
    },
  });

  if (!response.ok) {
    return null;
  }

  const results = (await response.json()) as Array<{ lat: string; lon: string }>;
  if (!results.length) {
    return null;
  }

  const latitude = Number(results[0].lat);
  const longitude = Number(results[0].lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    provider: "nominatim",
  };
}

async function geocodeWithProvider(
  address: string,
  provider: MapGeocodeProvider,
): Promise<GeocodeResult | null> {
  switch (provider) {
    case "naver":
      return geocodeWithNaver(address);
    case "nominatim":
      return geocodeWithNominatim(address);
    default:
      return null;
  }
}

export async function geocodeAddress(
  address: string,
  options: GeocodeOptions = {},
): Promise<GeocodeResult | null> {
  const query = address.trim();
  if (!query) {
    return null;
  }

  let provider: MapGeocodeProvider;

  try {
    provider = resolveProvider(options.provider, options.allowedProviders);
  } catch {
    return null;
  }

  const primary = await geocodeWithProvider(query, provider);
  if (primary) {
    return primary;
  }

  if (options.provider && options.provider !== "auto") {
    return null;
  }

  const fallbacks = filterAllowedProviders(getConfiguredMapGeocodeProviders(), options.allowedProviders).filter(
    (item) => item !== provider,
  );

  for (const fallback of fallbacks) {
    const result = await geocodeWithProvider(query, fallback);
    if (result) {
      return result;
    }
  }

  return null;
}

export function getMapGeocodeProviderLabel(provider: MapGeocodeProvider) {
  switch (provider) {
    case "naver":
      return "네이버 지도 API";
    case "nominatim":
      return "OpenStreetMap";
    default:
      return provider;
  }
}
