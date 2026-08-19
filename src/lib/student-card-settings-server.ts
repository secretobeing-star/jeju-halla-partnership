import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { CardFrameUnlockSource, CardFrameUserState } from "@/lib/student-card-frames";

function getDb() {
  return createSupabaseAdmin() ?? createSupabaseServer();
}

function asUnlockSource(value: unknown): CardFrameUnlockSource | null {
  if (
    value === "default" ||
    value === "code" ||
    value === "event" ||
    value === "admin"
  ) {
    return value;
  }
  return null;
}

function rowToState(row: {
  equipped_frame_id?: string | null;
  unlocked_ids?: unknown;
  sources?: unknown;
}): CardFrameUserState {
  const unlockedIds = Array.isArray(row.unlocked_ids)
    ? row.unlocked_ids.filter(
        (id): id is string => typeof id === "string" && Boolean(id.trim()),
      )
    : [];
  const sources: Record<string, CardFrameUnlockSource> = {};
  if (row.sources && typeof row.sources === "object" && !Array.isArray(row.sources)) {
    for (const [key, value] of Object.entries(row.sources as Record<string, unknown>)) {
      const source = asUnlockSource(value);
      if (source) {
        sources[key] = source;
      }
    }
  }
  return {
    unlockedIds,
    activeFrameId: row.equipped_frame_id?.trim() || null,
    sources,
  };
}

export async function loadStudentCardFrameState(
  studentId: string,
): Promise<{ state: CardFrameUserState; exists: boolean; updatedAt?: string } | null> {
  const db = getDb();
  if (!db || !studentId.trim()) {
    return null;
  }

  const { data, error } = await db
    .from("site_student_card_settings")
    .select("equipped_frame_id, unlocked_ids, sources, updated_at")
    .eq("student_id", studentId.trim())
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return {
      state: { unlockedIds: [], activeFrameId: null, sources: {} },
      exists: false,
    };
  }

  return {
    state: rowToState(data),
    exists: true,
    updatedAt: data.updated_at,
  };
}

export async function saveStudentCardFrameState(
  studentId: string,
  state: CardFrameUserState,
): Promise<CardFrameUserState> {
  const db = getDb();
  if (!db) {
    throw new Error("Supabase 서버 설정이 없습니다.");
  }

  const payload = {
    student_id: studentId.trim(),
    equipped_frame_id: state.activeFrameId,
    unlocked_ids: state.unlockedIds,
    sources: state.sources,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from("site_student_card_settings")
    .upsert(payload, { onConflict: "student_id" })
    .select("equipped_frame_id, unlocked_ids, sources")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? rowToState(data) : state;
}

/** 서버에서 해금·장착을 반영 (기기 간 동기화용) */
export async function grantStudentCardFrameOnServer(
  studentId: string,
  frameId: string,
  source: Exclude<CardFrameUnlockSource, "default">,
  options?: { activate?: boolean },
): Promise<CardFrameUserState> {
  const current = await loadStudentCardFrameState(studentId);
  const prev = current?.state ?? {
    unlockedIds: [],
    activeFrameId: null,
    sources: {},
  };

  const unlockedIds = prev.unlockedIds.includes(frameId)
    ? prev.unlockedIds
    : [...prev.unlockedIds, frameId];

  const next: CardFrameUserState = {
    unlockedIds,
    activeFrameId: options?.activate === false ? prev.activeFrameId : frameId,
    sources: { ...prev.sources, [frameId]: source },
  };

  return saveStudentCardFrameState(studentId, next);
}
