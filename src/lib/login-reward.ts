export type LoginRewardScheduleMode = "on_login" | "scheduled";

export type LoginRewardSettings = {
  enabled: boolean;
  goldAmount: number;
  costumeFrameId: string;
  couponCode: string;
  pushEnabled: boolean;
  pushTitle: string;
  pushBody: string;
  scheduleMode: LoginRewardScheduleMode;
  sendHour: number;
  sendMinute: number;
  startDate: string;
  endDate: string;
  weekdays: number[];
  lastDispatchedOn: string;
};

export const DEFAULT_LOGIN_REWARD: LoginRewardSettings = {
  enabled: false,
  goldAmount: 10,
  costumeFrameId: "",
  couponCode: "",
  pushEnabled: true,
  pushTitle: "접속 보상",
  pushBody: "접속 보상이 선물함에 도착했습니다. 선물함에서 받아 주세요!",
  scheduleMode: "on_login",
  sendHour: 9,
  sendMinute: 0,
  startDate: "",
  endDate: "",
  weekdays: [],
  lastDispatchedOn: "",
};

export const LOGIN_REWARD_WEEKDAY_LABELS = [
  { value: 0, label: "일" },
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
  { value: 6, label: "토" },
] as const;

const WEEKDAY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function clampHour(value: unknown) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_LOGIN_REWARD.sendHour;
  return Math.min(23, Math.max(0, n));
}

function clampMinute(value: unknown) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_LOGIN_REWARD.sendMinute;
  return Math.min(59, Math.max(0, n));
}

function asYmd(value: unknown) {
  const raw = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

export function parseLoginRewardWeekdays(value: unknown): number[] {
  const raw = Array.isArray(value)
    ? value
    : String(value ?? "")
        .split(/[,\s]+/)
        .filter(Boolean);
  const next = [...new Set(raw.map((item) => Math.floor(Number(item))).filter((n) => n >= 0 && n <= 6))];
  next.sort((a, b) => a - b);
  return next;
}

export function serializeLoginRewardWeekdays(weekdays: number[]) {
  return parseLoginRewardWeekdays(weekdays).join(",");
}

export function hasLoginRewardGrant(settings: LoginRewardSettings): boolean {
  return settings.goldAmount >= 1 || Boolean(settings.costumeFrameId) || Boolean(settings.couponCode);
}

export function loginRewardCampaignDate(settings: LoginRewardSettings) {
  return settings.startDate;
}

export function getKstDateTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekday = WEEKDAY_SHORT[pick("weekday")] ?? 0;
  const hourRaw = Number(pick("hour"));
  return {
    ymd: `${pick("year")}-${pick("month")}-${pick("day")}`,
    hour: Number.isFinite(hourRaw) ? hourRaw % 24 : 0,
    minute: Number(pick("minute")) || 0,
    weekday,
  };
}

export function isLoginRewardDay(settings: LoginRewardSettings, now = new Date()) {
  const { ymd, weekday } = getKstDateTime(now);
  if (!settings.startDate) return false;
  if (ymd < settings.startDate) return false;
  if (settings.endDate && ymd > settings.endDate) return false;
  if (settings.weekdays.length > 0 && !settings.weekdays.includes(weekday)) return false;
  return true;
}

export function isLoginRewardWindowOpen(settings: LoginRewardSettings, now = new Date()) {
  if (!settings.enabled || !hasLoginRewardGrant(settings)) return false;
  if (!settings.startDate) return false;
  if (!isLoginRewardDay(settings, now)) return false;
  const { ymd, hour, minute } = getKstDateTime(now);
  if (ymd === settings.startDate) {
    return hour * 60 + minute >= settings.sendHour * 60 + settings.sendMinute;
  }
  return true;
}

export function formatLoginRewardTime(settings: LoginRewardSettings) {
  return `${String(settings.sendHour).padStart(2, "0")}:${String(settings.sendMinute).padStart(2, "0")}`;
}

export function mapLoginRewardSettings(row: Record<string, unknown> | null): LoginRewardSettings {
  if (!row) return DEFAULT_LOGIN_REWARD;
  const mode = String(row.schedule_mode ?? "").trim() === "scheduled" ? "scheduled" : "on_login";
  return {
    enabled: row.enabled === true,
    goldAmount: Math.max(0, Math.floor(Number(row.gold_amount) || 0)),
    costumeFrameId: String(row.costume_frame_id ?? "").trim(),
    couponCode: String(row.coupon_code ?? "").trim(),
    pushEnabled: row.push_enabled !== false,
    pushTitle: String(row.push_title ?? "").trim() || DEFAULT_LOGIN_REWARD.pushTitle,
    pushBody: String(row.push_body ?? "").trim() || DEFAULT_LOGIN_REWARD.pushBody,
    scheduleMode: mode,
    sendHour: clampHour(row.send_hour),
    sendMinute: clampMinute(row.send_minute),
    startDate: asYmd(row.start_date),
    endDate: asYmd(row.end_date),
    weekdays: parseLoginRewardWeekdays(row.weekdays),
    lastDispatchedOn: asYmd(row.last_dispatched_on),
  };
}
