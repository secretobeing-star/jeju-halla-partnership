import { SiteSettings } from "@/lib/supabase";

export type PartnerRegionGroup = {
  id: string;
  label: string;
  areas: string[];
};

export type PartnerRegionFilter = {
  city: string;
  area: string;
};

export type PartnerRegionSelection = PartnerRegionFilter;
export type PartnerRegionFilters = PartnerRegionSelection[];

export const PARTNER_REGION_ALL = "전체";
export const PARTNER_REGION_AREA_LABEL = "동·읍·면";

export const JEJU_CITY_DONG_AREAS = [
  "이도1동",
  "이도2동",
  "도남동",
  "건입동",
  "노형동",
  "도두동",
  "봉개동",
  "삼도1동",
  "삼도2동",
  "삼양동",
  "아라동",
  "월평동",
  "연동",
  "오라동",
  "외도동",
  "용담1동",
  "용담2동",
  "이호동",
  "일도1동",
  "일도2동",
  "화북동",
] as const;

export const JEJU_CITY_EUP_AREAS = ["구좌읍", "애월읍", "조천읍", "한림읍"] as const;

export const JEJU_CITY_MYEON_AREAS = ["우도면", "한경면", "추자면"] as const;

export const SEOGWIPO_DONG_AREAS = [
  "대륜동",
  "대천동",
  "동홍동",
  "서홍동",
  "송산동",
  "영천동",
  "예래동",
  "정방동",
  "중문동",
  "대포동",
  "중앙동",
  "천지동",
  "효돈동",
] as const;

export const SEOGWIPO_EUP_AREAS = ["남원읍", "대정읍", "성산읍"] as const;

export const SEOGWIPO_MYEON_AREAS = ["안덕면", "표선면"] as const;

export const DEFAULT_PARTNER_REGION_GROUPS: PartnerRegionGroup[] = [
  {
    id: "jeju-city",
    label: "제주시",
    areas: [
      ...JEJU_CITY_DONG_AREAS,
      ...JEJU_CITY_EUP_AREAS,
      ...JEJU_CITY_MYEON_AREAS,
      "기타",
    ],
  },
  {
    id: "seogwipo-city",
    label: "서귀포시",
    areas: [...SEOGWIPO_DONG_AREAS, ...SEOGWIPO_EUP_AREAS, ...SEOGWIPO_MYEON_AREAS, "기타"],
  },
];

const MAX_PARTNER_REGION_GROUPS = 10;
const MAX_AREAS_PER_GROUP = 40;
const MAX_PARTNER_REGION_LABEL_LENGTH = 20;

const AREA_TO_CITY_MAP: Record<string, string> = Object.fromEntries([
  ...DEFAULT_PARTNER_REGION_GROUPS.flatMap((group) =>
    group.areas.map((area) => [area, group.label]),
  ),
]);

const LEGACY_INFORMAL_AREA_MAP: Record<string, string> = {
  제원: "연동",
  아라: "아라동",
  연동: "연동",
  노형: "노형동",
  이도: "이도1동",
  삼도: "삼도1동",
  오라: "오라동",
  중문: "중문동",
  서귀동: "중앙동",
  대정: "대정읍",
  남원: "남원읍",
  표선: "표선면",
  성산: "성산읍",
};

function resolveCityForArea(area: string): string | null {
  return AREA_TO_CITY_MAP[area] ?? null;
}

function migrateLegacyCityRegion(region: string): string {
  const trimmed = region.trim();
  if (!trimmed) {
    return trimmed;
  }

  const slashIndex = trimmed.indexOf("/");
  if (slashIndex === -1) {
    if (trimmed === "제주시" || trimmed === "서귀포시") {
      return trimmed;
    }

    const city = resolveCityForArea(trimmed);
    if (city) {
      return `${city}/${trimmed}`;
    }

    return trimmed;
  }

  const top = trimmed.slice(0, slashIndex);
  const area = trimmed.slice(slashIndex + 1);

  if (top === "제주시" || top === "서귀포시") {
    const normalizedArea = LEGACY_INFORMAL_AREA_MAP[area] ?? area;
    if (normalizedArea !== area) {
      return `${top}/${normalizedArea}`;
    }
    return trimmed;
  }

  if (top === "동" || top === "읍" || top === "면") {
    const city = resolveCityForArea(area);
    if (city) {
      return `${city}/${area}`;
    }
  }

  const informalArea = LEGACY_INFORMAL_AREA_MAP[area];
  if (informalArea) {
    const city = resolveCityForArea(informalArea);
    if (city) {
      return `${city}/${informalArea}`;
    }
  }

  return trimmed;
}

