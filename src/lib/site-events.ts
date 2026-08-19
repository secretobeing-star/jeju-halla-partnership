import type { SiteEvent, SiteEventListType } from "@/lib/supabase";

export type SiteEventBoardFilter = "ongoing" | "ended";

export const SITE_EVENT_BOARD_FILTERS: Array<{
  id: SiteEventBoardFilter;
  label: string;
}> = [
  { id: "ongoing", label: "진행중인 이벤트" },
  { id: "ended", label: "종료된 이벤트" },
];

export function normalizeSiteEventListType(_value: string | null | undefined): SiteEventListType {
  // 당첨자 발표 분류는 제거됨 — 기간 기준으로만 진행중/종료 분류
  return "event";
}

export function resolveSiteEventBoardFilter(
  event: Pick<SiteEvent, "list_type" | "starts_at" | "ends_at">,
  nowMs = Date.now(),
): SiteEventBoardFilter {
  const endsAt = event.ends_at ? Date.parse(event.ends_at) : Number.NaN;
  if (Number.isFinite(endsAt) && endsAt < nowMs) {
    return "ended";
  }

  return "ongoing";
}

export function formatSiteEventDateRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
) {
  const format = (value: string | null | undefined) => {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  };

  const start = format(startsAt);
  const end = format(endsAt);
  if (start && end) {
    return `${start} ~ ${end}`;
  }
  if (start) {
    return `${start} ~`;
  }
  if (end) {
    return `~ ${end}`;
  }
  return null;
}

export function toDatetimeLocalValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}
