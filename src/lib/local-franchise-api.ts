export const JEJU_LOCAL_FRANCHISE_REGION_CODES = ["50110", "50130"] as const;

const ACTIVE_BUSINESS_STATUS = "01";
const API_BASE = "https://apis.data.go.kr/B190001/localFranchisesV2/franchiseV2";

export type LocalFranchiseRecord = {
  frcs_nm: string;
  frcs_addr: string;
  frcs_dtl_addr?: string | null;
  bzmn_stts: string;
  bzmn_stts_nm?: string | null;
  usage_rgn_cd?: string | null;
  lat?: string | null;
  lot?: string | null;
};

type LocalFranchiseApiResponse = {
  currentCount?: number;
  data?: LocalFranchiseRecord[] | LocalFranchiseRecord | null;
  matchCount?: number;
};

export function getLocalFranchiseServiceKey() {
  return process.env.LOCAL_FRANCHISE_SERVICE_KEY?.trim() ?? "";
}

export function isLocalFranchiseApiConfigured() {
  return Boolean(getLocalFranchiseServiceKey());
}

function normalizeMatchText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function flattenFranchiseData(
  data: LocalFranchiseApiResponse["data"],
): LocalFranchiseRecord[] {
  if (!data) {
    return [];
  }

  return Array.isArray(data) ? data : [data];
}

async function fetchFranchisePage(searchParams: Record<string, string>) {
  const serviceKey = getLocalFranchiseServiceKey();
  if (!serviceKey) {
    return [];
  }

  const url = new URL(API_BASE);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("page", "1");
  url.searchParams.set("perPage", "10");
  url.searchParams.set("returnType", "JSON");

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; jeju-halla-partnership/1.0)",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`local-franchise API ${response.status}: ${body.slice(0, 200)}`);
  }

  if (body.includes("Web firewall security policies")) {
    throw new Error("local-franchise API blocked by WAF");
  }

  let parsed: LocalFranchiseApiResponse;
  try {
    parsed = JSON.parse(body) as LocalFranchiseApiResponse;
  } catch {
    throw new Error("local-franchise API returned non-JSON response");
  }

  return flattenFranchiseData(parsed.data).filter(
    (item) => item.bzmn_stts === ACTIVE_BUSINESS_STATUS,
  );
}

async function searchFranchisesByNameInRegion(name: string, regionCode: string) {
  return fetchFranchisePage({
    "cond[frcs_nm::EQ]": name,
    "cond[usage_rgn_cd::EQ]": regionCode,
  });
}

function pickBestFranchiseMatch(
  candidates: LocalFranchiseRecord[],
  address?: string | null,
) {
  if (candidates.length === 0) {
    return null;
  }

  const normalizedAddress = address?.trim() ? normalizeMatchText(address) : "";

  if (normalizedAddress) {
    const byAddress = candidates.find((item) => {
      const franchiseAddress = normalizeMatchText(
        `${item.frcs_addr}${item.frcs_dtl_addr ?? ""}`,
      );
      return (
        franchiseAddress.includes(normalizedAddress) ||
        normalizedAddress.includes(franchiseAddress)
      );
    });

    if (byAddress) {
      return byAddress;
    }
  }

  return candidates.length === 1 ? candidates[0] : null;
}

export async function checkLocalFranchiseAvailability(options: {
  name: string;
  address?: string | null;
}) {
  const name = options.name.trim();
  if (!isLocalFranchiseApiConfigured()) {
    return { configured: false, available: false, match: null as LocalFranchiseRecord | null };
  }

  if (!name) {
    return { configured: true, available: false, match: null as LocalFranchiseRecord | null };
  }

  const regionResults = await Promise.all(
    JEJU_LOCAL_FRANCHISE_REGION_CODES.map((regionCode) =>
      searchFranchisesByNameInRegion(name, regionCode),
    ),
  );

  const candidates = regionResults.flat();
  const match = pickBestFranchiseMatch(candidates, options.address);

  return {
    configured: true,
    available: Boolean(match),
    match,
  };
}

export async function checkLocalFranchiseAvailabilityBatch(
  partners: Array<{ id: string; name: string; address?: string | null }>,
) {
  if (!isLocalFranchiseApiConfigured()) {
    return {
      configured: false,
      results: {} as Record<string, boolean>,
    };
  }

  const entries = await Promise.all(
    partners.map(async (partner) => {
      const result = await checkLocalFranchiseAvailability({
        name: partner.name,
        address: partner.address,
      });
      return [partner.id, result.available] as const;
    }),
  );

  return {
    configured: true,
    results: Object.fromEntries(entries),
  };
}
