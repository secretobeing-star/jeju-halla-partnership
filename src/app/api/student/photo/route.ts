import { NextResponse } from "next/server";
import {
  loadStudentSheetsConfigFromDb,
  updateStudentApprovalPhoto,
} from "@/lib/google-sheets-student";

type PhotoBody = {
  studentId?: string;
  photoUrl?: string;
};

export async function POST(request: Request) {
  let body: PhotoBody;
  try {
    body = (await request.json()) as PhotoBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const studentId = body.studentId?.trim() ?? "";
  const photoUrl = body.photoUrl?.trim() ?? "";

  if (!studentId || !photoUrl) {
    return NextResponse.json(
      { error: "학번과 사진 URL이 필요합니다." },
      { status: 400 },
    );
  }

  const config = await loadStudentSheetsConfigFromDb();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "구글 시트 스프레드시트 ID가 설정되지 않았습니다. 관리자에서 시트 연동을 확인해 주세요.",
      },
      { status: 503 },
    );
  }

  try {
    const updated = await updateStudentApprovalPhoto(config, studentId, photoUrl);
    if (!updated) {
      return NextResponse.json(
        { error: "승인 시트에서 해당 학번을 찾지 못했습니다." },
        { status: 404 },
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "사진 URL을 시트에 저장하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, photoUrl });
}
