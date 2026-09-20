import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/admin-auth-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  loadStudentCardFrameState,
  revokeStudentCardFrameOnServer,
} from "@/lib/student-card-settings-server";
import {
  findCardFrameById,
  loadCardFrameCatalogFromDb,
} from "@/lib/student-card-frames";
import { debitStudentGold, getSeasonPassState } from "@/lib/season-pass-server";

export async function GET(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) return auth.error;

  const studentId = new URL(request.url).searchParams.get("studentId")?.trim() ?? "";
  if (!studentId) {
    return NextResponse.json({ error: "학번을 입력해 주세요." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const catalog = await loadCardFrameCatalogFromDb().catch(() => []);
  const frameState = await loadStudentCardFrameState(studentId).catch(() => null);
  const unlockedIds = frameState?.state.unlockedIds ?? [];
  const frames = unlockedIds.map((id) => {
    const frame = findCardFrameById(catalog, id);
    return {
      id,
      name: frame?.name ?? id,
      imageUrl: frame?.imageUrl ?? null,
      source: frameState?.state.sources[id] ?? null,
    };
  });

  const [giftsRes, rewardsRes, inventoryRes, progressRes, passState] = await Promise.all([
    admin.from("user_gifts").select("*").eq("user_id", studentId).order("created_at", { ascending: false }).limit(80),
    admin
      .from("site_student_rewards")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(80),
    admin.from("user_inventory").select("*").eq("user_id", studentId).order("created_at", { ascending: false }).limit(80),
    admin.from("user_event_progress").select("*").eq("user_id", studentId).order("updated_at", { ascending: false }).limit(40),
    getSeasonPassState(studentId).catch(() => null),
  ]);

  const eventIds = [...new Set((progressRes.data ?? []).map((row) => String(row.event_id ?? "")).filter(Boolean))];
  const eventsById = new Map<string, { title: string; tab_name: string }>();
  if (eventIds.length > 0) {
    const { data: eventRows } = await admin.from("events").select("id, title, tab_name").in("id", eventIds);
    for (const row of eventRows ?? []) {
      eventsById.set(String(row.id), {
        title: String(row.title ?? ""),
        tab_name: String(row.tab_name ?? ""),
      });
    }
  }

  const events = (progressRes.data ?? []).map((row) => {
    const event = eventsById.get(String(row.event_id));
    return {
      eventId: row.event_id,
      title: event?.title || "이벤트",
      tabName: event?.tab_name || "",
      currentStamps: Number(row.current_stamps) || 0,
      isCompleted: Boolean(row.is_completed),
      stampedPlaces: Array.isArray(row.stamped_places) ? row.stamped_places : [],
      updatedAt: row.updated_at,
    };
  });

  return NextResponse.json({
    studentId,
    frames: {
      activeFrameId: frameState?.state.activeFrameId ?? null,
      unlockedCount: frames.length,
      items: frames,
    },
    gifts: giftsRes.data ?? [],
    giftsError: giftsRes.error?.message ?? null,
    rewards: rewardsRes.data ?? [],
    rewardsError: rewardsRes.error?.message ?? null,
    inventory: inventoryRes.data ?? [],
    inventoryError: inventoryRes.error?.message ?? null,
    events,
    eventsError: progressRes.error?.message ?? null,
    seasonPass: passState
      ? {
          seasonTitle: passState.season?.title ?? null,
          passEnabled: passState.passEnabled,
          level: passState.currentLevel,
          exp: passState.currentExp,
          gold: passState.progress?.gold ?? 0,
          isPremium: passState.isPremium,
          claims: passState.claims,
          quests: passState.quests.map((quest) => ({
            title: quest.title,
            progress: quest.progress,
            target: quest.target_count,
            completed: quest.is_completed,
          })),
        }
      : null,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) return auth.error;

  let body: { studentId?: string; kind?: string; id?: string; amount?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const studentId = String(body.studentId ?? "").trim();
  const kind = String(body.kind ?? "").trim();
  const id = String(body.id ?? "").trim();
  if (!studentId) {
    return NextResponse.json({ error: "학번을 입력해 주세요." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  try {
    if (kind === "gold") {
      const amount = Math.floor(Number(body.amount) || 0);
      await debitStudentGold(studentId, amount);
      return NextResponse.json({ ok: true });
    }

    if (kind === "frame") {
      if (!id) return NextResponse.json({ error: "코스튬을 선택해 주세요." }, { status: 400 });
      await revokeStudentCardFrameOnServer(studentId, id);
      return NextResponse.json({ ok: true });
    }

    if (kind === "gift") {
      if (!id) return NextResponse.json({ error: "선물을 선택해 주세요." }, { status: 400 });
      const { error } = await admin.from("user_gifts").delete().eq("id", id).eq("user_id", studentId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (kind === "inventory") {
      if (!id) return NextResponse.json({ error: "아이템을 선택해 주세요." }, { status: 400 });
      const { error } = await admin.from("user_inventory").delete().eq("id", id).eq("user_id", studentId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (kind === "reward") {
      if (!id) return NextResponse.json({ error: "보상을 선택해 주세요." }, { status: 400 });
      const { error } = await admin.from("site_student_rewards").delete().eq("id", id).eq("student_id", studentId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (kind === "event") {
      if (!id) return NextResponse.json({ error: "이벤트를 선택해 주세요." }, { status: 400 });
      const { error } = await admin
        .from("user_event_progress")
        .delete()
        .eq("event_id", id)
        .eq("user_id", studentId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "회수에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ error: "회수할 항목을 확인해 주세요." }, { status: 400 });
}
