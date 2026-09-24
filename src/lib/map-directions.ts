export type MapRoutePoint = {
  latitude: number;
  longitude: number;
};

type NaverDirectionsResponse = {
  code?: number | string;
  message?: string;
  route?: Record<string, unknown>;
};

function getNaverMapsKeys() {
  const clientId =
    process.env.NAVER_GEOCODE_CLIENT_ID?.trim() || process.env.NCP_CLIENT_ID?.trim();
  const clientSecret =
    process.env.NAVER_GEOCODE_CLIENT_SECRET?.trim() ||
    process.env.NCP_CLIENT_SECRET?.trim();

  return { clientId, clientSecret };
}

function parseCoordPair(item: unknown): MapRoutePoint | null {
  if (Array.isArray(item) && item.length >= 2) {
    const first = Number(item[0]);
    const second = Number(item[1]);
    if (!Number.isFinite(first) || !Number.isFinite(second)) {
      return null;
    }

    // Naver path is [lng, lat]. If values are swapped, recover.
    if (Math.abs(first) <= 90 && Math.abs(second) > 90 && Math.abs(second) <= 180) {
      return { latitude: first, longitude: second };
    }

    return { latitude: second, longitude: first };
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;
  const longitude = Number(record.longitude ?? record.lng ?? record.x);
  const latitude = Number(record.latitude ?? record.lat ?? record.y);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude };
  }

  return null;
}

function extractPathFromCandidate(candidate: unknown): MapRoutePoint[] {
  if (!candidate || typeof candidate !== "object") {
    return [];
  }

  const record = candidate as { path?: unknown };
  if (!Array.isArray(record.path)) {
    return [];
  }

  const points: MapRoutePoint[] = [];
  for (const item of record.path) {
    const point = parseCoordPair(item);
    if (point) {
      points.push(point);
    }
  }

  return points.length >= 2 ? points : [];
}

function extractPath(payload: NaverDirectionsResponse): MapRoutePoint[] {
  const route = payload.route;
  if (!route) {
    return [];
  }

  const preferred = [
    "traoptimal",
    "trafast",
    "tracomfort",
    "traavoidtoll",
    "traavoidcaronly",
  ];
  const keys = [...preferred, ...Object.keys(route).filter((key) => !preferred.includes(key))];

  for (const key of keys) {
    const group = route[key];
    const candidates = Array.isArray(group) ? group : [group];
    for (const candidate of candidates) {
      const points = extractPathFromCandidate(candidate);
      if (points.length >= 2) {
        return points;
      }
    }
  }

  return [];
}

function distanceMeters(a: MapRoutePoint, b: MapRoutePoint) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function snapPathToMarker(path: MapRoutePoint[], start: MapRoutePoint, goal: MapRoutePoint) {
  const snapped = path.map((point) => ({ ...point }));
  if (distanceMeters(snapped[0], start) > 2) {
    snapped.unshift(start);
  } else {
    snapped[0] = start;
  }

  const lastIndex = snapped.length - 1;
  if (distanceMeters(snapped[lastIndex], goal) > 2) {
    snapped.push(goal);
  } else {
    snapped[lastIndex] = goal;
  }

  return snapped;
}

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 4000) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as unknown;
}

async function fetchNaverRoute(
  start: MapRoutePoint,
  goal: MapRoutePoint,
  mode: "walking" | "driving",
): Promise<MapRoutePoint[]> {
  const { clientId, clientSecret } = getNaverMapsKeys();
  if (!clientId || !clientSecret) {
    return [];
  }

  const path = mode === "walking" ? "/map-direction/v1/walking" : "/map-direction/v1/driving";
  const urls = [
    `https://maps.apigw.ntruss.com${path}`,
    `https://naveropenapi.apigw.ntruss.com${path}`,
  ];

  const headers = {
    Accept: "application/json",
    "x-ncp-apigw-api-key-id": clientId,
    "x-ncp-apigw-api-key": clientSecret,
    "X-NCP-APIGW-API-KEY-ID": clientId,
    "X-NCP-APIGW-API-KEY": clientSecret,
  };

  for (const base of urls) {
    const endpoint = new URL(base);
    endpoint.searchParams.set("start", `${start.longitude},${start.latitude}`);
    endpoint.searchParams.set("goal", `${goal.longitude},${goal.latitude}`);
    if (mode === "driving") {
      endpoint.searchParams.set("option", "traoptimal");
    }

    try {
      const payload = (await fetchJson(endpoint.toString(), { headers }, 4500)) as
        | NaverDirectionsResponse
        | null;
      if (!payload) {
        continue;
      }
      if (payload.code != null && Number(payload.code) !== 0) {
        continue;
      }
      const points = extractPath(payload);
      if (points.length >= 2) {
        return snapPathToMarker(points, start, goal);
      }
    } catch {
      // try next host
    }
  }

  return [];
}

async function fetchOsrmRoute(
  start: MapRoutePoint,
  goal: MapRoutePoint,
  profile: "driving" | "foot",
): Promise<MapRoutePoint[]> {
  const hosts = [
    "https://router.project-osrm.org",
    "https://routing.openstreetmap.de/routed-car",
  ];
  const pathProfile = profile === "foot" ? "foot" : "driving";

  for (const host of hosts) {
    if (host.includes("routed-car") && profile === "foot") {
      continue;
    }

    const endpoint = `${host}/route/v1/${pathProfile}/${start.longitude},${start.latitude};${goal.longitude},${goal.latitude}?overview=full&geometries=geojson`;
    try {
      const payload = (await fetchJson(endpoint, { headers: { Accept: "application/json" } }, 5000)) as {
        code?: string;
        routes?: Array<{ geometry?: { coordinates?: Array<[number, number]> } }>;
      } | null;
      if (!payload || payload.code !== "Ok") {
        continue;
      }
      const coordinates = payload.routes?.[0]?.geometry?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        continue;
      }

      const points: MapRoutePoint[] = [];
      for (const item of coordinates) {
        const point = parseCoordPair(item);
        if (point) {
          points.push(point);
        }
      }
      if (points.length >= 2) {
        return snapPathToMarker(points, start, goal);
      }
    } catch {
      // try next host
    }
  }

  return [];
}

export async function getMapRoutePath(
  start: MapRoutePoint,
  goal: MapRoutePoint,
): Promise<{ path: MapRoutePoint[]; mode: "driving" | "walking" }> {
  const driving = await fetchNaverRoute(start, goal, "driving");
  if (driving.length >= 2) {
    return { path: driving, mode: "driving" };
  }

  const walking = await fetchNaverRoute(start, goal, "walking");
  if (walking.length >= 2) {
    return { path: walking, mode: "walking" };
  }

  const osrmDriving = await fetchOsrmRoute(start, goal, "driving");
  if (osrmDriving.length >= 2) {
    return { path: osrmDriving, mode: "driving" };
  }

  const osrmWalking = await fetchOsrmRoute(start, goal, "foot");
  if (osrmWalking.length >= 2) {
    return { path: osrmWalking, mode: "walking" };
  }

  throw new Error("경로를 찾지 못했습니다.");
}
