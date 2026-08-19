import {
  CARD_FRAME_ITEMS,
  createEmptyCardFrameItem,
  isCardFrameItemFilled,
  type CardFrameItem,
  type PublicCardFrameItem,
} from "@/data/cardFrames";

export type { CardFrameItem, PublicCardFrameItem };

/** 해금 출처 — 이벤트 보상 연동 시 `event` 사용 */
export type CardFrameUnlockSource = "default" | "code" | "event" | "admin";

export type CardFrameUserState = {
  unlockedIds: string[];
  activeFrameId: string | null;
  /** frameId → 해금 경로 (이벤트 추적용) */
  sources: Record<string, CardFrameUnlockSource>;
};

export type CardFrameGrantPayload = {
  studentId: string;
  frameId: string;
  source: Exclude<CardFrameUnlockSource, "default">;
  meta?: {
    eventId?: string;
    eventTabId?: string;
    rewardKey?: string;
    note?: string;
  };
};

const STATE_STORAGE_PREFIX = "student-card-frame-state:";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function normalizeCardFrameItem(raw: unknown): CardFrameItem | null {
  const row = asRecord(raw);
  if (!row) {
    return null;
  }

  const item = createEmptyCardFrameItem({
    id: typeof row.id === "string" ? row.id.trim() : "",
    name: typeof row.name === "string" ? row.name.trim() : "",
    imageUrl: typeof row.imageUrl === "string" ? row.imageUrl.trim() : "",
    cssBorder: typeof row.cssBorder === "string" ? row.cssBorder.trim() : "",
    itemCode: typeof row.itemCode === "string" ? row.itemCode.trim() : "",
    description: typeof row.description === "string" ? row.description.trim() : "",
    isDefaultUnlocked: Boolean(row.isDefaultUnlocked),
  });

  return isCardFrameItemFilled(item) ? item : null;
}

/** DB / 파일 시드를 병합한 전체 카탈로그 (코드 포함, 서버·관리자용) */
export function resolveCardFrameCatalog(
  stored: unknown,
): CardFrameItem[] {
  const fromDb: CardFrameItem[] = [];
  if (Array.isArray(stored)) {
    for (const row of stored) {
      const item = normalizeCardFrameItem(row);
      if (item) {
        fromDb.push(item);
      }
    }
  }

  const fromFile = CARD_FRAME_ITEMS.filter(isCardFrameItemFilled);
  const byId = new Map<string, CardFrameItem>();

  for (const item of fromFile) {
    byId.set(item.id, item);
  }
  // DB 등록분이 동일 id면 덮어씀 (관리자 업로드 우선)
  for (const item of fromDb) {
    byId.set(item.id, item);
  }

  return Array.from(byId.values());
}

export function toPublicCardFrame(item: CardFrameItem): PublicCardFrameItem {
  return {
    id: item.id,
    name: item.name,
    imageUrl: item.imageUrl,
    cssBorder: item.cssBorder || "",
    description: item.description,
    isDefaultUnlocked: item.isDefaultUnlocked,
  };
}

export function toPublicCardFrames(items: CardFrameItem[]): PublicCardFrameItem[] {
  return items.map(toPublicCardFrame);
}

export function findCardFrameByCode(
  catalog: CardFrameItem[],
  code: string,
): CardFrameItem | null {
  const normalized = code.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return (
    catalog.find((item) => item.itemCode.trim().toLowerCase() === normalized) ?? null
  );
}

export function findCardFrameById(
  catalog: CardFrameItem[],
  frameId: string,
): CardFrameItem | null {
  const id = frameId.trim();
  if (!id) {
    return null;
  }
  return catalog.find((item) => item.id === id) ?? null;
}

function storageKey(studentId: string) {
  return `${STATE_STORAGE_PREFIX}${studentId.trim()}`;
}

function emptyState(): CardFrameUserState {
  return { unlockedIds: [], activeFrameId: null, sources: {} };
}

export function readCardFrameUserState(studentId: string): CardFrameUserState {
  if (typeof window === "undefined" || !studentId.trim()) {
    return emptyState();
  }
  try {
    const raw = localStorage.getItem(storageKey(studentId));
    if (!raw) {
      return emptyState();
    }
    const parsed = JSON.parse(raw) as Partial<CardFrameUserState>;
    const unlockedIds = Array.isArray(parsed.unlockedIds)
      ? parsed.unlockedIds.filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
      : [];
    const sources: Record<string, CardFrameUnlockSource> = {};
    const rawSources = asRecord(parsed.sources);
    if (rawSources) {
      for (const [key, value] of Object.entries(rawSources)) {
        if (
          value === "default" ||
          value === "code" ||
          value === "event" ||
          value === "admin"
        ) {
          sources[key] = value;
        }
      }
    }
    return {
      unlockedIds,
      activeFrameId:
        typeof parsed.activeFrameId === "string" && parsed.activeFrameId.trim()
          ? parsed.activeFrameId.trim()
          : null,
      sources,
    };
  } catch {
    return emptyState();
  }
}

