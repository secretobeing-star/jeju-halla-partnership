import {
  buildNaverMapEmbedUrl,
  extractPlaceIdFromMapUrl,
  parsePartnerMapUrl,
  type ParsedPartnerMapUrl,
} from "@/lib/partner-map-url";

const NAVER_MAP_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type PlaceSummaryResponse = {
  data?: {
    placeDetail?: {
      coordinate?: {
        latitude?: number;
        longitude?: number;
      };
    };
  };
};

function normalizeInputUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

async function fetchPlaceCoordinates(placeId: string) {
  try {
    const response = await fetch(`https://map.naver.com/p/api/place/summary/${placeId}`, {
      headers: {
        "User-Agent": NAVER_MAP_USER_AGENT,
        Referer: "https://map.naver.com/",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as PlaceSummaryResponse;
    const latitude = Number(data.data?.placeDetail?.coordinate?.latitude);
    const longitude = Number(data.data?.placeDetail?.coordinate?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return { latitude, longitude };
  } catch {
    return null;
  }
}

function buildParsedFromPlace(
  resolvedUrl: string,
  latitude: number,
  longitude: number,
): ParsedPartnerMapUrl {
  return {
    latitude,
    longitude,
    embedUrl: buildNaverMapEmbedUrl(longitude, latitude, undefined, resolvedUrl),
  };
}

export async function resolveNaverMapRedirect(rawUrl: string): Promise<string> {
  const parsed = normalizeInputUrl(rawUrl);
  if (!parsed) {
    return rawUrl.trim();
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== "naver.me" && !host.includes("naver.com")) {
    return parsed.toString();
  }

  if (parsePartnerMapUrl(parsed.toString())) {
    return parsed.toString();
  }

  if (extractPlaceIdFromMapUrl(parsed.toString())) {
    return parsed.toString();
  }

  try {
    const response = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": NAVER_MAP_USER_AGENT,
      },
      cache: "no-store",
    });

    return response.url || parsed.toString();
  } catch {
    return parsed.toString();
  }
}

export async function resolveAndParsePartnerMapUrl(rawUrl: string) {
  const resolvedUrl = await resolveNaverMapRedirect(rawUrl);
  const parsedFromUrl = parsePartnerMapUrl(resolvedUrl);

  if (parsedFromUrl) {
    return {
      resolvedUrl,
      parsed: parsedFromUrl,
    };
  }

  const placeId = extractPlaceIdFromMapUrl(resolvedUrl);
  if (placeId) {
    const coordinates = await fetchPlaceCoordinates(placeId);
    if (coordinates) {
      return {
        resolvedUrl,
        parsed: buildParsedFromPlace(
          resolvedUrl,
          coordinates.latitude,
          coordinates.longitude,
        ),
      };
    }
  }

  return {
    resolvedUrl,
    parsed: null,
  };
}
