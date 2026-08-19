export type ParsedPartnerMapUrl = {
  latitude: number;
  longitude: number;
  embedUrl: string;
};

const MERCATOR_HALF = 20037508.34;
const DEFAULT_ZOOM = 17;
const OPEN_ZOOM = 19;
export const MOBILE_MAP_ZOOM = 19;

export function hasValidPartnerMapCoords(
  latitude?: number | null,
  longitude?: number | null,
) {
  return (
    latitude != null &&
    longitude != null &&
    isValidCoord(latitude, longitude)
  );
}

function isValidCoord(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function isMercatorPair(first: number, second: number) {
  return (
    Number.isFinite(first) &&
    Number.isFinite(second) &&
    (Math.abs(first) > 180 || Math.abs(second) > 90)
  );
}

function mercatorToWgs84(x: number, y: number) {
  const longitude = (x / MERCATOR_HALF) * 180;
  const latitude = (Math.atan(Math.exp((y / MERCATOR_HALF) * Math.PI)) * 360) / Math.PI - 90;
  return { latitude, longitude };
}

export function wgs84ToMercator(longitude: number, latitude: number) {
  const x = (longitude * MERCATOR_HALF) / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360)) * (MERCATOR_HALF / Math.PI);
  return { x, y };
}

export function extractPlaceIdFromMapUrl(rawUrl?: string | null) {
  if (!rawUrl) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    return parsed.pathname.match(/\/place\/(\d+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function extractPlaceId(rawUrl?: string | null) {
  return extractPlaceIdFromMapUrl(rawUrl);
}

function parseZoomFromCParam(value: string | null) {
  if (!value) {
    return DEFAULT_ZOOM;
  }

  const zoom = Number(value.split(",")[2]);
  return Number.isFinite(zoom) && zoom > 0 && zoom <= 21 ? zoom : DEFAULT_ZOOM;
}

function buildPlaceEmbedUrl(
  placeId: string,
  longitude?: number | null,
  latitude?: number | null,
  zoom = OPEN_ZOOM,
  options?: { includePlacePath?: boolean },
) {
  const includePlacePath = options?.includePlacePath ?? true;
  const hasCoords =
    longitude != null &&
    latitude != null &&
    Number.isFinite(longitude) &&
    Number.isFinite(latitude);

  if (hasCoords) {
    const { x, y } = wgs84ToMercator(longitude, latitude);
    const c = `${x},${y},${zoom},0,0,0,dh`;
    if (includePlacePath) {
      return `https://map.naver.com/p/embed/place/${placeId}?placePath=%2Fhome&c=${c}`;
    }

    return `https://map.naver.com/p/embed/place/${placeId}?c=${c}`;
  }

  if (includePlacePath) {
    return `https://map.naver.com/p/embed/place/${placeId}?placePath=%2Fhome`;
  }

  return `https://map.naver.com/p/embed/place/${placeId}`;
}

function buildAddressEmbedUrl(longitude: number, latitude: number, address: string, zoom = OPEN_ZOOM) {
  const { x, y } = wgs84ToMercator(longitude, latitude);
  return `https://map.naver.com/p/embed/address/${x},${y},${encodeURIComponent(address)}?c=${zoom},0,0,0,dh`;
}

function buildMercatorEmbedUrl(
  x: number,
  y: number,
  zoom: number,
  rawUrl?: string | null,
  address?: string | null,
) {
  const placeId = extractPlaceId(rawUrl);
  if (placeId) {
    const { latitude, longitude } = mercatorToWgs84(x, y);
    return buildPlaceEmbedUrl(placeId, longitude, latitude, zoom);
  }

  if (address?.trim()) {
    const { latitude, longitude } = mercatorToWgs84(x, y);
    return buildAddressEmbedUrl(longitude, latitude, address.trim(), zoom);
  }

  const c = `${x},${y},${zoom},0,0,0,dh`;
  return `https://map.naver.com/v5/embed/?c=${c}`;
}

export function buildNaverMapEmbedUrl(
  longitude: number,
  latitude: number,
  zoom = OPEN_ZOOM,
  rawUrl?: string | null,
  address?: string | null,
) {
  const placeId = extractPlaceId(rawUrl);
  if (placeId) {
    return buildPlaceEmbedUrl(placeId, longitude, latitude, zoom);
  }

  if (address?.trim()) {
    return buildAddressEmbedUrl(longitude, latitude, address.trim(), zoom);
  }

  const { x, y } = wgs84ToMercator(longitude, latitude);
  return buildMercatorEmbedUrl(x, y, zoom, rawUrl, address);
}

function buildParsedResult(
  longitude: number,
  latitude: number,
  embedUrl: string,
): ParsedPartnerMapUrl | null {
  if (!isValidCoord(latitude, longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    embedUrl,
  };
}

function parseCoordPairRaw(
  first: number,
  second: number,
  options?: { zoom?: number; rawUrl?: string; cParam?: string | null },
): ParsedPartnerMapUrl | null {
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null;
  }

  const zoom = options?.zoom ?? DEFAULT_ZOOM;
  const rawUrl = options?.rawUrl;

  if (isMercatorPair(first, second)) {
    const { latitude, longitude } = mercatorToWgs84(first, second);
    const embedUrl = buildMercatorEmbedUrl(first, second, zoom, rawUrl);
    return buildParsedResult(longitude, latitude, embedUrl);
  }

  const embedUrl = buildNaverMapEmbedUrl(first, second, zoom, rawUrl);
  return buildParsedResult(first, second, embedUrl);
}

function parseCParam(value: string | null, rawUrl?: string) {
  if (!value) {
    return null;
  }

  const parts = value.split(",");
  if (parts.length < 2) {
    return null;
  }

  const first = Number(parts[0]);
  const second = Number(parts[1]);
  const zoom = parseZoomFromCParam(value);

  // c=19.00,0,0,0,dh 처럼 줌만 있는 경우
  if (second === 0 && first > 0 && first <= 21 && !isMercatorPair(first, second)) {
    return null;
  }

  return parseCoordPairRaw(first, second, { zoom, rawUrl, cParam: value });
}

function parsePathCoordPairs(pathname: string, rawUrl: string) {
  const matches = pathname.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g);

  for (const match of matches) {
    const parsed = parseCoordPairRaw(Number(match[1]), Number(match[2]), { rawUrl });
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

export function parsePartnerMapUrl(rawUrl: string): ParsedPartnerMapUrl | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.toLowerCase();
    const canonicalUrl = parsed.toString();

    if (!host.includes("naver.com") && host !== "naver.me") {
      return null;
    }

    const latParam = parsed.searchParams.get("lat");
    const lngParam = parsed.searchParams.get("lng");
    if (latParam && lngParam) {
      const fromParams = parseCoordPairRaw(Number(lngParam), Number(latParam), {
        rawUrl: canonicalUrl,
      });
      if (fromParams) {
        return fromParams;
      }
    }

    const cParam = parsed.searchParams.get("c");
    const fromSearchC = parseCParam(cParam, canonicalUrl);
    if (fromSearchC) {
      return fromSearchC;
    }

    if (parsed.hash.includes("c=")) {
      const hashQuery = parsed.hash.replace(/^#/, "");
      const hashParams = new URLSearchParams(hashQuery);
      const fromHashC = parseCParam(hashParams.get("c"), canonicalUrl);
      if (fromHashC) {
        return fromHashC;
      }
    }

    const fromPath = parsePathCoordPairs(parsed.pathname, canonicalUrl);
    if (fromPath) {
      return fromPath;
    }

    const placeId = extractPlaceId(canonicalUrl);
    if (placeId && cParam) {
      const fromPlaceC = parseCParam(cParam, canonicalUrl);
      if (fromPlaceC) {
        return fromPlaceC;
      }
    }

    if (parsed.pathname.includes("/embed")) {
      const fromEmbed = parseCParam(cParam, canonicalUrl);
      if (fromEmbed) {
        return fromEmbed;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function normalizePartnerMapUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isNaverMapShortUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl.trim().startsWith("http") ? rawUrl.trim() : `https://${rawUrl.trim()}`);
    return parsed.hostname.toLowerCase() === "naver.me";
  } catch {
    return false;
  }
}

function buildOpenStreetMapEmbedUrl(longitude: number, latitude: number, zoom = DEFAULT_ZOOM) {
  const scale = Math.pow(2, 17 - zoom);
  const deltaLng = 0.012 * scale;
  const deltaLat = 0.009 * scale;
  const bbox = [
    longitude - deltaLng,
    latitude - deltaLat,
    longitude + deltaLng,
    latitude + deltaLat,
  ].join(",");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
}

export function buildPartnerMapMobileFallbackEmbedUrl(
  latitude?: number | null,
  longitude?: number | null,
) {
  if (!hasValidPartnerMapCoords(latitude, longitude)) {
    return null;
  }

  return buildOpenStreetMapEmbedUrl(longitude!, latitude!, MOBILE_MAP_ZOOM);
}

export function canShowPartnerMapPreview(
  latitude?: number | null,
  longitude?: number | null,
  mapUrl?: string | null,
  address?: string | null,
) {
  if (hasValidPartnerMapCoords(latitude, longitude)) {
    return true;
  }

  return buildPartnerMapEmbedUrl(latitude, longitude, mapUrl, address) != null;
}

export function buildPartnerMapEmbedUrl(
  latitude?: number | null,
  longitude?: number | null,
  mapUrl?: string | null,
  address?: string | null,
  options?: { mobile?: boolean },
) {
  const placeId = extractPlaceIdFromMapUrl(mapUrl);
  const hasCoords = hasValidPartnerMapCoords(latitude, longitude);
  const mobile = options?.mobile ?? false;

  if (mobile) {
    return null;
  }

  if (placeId) {
    return buildPlaceEmbedUrl(
      placeId,
      hasCoords ? longitude : null,
      hasCoords ? latitude : null,
      OPEN_ZOOM,
      { includePlacePath: true },
    );
  }

  if (!hasCoords || longitude == null || latitude == null) {
    return null;
  }

  return buildNaverMapEmbedUrl(
    longitude,
    latitude,
    OPEN_ZOOM,
    mapUrl,
    address,
  );
}

function toNaverMapEntryUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    if (parsed.pathname.includes("/embed/place/")) {
      parsed.pathname = parsed.pathname.replace("/embed/place/", "/entry/place/");
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function buildPartnerMapOpenUrl(options: {
  mapUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  name?: string;
  address?: string;
}) {
  const mapUrl = options.mapUrl?.trim() ?? "";
  const placeId = extractPlaceIdFromMapUrl(mapUrl);
  const address = options.address?.trim() || options.name?.trim() || "";
  const hasCoords =
    options.latitude != null &&
    options.longitude != null &&
    Number.isFinite(options.latitude) &&
    Number.isFinite(options.longitude);

  if (placeId) {
    if (hasCoords) {
      const { x, y } = wgs84ToMercator(options.longitude!, options.latitude!);
      const c = `${x},${y},${OPEN_ZOOM},0,0,0,dh`;
      return `https://map.naver.com/p/entry/place/${placeId}?placePath=%2Fhome&c=${c}`;
    }

    return `https://map.naver.com/p/entry/place/${placeId}?placePath=%2Fhome`;
  }

  if (hasCoords && address) {
    const { x, y } = wgs84ToMercator(options.longitude!, options.latitude!);
    return `https://map.naver.com/p/entry/address/${x},${y},${encodeURIComponent(address)}?c=${OPEN_ZOOM},0,0,0,dh`;
  }

  if (hasCoords) {
    const { x, y } = wgs84ToMercator(options.longitude!, options.latitude!);
    return `https://map.naver.com/v5/?c=${x},${y},${OPEN_ZOOM},0,0,0,dh`;
  }

  if (mapUrl) {
    const normalized = normalizePartnerMapUrl(mapUrl);
    if (
      normalized &&
      !normalized.includes("/v5/search/") &&
      !normalized.includes("/p/search/")
    ) {
      return toNaverMapEntryUrl(normalized);
    }
  }

  if (!address) {
    return null;
  }

  return `https://map.naver.com/v5/search/${encodeURIComponent(address)}`;
}
