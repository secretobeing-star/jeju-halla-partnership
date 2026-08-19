import { NextResponse } from "next/server";
import {
  findCardFrameById,
  loadCardFrameCatalogFromDb,
  toPublicCardFrame,
  type CardFrameGrantPayload,
} from "@/lib/student-card-frames";

/**
 * 이벤트 보상 등에서 테두리를 지급할 때 사용.
 * - Authorization: Bearer <STUDENT_FRAME_GRANT_SECRET>
 * - 또는 관리자 세션을 붙인 내부 호출로 확장 가능
 */
export async function POST(request: Request) {
  const expected = process.env.STUDENT_FRAME_GRANT_SECRET?.trim();
  const auth = request.headers.get("authorization")?.trim() ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";

  if (!expected || !bearer || bearer !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: CardFrameGrantPayload;
  try {
    body = (await request.json()) as CardFrameGrantPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const studentId = body.studentId?.trim() ?? "";
  const frameId = body.frameId?.trim() ?? "";
  const source = body.source;

  if (!studentId || !frameId) {
    return NextResponse.json(
      { error: "studentId와 frameId가 필요합니다." },
      { status: 400 },
    );
  }

  if (source !== "event" && source !== "admin" && source !== "code") {
    return NextResponse.json({ error: "source가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const catalog = await loadCardFrameCatalogFromDb();
    const frame = findCardFrameById(catalog, frameId);
    if (!frame) {
      return NextResponse.json({ error: "코스튬을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      frame: toPublicCardFrame(frame),
      source,
      meta: body.meta ?? null,
      /**
       * 클라이언트는 grantCardFrameUnlock(studentId, frame.id, source)로
       * 로컬 해금 상태에 반영하면 됩니다. (추후 서버 저장소로 이전 가능)
       */
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "코스튬 지급에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
