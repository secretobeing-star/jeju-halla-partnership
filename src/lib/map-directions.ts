export type MapRoutePoint = {
  latitude: number;
  longitude: number;
};

type NaverDirectionsResponse = {
  code?: number;
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
    const longitude = Number(item[0]);
    const latitude = Number(item[1]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
    return null;
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

function isUsableRoute(path: MapRoutePoint[], start: MapRoutePoint, goal: MapRoutePoint) {
  if (path.length >= 3) {
    return true;
  }

  if (path.length < 2) {
    return false;
  }

  return distanceMeters(start, goal) <= 120;
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

  const hosts = [
    "https://maps.apigw.ntruss.com",
    "https://naveropenapi.apigw.ntruss.com",
  ];
  const prefixes = mode === "walking"
    ? ["/map-direction/v1/walking", "/map-direction-15/v1/walking"]
    : ["/map-direction/v1/driving", "/map-direction-15/v1/driving"];

  for (const host of hosts) {
    for (const prefix of prefixes) {
      const endpoint = new URL(`${host}${prefix}`);
      endpoint.searchParams.set("start", `${start.longitude},${start.latitude}`);
      endpoint.searchParams.set("goal", `${goal.longitude},${goal.latitude}`);
      if (mode === "driving") {
        endpoint.searchParams.set("option", "traoptimal");
      }

      try {
        const response = await fetch(endpoint.toString(), {
          headers: {
            Accept: "application/json",
            "X-NCP-APIGW-API-KEY-ID": clientId,
            "X-NCP-APIGW-API-KEY": clientSecret,
          },
          cache: "no-store",
        });
        if (!response.ok) {
          continue;
        }
        const payload = (await response.json()) as NaverDirectionsResponse;
        if (payload.code != null && payload.code !== 0) {
          continue;
        }
        const points = extractPath(payload);
        if (isUsableRoute(points, start, goal)) {
          return snapPathToMarker(points, start, goal);
        }
      } catch {
        // try next endpoint
      }
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

  throw new Error("경로를 찾지 못했습니다.");
}
