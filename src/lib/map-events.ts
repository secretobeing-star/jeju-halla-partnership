export const DEFAULT_MAP_TAB_NAME_KEY = "default_map_tab_name";
export const DEFAULT_MAP_MARKER_IMG_KEY = "default_map_marker_img";
export const DEFAULT_TAB_NAME_KEY = "default_tab_name";
export const DEFAULT_MARKER_IMG_KEY = "default_marker_img";
export const DEFAULT_BENEFIT_BTN_LABEL_KEY = "default_benefit_btn_label";
export const EVENT_STAMP_BTN_LABEL_KEY = "event_stamp_btn_label";
export const STAMP_BUTTON_LABEL_KEY = "stamp_button_label";

export const DEFAULT_MAP_TAB_NAME = "🌿 제휴처";
export const DEFAULT_BENEFIT_BTN_LABEL = "자세히 보기";
export const DEFAULT_STAMP_BTN_LABEL = "도장 찍기";
export const DEFAULT_RADIUS_METERS = 30;

export const MAP_EVENT_REWARD_TYPES = ["RANDOM_STEP", "GUARANTEED", "COMPLETION"] as const;
export const MAP_EVENT_REWARD_CATEGORIES = ["CARD_SKIN", "CARD_STICKER", "COUPON"] as const;

export type MapEventRewardType = (typeof MAP_EVENT_REWARD_TYPES)[number];
export type MapEventRewardCategory = (typeof MAP_EVENT_REWARD_CATEGORIES)[number];

export type MapAppConfig = {
  default_map_tab_name: string;
  default_map_marker_img: string;
  default_benefit_btn_label: string;
  event_stamp_btn_label?: string;
  stamp_button_label?: string;
};

export type MapEvent = {
  id: string;
  tab_name: string;
  title: string;
  description: string;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  max_stamps: number;
  step_probabilities: number[];
  radius_meters: number;
  cooldown_minutes: number;
  stamp_active_img: string | null;
  stamp_inactive_img: string | null;
  marker_icon_img: string | null;
  banner_img: string | null;
  stamp_bar_bg_img: string | null;
  stamp_bar_bg_color: string | null;
  completion_badge_img: string | null;
  guide_text: string | null;
  distance_error_message: string | null;
  win_message: string | null;
  lose_message: string | null;
  completion_message: string | null;
  win_popup_message: string | null;
  lose_popup_message: string | null;
  completion_popup_message: string | null;
  stamp_btn_label: string | null;
  sort_order: number;
  partner_ids?: string[];
  rewards?: MapEventReward[];
};

export type MapEventReward = {
  id: string;
  event_id: string;
  reward_type: MapEventRewardType;
  category: MapEventRewardCategory;
  reward_name: string;
  reward_img: string | null;
  item_value: string | null;
  frame_css_value: string | null;
  stock: number;
  sort_order: number;
};

export type UserEventProgress = {
  id?: string;
  user_id: string;
  event_id: string;
  current_stamps: number;
  is_completed: boolean;
  stamped_places: string[];
  last_stamped_at?: string | null;
};

export type UserGift = {
  id: string;
  user_id: string;
  reward_id: string | null;
  event_id: string | null;
  reward_name: string;
  reward_img: string | null;
  frame_css_value: string | null;
  is_claimed: boolean;
  created_at: string;
  claimed_at: string | null;
};

export function parseStepProbabilities(value: unknown, maxStamps: number): number[] {
  const count = Math.max(1, Math.floor(maxStamps) || 1);
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: count }, (_, index) => {
    const raw = Number(source[index] ?? 0);
    if (!Number.isFinite(raw) || raw < 0) {
      return 0;
    }
    if (raw > 1) {
      return Math.min(1, raw / 100);
    }
    return Math.min(1, raw);
  });
}

export function probabilityToPercent(value: number) {
  return Math.round(Math.min(1, Math.max(0, value)) * 1000) / 10;
}

