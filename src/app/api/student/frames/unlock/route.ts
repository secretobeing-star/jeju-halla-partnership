import { NextResponse } from "next/server";
import {
  findCardFrameByCode,
  loadCardFrameCatalogFromDb,
  toPublicCardFrame,
} from "@/lib/student-card-frames";
import { grantStudentCardFrameOnServer } from "@/lib/student-card-settings-server";

type UnlockBody = {
  code?: string;
  studentId?: string;
};

/**
 * 시크릿 코드로 테두리 해금.
 * itemCode는 서버에서만 대조하며 응답에는 포함하지 않습니다.
 * 해금 결과는 site_student_card_settings에 저장되어 기기 간 동기화됩니다.
 */
export async function POST(request: Request) {
  let body: UnlockBody;
  try {
    body = (await request.json()) as UnlockBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const code = body.code?.trim() ?? "";
  const studentId = body.studentId?.trim() ?? "";

  if (!code) {
    return NextResponse.json({ error: "코드를 입력해 주세요." }, { status: 400 });
  }

  if (!studentId) {
    return NextResponse.json({ error: "학번 정보가 필요합니다." }, { status: 400 });
  }

  try {
    const catalog = await loadCardFrameCatalogFromDb();
    const matched = findCardFrameByCode(catalog, code);
    if (!matched) {
      return NextResponse.json(
        { error: "유효하지 않은 코드입니다." },
        { status: 404 },
      );
    }

    try {
      await grantStudentCardFrameOnServer(studentId, matched.id, "code", {
        activate: true,
      });
    } catch (grantError) {
      console.log("Card frame server grant failed:", grantError);
    }

    return NextResponse.json({
      ok: true,
      frame: toPublicCardFrame(matched),
      source: "code" as const,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "코스튬 해금에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
