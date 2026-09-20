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
    value === "admin" ||
    value === "season"
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

  const { data: frameRows } = await db
    .from("user_frames")
    .select("frame_id")
    .eq("user_id", studentId.trim());

  const extraIds = (frameRows ?? [])
    .map((row) => String(row.frame_id ?? "").trim())
    .filter(Boolean);

  if (!data && extraIds.length === 0) {
    return {
      state: { unlockedIds: [], activeFrameId: null, sources: {} },
      exists: false,
    };
  }

  const state = data
    ? rowToState(data)
    : { unlockedIds: [] as string[], activeFrameId: null as string | null, sources: {} };
  const unlocked = new Set(state.unlockedIds);
  for (const id of extraIds) {
    unlocked.add(id);
  }

  return {
    state: {
      ...state,
      unlockedIds: Array.from(unlocked),
    },
    exists: Boolean(data) || extraIds.length > 0,
    updatedAt: data?.updated_at,
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

export async function revokeStudentCardFrameOnServer(studentId: string, frameId: string) {
  const { findCardFrameByRef, loadCardFrameCatalogFromDb } = await import(
    "@/lib/student-card-frames"
  );
  const catalog = await loadCardFrameCatalogFromDb().catch(() => []);
  const matched = findCardFrameByRef(catalog, frameId);
  const aliases = Array.from(
    new Set(
      [frameId.trim(), matched?.id, matched?.itemCode].filter(
        (value): value is string => Boolean(value && value.trim()),
      ),
    ),
  );

  const current = await loadStudentCardFrameState(studentId);
  const prev = current?.state ?? {
    unlockedIds: [],
    activeFrameId: null,
    sources: {},
  };
  const remaining = prev.unlockedIds.filter((id) => {
    if (aliases.includes(id)) return false;
    const resolved = findCardFrameByRef(catalog, id);
    return !matched || resolved?.id !== matched.id;
  });
  const sources = { ...prev.sources };
  for (const id of [...aliases, ...prev.unlockedIds]) {
    if (!remaining.includes(id)) {
      delete sources[id];
    }
  }

  const activeMatches =
    Boolean(prev.activeFrameId) &&
    (aliases.includes(prev.activeFrameId ?? "") ||
      Boolean(matched && findCardFrameByRef(catalog, prev.activeFrameId ?? "")?.id === matched.id));

  await saveStudentCardFrameState(studentId, {
    unlockedIds: remaining,
    activeFrameId: activeMatches ? null : prev.activeFrameId,
    sources,
  });

  const db = getDb();
  if (db && aliases.length > 0) {
    await db.from("user_frames").delete().eq("user_id", studentId.trim()).in("frame_id", aliases);
    await db
      .from("user_inventory")
      .delete()
      .eq("user_id", studentId.trim())
      .in("item_value", aliases);

    const { data: gifts } = await db
      .from("user_gifts")
      .select("id, frame_css_value")
      .eq("user_id", studentId.trim());
    const { parseGiftPayload } = await import("@/lib/map-events");
    const giftIds = (gifts ?? [])
      .filter((gift) => {
        const parsed = parseGiftPayload({
          frame_css_value: String(gift.frame_css_value ?? ""),
        });
        return (
          parsed.kind === "costume" &&
          parsed.frameId &&
          (aliases.includes(parsed.frameId) ||
            Boolean(matched && findCardFrameByRef(catalog, parsed.frameId)?.id === matched.id))
        );
      })
      .map((gift) => String(gift.id));
    if (giftIds.length > 0) {
      await db.from("user_gifts").delete().eq("user_id", studentId.trim()).in("id", giftIds);
    }
  }
}
