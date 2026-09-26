import type { ChatbotWordCount } from "@/lib/chatbot-word-analytics";

export const SITE_ANALYTICS_TYPES = [
  "page_view",
  "pwa_view",
  "link_share",
  "board_view",
  "board_write",
  "board_comment",
  "chatbot_open",
  "chatbot_message",
  "stamp_join",
] as const;

export type SiteAnalyticsEventType = (typeof SITE_ANALYTICS_TYPES)[number];
export type SiteAnalyticsPeriod = 7 | 14 | "month";

export type SiteAnalyticsDaily = {
  date: string;
  page_view: number;
  pwa_view: number;
  link_share: number;
  board_view: number;
  board_write: number;
  board_comment: number;
  chatbot_open: number;
  chatbot_message: number;
  stamp_join: number;
  season_pass_join: number;
};

export type SiteAnalyticsSummary = {
  period: SiteAnalyticsPeriod;
  periodLabel: string;
  averageLabel: string;
  pageViews: number;
  pageViewsPerDay: number;
  pwaViews: number;
  pwaRate: number;
  linkShares: number;
  boardViews: number;
  boardWrites: number;
  boardComments: number;
  chatbotOpens: number;
  chatbotMessages: number;
  stampJoins: number;
  stampRate: number;
  seasonPassJoins: number;
  seasonPassRate: number;
  chatbotWords: ChatbotWordCount[];
  chatbotMissedWords: ChatbotWordCount[];
  daily: SiteAnalyticsDaily[];
};

const SOCIAL_REFERRERS = ["kakaotalk", "facebook.com", "instagram.com", "t.co", "twitter.com", "x.com", "band.us"];

export function isSharedLinkReferrer(referrer: string) {
  const value = referrer.toLowerCase();
  return SOCIAL_REFERRERS.some((item) => value.includes(item));
}

export function trackSiteAnalytics(eventType: SiteAnalyticsEventType, path?: string) {
  if (typeof window === "undefined") return;
  void fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: eventType,
      path: (path || window.location.pathname).slice(0, 200),
    }),
  }).catch(() => {});
}

export async function shareCurrentSiteLink() {
  if (typeof window === "undefined") return "abort" as const;
  const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title: document.title, url });
      trackSiteAnalytics("link_share");
      return "shared" as const;
    }
  } catch (error) {
    if ((error as DOMException)?.name === "AbortError") {
      return "abort" as const;
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    trackSiteAnalytics("link_share");
    return "copied" as const;
  } catch {
    return "abort" as const;
  }
}

export function emptyDaily(date: string): SiteAnalyticsDaily {
  return {
    date,
    page_view: 0,
    pwa_view: 0,
    link_share: 0,
    board_view: 0,
    board_write: 0,
    board_comment: 0,
    chatbot_open: 0,
    chatbot_message: 0,
    stamp_join: 0,
    season_pass_join: 0,
  };
}

export function kstYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function parseAnalyticsMonth(value: string | null | undefined) {
  const match = String(value ?? "").trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return `${match[1]}-${match[2]}`;
}

export const ANALYTICS_MONTH_START = "2026-07";

export function currentAnalyticsMonth() {
  return kstYmd().slice(0, 7);
}

export function analyticsMonthOptions(_count = 24) {
  const start = parseAnalyticsMonth(ANALYTICS_MONTH_START) ?? "2026-07";
  const end = currentAnalyticsMonth();
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  const startIndex = startYear * 12 + startMonth;
  const endIndex = Math.max(startIndex, endYear * 12 + endMonth);
  const options: Array<{ value: string; label: string }> = [];
  for (let cursor = startIndex; cursor <= endIndex; cursor += 1) {
    const year = Math.floor((cursor - 1) / 12);
    const month = ((cursor - 1) % 12) + 1;
    const value = `${year}-${String(month).padStart(2, "0")}`;
    options.push({ value, label: `${year}년 ${month}월` });
  }
  return options.reverse();
}

export function kstStartIso(year: number, month: number, day = 1) {
  return new Date(Date.UTC(year, month - 1, day) - 9 * 60 * 60 * 1000).toISOString();
}

export function asAnalyticsPeriod(value: string | null, month: string | null): SiteAnalyticsPeriod {
  if (month) return "month";
  if (value === "7") return 7;
  if (value === "month") return "month";
  return 14;
}

export type AnalyticsDateRange = {
  from: string;
  until: string | null;
  keys: string[];
  periodLabel: string;
  averageLabel: string;
  divisor: number;
};

export function analyticsRangeForPeriod(
  period: SiteAnalyticsPeriod,
  monthValue: string | null,
): AnalyticsDateRange {
  const today = kstYmd(new Date());
  const [year, month, day] = today.split("-").map(Number);

  if (period === "month") {
    const selectedRaw = parseAnalyticsMonth(monthValue) ?? currentAnalyticsMonth();
    const selected = selectedRaw < ANALYTICS_MONTH_START ? ANALYTICS_MONTH_START : selectedRaw;
    const [selectedYear, selectedMonth] = selected.split("-").map(Number);
    const isCurrent = selected === currentAnalyticsMonth();
    const lastDay = new Date(Date.UTC(selectedYear, selectedMonth, 0)).getUTCDate();
    const untilDay = isCurrent ? day : lastDay;
    const keys: string[] = [];
    for (let cursor = 1; cursor <= untilDay; cursor += 1) {
      keys.push(
        `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(cursor).padStart(2, "0")}`,
      );
    }
    const nextMonth = selectedMonth === 12 ? [selectedYear + 1, 1] : [selectedYear, selectedMonth + 1];
    return {
      from: kstStartIso(selectedYear, selectedMonth, 1),
      until: kstStartIso(nextMonth[0], nextMonth[1], 1),
      keys,
      periodLabel: `${selectedYear}년 ${selectedMonth}월`,
      averageLabel: "하루 평균",
      divisor: Math.max(1, keys.length),
    };
  }

  const keys: string[] = [];
  for (let index = period - 1; index >= 0; index -= 1) {
    keys.push(kstYmd(new Date(Date.UTC(year, month - 1, day - index, 3, 0, 0))));
  }
  const [fromYear, fromMonth, fromDay] = keys[0].split("-").map(Number);
  return {
    from: kstStartIso(fromYear, fromMonth, fromDay),
    until: null,
    keys,
    periodLabel: `최근 ${period}일`,
    averageLabel: "하루 평균",
    divisor: period,
  };
}
