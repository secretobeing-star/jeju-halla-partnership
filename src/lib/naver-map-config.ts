export type NaverMapAuthParam = "ncpKeyId" | "ncpClientId";

export type NaverMapClientConfig = {
  clientId: string | null;
  keySource: "maps_public" | "ncp_public" | "geocode_server" | "ncp_server" | null;
};

export function resolveNaverMapClientConfig(): NaverMapClientConfig {
  const mapsPublic = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID?.trim();
  if (mapsPublic) {
    return { clientId: mapsPublic, keySource: "maps_public" };
  }

  const ncpPublic = process.env.NEXT_PUBLIC_NCP_CLIENT_ID?.trim();
  if (ncpPublic) {
    return { clientId: ncpPublic, keySource: "ncp_public" };
  }

  const geocode = process.env.NAVER_GEOCODE_CLIENT_ID?.trim();
  if (geocode) {
    return { clientId: geocode, keySource: "geocode_server" };
  }

  const ncpServer = process.env.NCP_CLIENT_ID?.trim();
  if (ncpServer) {
    return { clientId: ncpServer, keySource: "ncp_server" };
  }

  return { clientId: null, keySource: null };
}

export function resolveNaverMapClientId(): string | null {
  return resolveNaverMapClientConfig().clientId;
}

export function resolveNaverMapAuthParams(): NaverMapAuthParam[] {
  const explicit = process.env.NAVER_MAP_AUTH_PARAM?.trim();
  if (explicit === "ncpClientId" || explicit === "ncpKeyId") {
    return [explicit];
  }

  return ["ncpKeyId", "ncpClientId"];
}

export function isLikelyGeocodeOnlyMapKey(keySource: NaverMapClientConfig["keySource"]): boolean {
  return keySource === "geocode_server" || keySource === "ncp_server";
}