export function normalizePartnerRegionLabel(
  value: string | null | undefined,
  fallback = "새 지역",
): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, MAX_PARTNER_REGION_LABEL_LENGTH);
}

function normalizePartnerRegionGroup(raw: unknown, index: number): PartnerRegionGroup | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const label = normalizePartnerRegionLabel(
    typeof record.label === "string" ? record.label : "",
    "",
  );
  if (!label) {
    return null;
  }

  const id =
    typeof record.id === "string" && record.id.trim()
      ? record.id.trim().slice(0, 40)
      : `region-group-${index + 1}`;

  const areas = normalizePartnerRegionAreas(record.areas);

  return {
    id,
    label,
    areas,
  };
}

function normalizePartnerRegionAreas(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<string>();
  const areas: string[] = [];

  for (const item of raw) {
    if (typeof item !== "string") {
      continue;
    }

    const label = normalizePartnerRegionLabel(item, "");
    if (!label || seen.has(label) || label === PARTNER_REGION_ALL) {
      continue;
    }

    seen.add(label);
    areas.push(label);

    if (areas.length >= MAX_AREAS_PER_GROUP) {
      break;
    }
  }

  return areas;
}

function isLegacyTypeGroupLabel(label: string) {
  return label === "동" || label === "읍" || label === "면";
}

function migrateLegacyTypeGroups(raw: PartnerRegionGroup[]): PartnerRegionGroup[] {
  if (!raw.some((group) => isLegacyTypeGroupLabel(group.label))) {
    return raw;
  }

  return DEFAULT_PARTNER_REGION_GROUPS.map((group) => ({ ...group, areas: [...group.areas] }));
}

function migrateLegacyFlatRegions(raw: string[]): PartnerRegionGroup[] {
  const areas = normalizePartnerRegionAreas(raw);
  if (areas.length === 0) {
    return DEFAULT_PARTNER_REGION_GROUPS.map((group) => ({ ...group, areas: [...group.areas] }));
  }

  const jejuAreas: string[] = [];
  const seogwipoAreas: string[] = [];

  for (const area of areas) {
    const city = resolveCityForArea(area);
    if (city === "서귀포시") {
      seogwipoAreas.push(area);
    } else if (city === "제주시") {
      jejuAreas.push(area);
    } else {
      jejuAreas.push(area);
    }
  }

  return [
    {
      id: "jeju-city",
      label: "제주시",
      areas: jejuAreas.length > 0 ? jejuAreas : [...DEFAULT_PARTNER_REGION_GROUPS[0].areas],
    },
    {
      id: "seogwipo-city",
      label: "서귀포시",
      areas:
        seogwipoAreas.length > 0 ? seogwipoAreas : [...DEFAULT_PARTNER_REGION_GROUPS[1].areas],
    },
  ];
}

export function normalizePartnerRegionGroups(raw: unknown): PartnerRegionGroup[] {
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "string") {
    return migrateLegacyFlatRegions(raw as string[]);
  }

  if (!Array.isArray(raw)) {
    return DEFAULT_PARTNER_REGION_GROUPS.map((group) => ({
      ...group,
      areas: [...group.areas],
    }));
  }

  const groups: PartnerRegionGroup[] = [];

  for (const [index, item] of raw.entries()) {
    const group = normalizePartnerRegionGroup(item, index);
    if (!group) {
      continue;
    }

    groups.push(group);

    if (groups.length >= MAX_PARTNER_REGION_GROUPS) {
      break;
    }
  }

  const normalized =
    groups.length > 0
      ? groups
      : DEFAULT_PARTNER_REGION_GROUPS.map((group) => ({ ...group, areas: [...group.areas] }));

  return migrateLegacyTypeGroups(normalized);
}

export function getPartnerRegionGroups(
  settings?: Partial<SiteSettings> | null,
): PartnerRegionGroup[] {
  return normalizePartnerRegionGroups(settings?.partner_regions);
}

export function formatPartnerRegion(city: string, area?: string | null): string | null {
  const cityLabel = normalizePartnerRegionLabel(city, "");
  if (!cityLabel || cityLabel === PARTNER_REGION_ALL) {
    return null;
  }

  const areaLabel = normalizePartnerRegionLabel(area, "");
  if (!areaLabel || areaLabel === PARTNER_REGION_ALL) {
    return cityLabel;
  }

  return `${cityLabel}/${areaLabel}`;
}

export function parsePartnerRegion(
  region: string | null | undefined,
): { city: string; area: string | null } {
  const trimmed = migrateLegacyCityRegion(region?.trim() ?? "");
  if (!trimmed) {
    return { city: "", area: null };
  }

  const slashIndex = trimmed.indexOf("/");
  if (slashIndex === -1) {
    return { city: trimmed, area: null };
  }

  return {
    city: trimmed.slice(0, slashIndex),
    area: trimmed.slice(slashIndex + 1) || null,
  };
}

