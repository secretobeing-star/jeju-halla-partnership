export type MapRoutePoint = {
  latitude: number;
  longitude: number;
};

type NaverDirectionsResponse = {
  code?: number;
  message?: string;
  route?: Record<
    string,
    Array<{
      path?: Array<[number, number] | number[]>;
    }>
  >;
};

function getNaverMapsKeys() {
  const clientId =
    process.env.NAVER_GEOCODE_CLIENT_ID?.trim() || process.env.NCP_CLIENT_ID?.trim();
  const clientSecret =
    process.env.NAVER_GEOCODE_CLIENT_SECRET?.trim() ||
    process.env.NCP_CLIENT_SECRET?.trim();

  return { clientId, clientSecret };
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
    const path = route[key]?.[0]?.path;
    if (!Array.isArray(path) || path.length < 2) {
      continue;
    }

    const points: MapRoutePoint[] = [];
    for (const item of path) {
      if (!Array.isArray(item) || item.length < 2) {
        continue;
      }
      const longitude = Number(item[0]);
      const latitude = Number(item[1]);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        points.push({ latitude, longitude });
      }
    }

    if (points.length >= 2) {
      return points;
    }
  }

  return [];
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
    "https://naveropenapi.apigw.ntruss.com",
    "https://maps.apigw.ntruss.com",
  ];
  const path = mode === "walking" ? "/map-direction/v1/walking" : "/map-direction/v1/driving";

  for (const host of hosts) {
    const endpoint = new URL(`${host}${path}`);
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
      if (points.length >= 2) {
        return points;
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
): Promise<{ path: MapRoutePoint[]; mode: "walking" | "driving" | "straight" }> {
  const walking = await fetchNaverRoute(start, goal, "walking");
  if (walking.length >= 2) {
    return { path: walking, mode: "walking" };
  }

  const driving = await fetchNaverRoute(start, goal, "driving");
  if (driving.length >= 2) {
    return { path: driving, mode: "driving" };
  }

  return {
    path: [start, goal],
    mode: "straight",
  };
}