export function writeCardFrameUserState(studentId: string, state: CardFrameUserState) {
  if (typeof window === "undefined" || !studentId.trim()) {
    return;
  }
  try {
    localStorage.setItem(storageKey(studentId), JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

/** 기본 해금 프레임을 반영한 상태 + 활성 프레임 보정 */
export function hydrateCardFrameUserState(
  studentId: string,
  catalog: PublicCardFrameItem[] | CardFrameItem[],
): CardFrameUserState {
  const state = readCardFrameUserState(studentId);
  const unlocked = new Set(state.unlockedIds);
  const sources = { ...state.sources };

  for (const item of catalog) {
    if (item.isDefaultUnlocked && !unlocked.has(item.id)) {
      unlocked.add(item.id);
      sources[item.id] = sources[item.id] ?? "default";
    }
  }

  let activeFrameId = state.activeFrameId;
  if (activeFrameId && !unlocked.has(activeFrameId)) {
    activeFrameId = null;
  }
  if (!activeFrameId) {
    const firstDefault = catalog.find((item) => item.isDefaultUnlocked && unlocked.has(item.id));
    activeFrameId = firstDefault?.id ?? null;
  }

  const next: CardFrameUserState = {
    unlockedIds: Array.from(unlocked),
    activeFrameId,
    sources,
  };
  writeCardFrameUserState(studentId, next);
  return next;
}

/**
 * 해금 기록 (코드 / 이벤트 보상 / 관리자 지급 공통).
 * 추후 이벤트 보상 연동 시 source: "event" + meta 와 함께 호출.
 */
export function grantCardFrameUnlock(
  studentId: string,
  frameId: string,
  source: Exclude<CardFrameUnlockSource, "default">,
  options?: { activate?: boolean },
): CardFrameUserState {
  const state = readCardFrameUserState(studentId);
  const unlockedIds = state.unlockedIds.includes(frameId)
    ? state.unlockedIds
    : [...state.unlockedIds, frameId];
  const next: CardFrameUserState = {
    unlockedIds,
    activeFrameId: options?.activate === false ? state.activeFrameId : frameId,
    sources: { ...state.sources, [frameId]: source },
  };
  writeCardFrameUserState(studentId, next);
  void persistCardFrameUserStateRemote(studentId, next);
  return next;
}

export function setActiveCardFrame(
  studentId: string,
  frameId: string | null,
): CardFrameUserState {
  const state = readCardFrameUserState(studentId);
  if (frameId && !state.unlockedIds.includes(frameId)) {
    return state;
  }
  const next: CardFrameUserState = { ...state, activeFrameId: frameId };
  writeCardFrameUserState(studentId, next);
  void persistCardFrameUserStateRemote(studentId, next);
  return next;
}

/** 서버에서 상태 불러와 로컬 캐시와 병합 (계정·기기 간 동기화) */
export async function syncCardFrameUserStateFromRemote(
  studentId: string,
  catalog: PublicCardFrameItem[] | CardFrameItem[],
): Promise<CardFrameUserState> {
  if (!studentId.trim() || typeof window === "undefined") {
    return emptyState();
  }

  // 로컬은 읽기만 (원격 우선). hydrate의 즉시 write로 원격이 덮이지 않게 함.
  const local = readCardFrameUserState(studentId);

  try {
    const response = await fetch(
      `/api/student/frames/state?studentId=${encodeURIComponent(studentId.trim())}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      return hydrateCardFrameUserState(studentId, catalog);
    }
    const payload = (await response.json()) as {
      state?: Partial<CardFrameUserState>;
      exists?: boolean;
    };

    const remoteUnlocked = Array.isArray(payload.state?.unlockedIds)
      ? payload.state.unlockedIds.filter(
          (id): id is string => typeof id === "string" && Boolean(id.trim()),
        )
      : [];
    const unlocked = new Set([
      ...(payload.exists ? remoteUnlocked : local.unlockedIds),
      ...remoteUnlocked,
      ...local.unlockedIds,
    ]);
    const sources = {
      ...local.sources,
      ...(payload.state?.sources ?? {}),
    };

    for (const item of catalog) {
      if (item.isDefaultUnlocked) {
        unlocked.add(item.id);
        sources[item.id] = sources[item.id] ?? "default";
      }
    }

    // 원격에 레코드가 있으면 장착 프레임은 원격 우선 (다른 기기에서 맞춘 값)
    let activeFrameId: string | null = null;
    if (payload.exists) {
      activeFrameId =
        typeof payload.state?.activeFrameId === "string" && payload.state.activeFrameId.trim()
          ? payload.state.activeFrameId.trim()
          : null;
    } else {
      activeFrameId = local.activeFrameId;
    }

    if (activeFrameId && !unlocked.has(activeFrameId)) {
      activeFrameId = null;
    }
    if (!activeFrameId) {
      const firstDefault = catalog.find(
        (item) => item.isDefaultUnlocked && unlocked.has(item.id),
      );
      activeFrameId = firstDefault?.id ?? null;
    }

    const next: CardFrameUserState = {
      unlockedIds: Array.from(unlocked),
      activeFrameId,
      sources,
    };
    writeCardFrameUserState(studentId, next);
    await persistCardFrameUserStateRemote(studentId, next);
    return next;
  } catch {
    return hydrateCardFrameUserState(studentId, catalog);
  }
}

export async function persistCardFrameUserStateRemote(
  studentId: string,
  state: CardFrameUserState,
): Promise<boolean> {
  if (!studentId.trim() || typeof window === "undefined") {
    return false;
  }
  try {
    const response = await fetch("/api/student/frames/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: studentId.trim(),
        unlockedIds: state.unlockedIds,
        activeFrameId: state.activeFrameId,
        equipped_frame_id: state.activeFrameId,
        sources: state.sources,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function loadCardFrameCatalogFromDb(): Promise<CardFrameItem[]> {
  const { createSupabaseServer } = await import("@/lib/supabase-server");
  const supabase = createSupabaseServer();
  if (!supabase) {
    return resolveCardFrameCatalog(null);
  }

  const { data } = await supabase
    .from("site_settings")
    .select("site_student_card_frames")
    .limit(1)
    .maybeSingle();

  return resolveCardFrameCatalog(data?.site_student_card_frames ?? null);
}