export function resolveStoredPartnerRegion(
  region: string | null | undefined,
  groups: PartnerRegionGroup[],
): { city: string; area: string } {
  const parsed = parsePartnerRegion(region);
  if (!parsed.city) {
    return { city: "", area: "" };
  }

  const cityGroup = groups.find((group) => group.label === parsed.city);
  if (cityGroup) {
    if (!parsed.area) {
      return { city: cityGroup.label, area: PARTNER_REGION_ALL };
    }

    if (cityGroup.areas.includes(parsed.area)) {
      return { city: cityGroup.label, area: parsed.area };
    }
  }

  for (const group of groups) {
    if (parsed.area && group.areas.includes(parsed.area)) {
      return { city: group.label, area: parsed.area };
    }

    if (!parsed.area && group.areas.includes(parsed.city)) {
      return { city: group.label, area: parsed.city };
    }
  }

  return { city: parsed.city, area: parsed.area ?? PARTNER_REGION_ALL };
}

export function partnerMatchesRegionFilter(
  partnerRegion: string | null | undefined,
  filter: PartnerRegionFilter,
): boolean {
  if (filter.city === PARTNER_REGION_ALL) {
    return true;
  }

  const parsed = parsePartnerRegion(partnerRegion);
  if (!parsed.city) {
    return false;
  }

  if (parsed.city !== filter.city) {
    return false;
  }

  if (filter.area === PARTNER_REGION_ALL) {
    return true;
  }

  return parsed.area === filter.area;
}

export function partnerMatchesRegionFilters(
  partnerRegion: string | null | undefined,
  filters: PartnerRegionFilters,
): boolean {
  if (filters.length === 0) {
    return true;
  }

  return filters.some((filter) => partnerMatchesRegionFilter(partnerRegion, filter));
}

export function isPartnerRegionSelected(
  filters: PartnerRegionFilters,
  city: string,
  area: string,
): boolean {
  return filters.some((filter) => filter.city === city && filter.area === area);
}

export function togglePartnerRegionSelection(
  filters: PartnerRegionFilters,
  city: string,
  area: string,
): PartnerRegionFilters {
  if (isPartnerRegionSelected(filters, city, area)) {
    return filters.filter((filter) => !(filter.city === city && filter.area === area));
  }

  return [...filters, { city, area }];
}

export function getPartnerRegionFilterLabel(
  filter: PartnerRegionFilter,
  groups: PartnerRegionGroup[],
): string {
  if (filter.city === PARTNER_REGION_ALL) {
    return PARTNER_REGION_ALL;
  }

  const cityGroup = groups.find((group) => group.label === filter.city);
  if (!cityGroup) {
    return filter.city;
  }

  if (filter.area === PARTNER_REGION_ALL) {
    return filter.city;
  }

  return `${filter.city} · ${filter.area}`;
}

export function getPartnerRegionFiltersSummary(
  filters: PartnerRegionFilters,
  groups: PartnerRegionGroup[],
): string {
  if (filters.length === 0) {
    return PARTNER_REGION_ALL;
  }

  const labels = filters.map((filter) => getPartnerRegionFilterLabel(filter, groups));
  if (labels.length <= 2) {
    return labels.join(", ");
  }

  return `${labels.slice(0, 2).join(", ")} 외 ${labels.length - 2}개`;
}

export function isPartnerRegionFilterActive(filter: PartnerRegionFilter): boolean {
  return filter.city !== PARTNER_REGION_ALL;
}

export function isPartnerRegionFiltersActive(filters: PartnerRegionFilters): boolean {
  return filters.length > 0;
}

export const DEFAULT_PARTNER_REGION_FILTER: PartnerRegionFilter = {
  city: PARTNER_REGION_ALL,
  area: PARTNER_REGION_ALL,
};

export const DEFAULT_PARTNER_REGION_FILTERS: PartnerRegionFilters = [];

export function countPartnersInRegionGroup(
  partners: Array<{ region?: string | null }>,
  cityLabel: string,
): number {
  return partners.filter((partner) => parsePartnerRegion(partner.region).city === cityLabel).length;
}

export function countPartnersInRegionArea(
  partners: Array<{ region?: string | null }>,
  cityLabel: string,
  areaLabel: string,
): number {
  return partners.filter((partner) => {
    const parsed = parsePartnerRegion(partner.region);
    if (parsed.city !== cityLabel) {
      return false;
    }

    if (areaLabel === PARTNER_REGION_ALL) {
      return true;
    }

    return parsed.area === areaLabel;
  }).length;
}