export function rollStepWin(probability: number) {
  const p = Number.isFinite(probability) ? Math.min(1, Math.max(0, probability)) : 0;
  return Math.random() < p;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
    .filter(Boolean);
}

export function isRewardType(value: unknown): value is MapEventRewardType {
  return MAP_EVENT_REWARD_TYPES.includes(value as MapEventRewardType);
}

export function isRewardCategory(value: unknown): value is MapEventRewardCategory {
  return MAP_EVENT_REWARD_CATEGORIES.includes(value as MapEventRewardCategory);
}

export function emptyProgress(userId: string, eventId: string): UserEventProgress {
  return {
    user_id: userId,
    event_id: eventId,
    current_stamps: 0,
    is_completed: false,
    stamped_places: [],
    last_stamped_at: null,
  };
}

export function isEventLive(event: Pick<MapEvent, "is_active" | "start_at" | "end_at">, now = Date.now()) {
  if (!event.is_active) {
    return false;
  }
  if (event.start_at) {
    const start = Date.parse(event.start_at);
    if (Number.isFinite(start) && now < start) {
      return false;
    }
  }
  if (event.end_at) {
    const end = Date.parse(event.end_at);
    if (Number.isFinite(end) && now > end) {
      return false;
    }
  }
  return true;
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function formatHeartCountdown(endAt: string | null | undefined, now = Date.now()) {
  if (!endAt) {
    return "";
  }
  const end = Date.parse(endAt);
  if (!Number.isFinite(end)) {
    return "";
  }
  const diff = Math.max(0, end - now);
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `❤️ ${days}일 ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

export function resolveFrameValue(reward: Pick<MapEventReward, "frame_css_value" | "item_value">) {
  return reward.frame_css_value?.trim() || reward.item_value?.trim() || "";
}

export function remainingCooldownMs(
  lastStampedAt: string | null | undefined,
  cooldownMinutes: number,
  now = Date.now(),
) {
  const minutes = Math.max(0, Number(cooldownMinutes) || 0);
  if (minutes <= 0 || !lastStampedAt) {
    return 0;
  }
  const last = Date.parse(lastStampedAt);
  if (!Number.isFinite(last)) {
    return 0;
  }
  return Math.max(0, last + minutes * 60_000 - now);
}

export function formatCooldownRemain(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins <= 0) {
    return `${secs}초`;
  }
  return `${mins}분 ${String(secs).padStart(2, "0")}초`;
}

export function completionRewardsOf(event: Pick<MapEvent, "rewards">) {
  return (event.rewards ?? []).filter((reward) => reward.reward_type === "COMPLETION");
}

export function configFromRows(
  rows: Array<{ key?: string; value?: string | null }>,
  stampButtonLabel?: string | null
): MapAppConfig {
  const map = new Map(rows.map((row) => [row.key ?? "", row.value ?? ""]));
  const tab =
    map.get(DEFAULT_TAB_NAME_KEY)?.trim() ||
    map.get(DEFAULT_MAP_TAB_NAME_KEY)?.trim() ||
    DEFAULT_MAP_TAB_NAME;
  const marker =
    map.get(DEFAULT_MARKER_IMG_KEY)?.trim() ||
    map.get(DEFAULT_MAP_MARKER_IMG_KEY)?.trim() ||
    "";
  
  // site_settings의 stamp_button_label 우선, 그 다음 app_configs의 event_stamp_btn_label 사용
  const stampLabel = stampButtonLabel?.trim() || 
                    map.get(EVENT_STAMP_BTN_LABEL_KEY)?.trim() || 
                    DEFAULT_STAMP_BTN_LABEL;
  
  return {
    default_map_tab_name: tab,
    default_map_marker_img: marker,
    default_benefit_btn_label:
      map.get(DEFAULT_BENEFIT_BTN_LABEL_KEY)?.trim() || DEFAULT_BENEFIT_BTN_LABEL,
    event_stamp_btn_label: stampLabel,
    stamp_button_label: stampLabel,
  };
}