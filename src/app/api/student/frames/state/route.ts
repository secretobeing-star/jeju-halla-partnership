import { NextRequest, NextResponse } from "next/server";
import {
  loadStudentCardFrameState,
  saveStudentCardFrameState,
} from "@/lib/student-card-settings-server";
import {
  type CardFrameUnlockSource,
  type CardFrameUserState,
} from "@/lib/student-card-frames";

function parseStateBody(body: unknown): CardFrameUserState | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const record = body as Record<string, unknown>;
  const unlockedIds = Array.isArray(record.unlockedIds)
    ? record.unlockedIds.filter(
        (id): id is string => typeof id === "string" && Boolean(id.trim()),
      )
    : [];
  const sources: Record<string, CardFrameUnlockSource> = {};
  const rawSources =
    record.sources && typeof record.sources === "object" && !Array.isArray(record.sources)
      ? (record.sources as Record<string, unknown>)
      : {};
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
  const activeFrameId =
    typeof record.activeFrameId === "string" && record.activeFrameId.trim()
      ? record.activeFrameId.trim()
      : typeof record.equipped_frame_id === "string" && record.equipped_frame_id.trim()
        ? record.equipped_frame_id.trim()
        : null;

  return { unlockedIds, activeFrameId, sources };
}

export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId")?.trim() || "";
  if (!studentId) {
    return NextResponse.json({ error: "studentId가 필요합니다." }, { status: 400 });
  }

  try {
    const loaded = await loadStudentCardFrameState(studentId);
    if (!loaded) {
      return NextResponse.json({ error: "서버 설정을 확인해 주세요." }, { status: 503 });
    }
    return NextResponse.json({
      state: loaded.state,
      exists: loaded.exists,
      updatedAt: loaded.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "조회에 실패했습니다.";
    return NextResponse.json(
      {
        error: message.includes("site_student_card_settings")
          ? "카드 설정 테이블이 없습니다. Supabase에서 site-student-card-settings.sql을 실행해 주세요."
          : message,
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const studentId =
    typeof body.studentId === "string" ? body.studentId.trim() : "";
  if (!studentId) {
    return NextResponse.json({ error: "studentId가 필요합니다." }, { status: 400 });
  }

  const parsed = parseStateBody(body);
  if (!parsed) {
    return NextResponse.json({ error: "상태 데이터가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    // 서버에 이미 있는 해금 목록과 병합 (다른 기기 해금분 보존)
    const loaded = await loadStudentCardFrameState(studentId);
    const remote = loaded?.state;
    const unlocked = new Set([
      ...(remote?.unlockedIds ?? []),
      ...parsed.unlockedIds,
    ]);
    const sources = { ...(remote?.sources ?? {}), ...parsed.sources };
    const next: CardFrameUserState = {
      unlockedIds: Array.from(unlocked),
      activeFrameId: parsed.activeFrameId,
      sources,
    };
    const saved = await saveStudentCardFrameState(studentId, next);
    return NextResponse.json({ ok: true, state: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "저장에 실패했습니다.";
    return NextResponse.json(
      {
        error: message.includes("site_student_card_settings")
          ? "카드 설정 테이블이 없습니다. Supabase에서 site-student-card-settings.sql을 실행해 주세요."
          : message,
      },
      { status: 500 },
    );
  }
}
