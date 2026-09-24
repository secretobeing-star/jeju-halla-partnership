import { NextResponse } from "next/server";
import {
  loadStudentSheetsConfigFromDb,
  updateStudentApprovalPhoto,
} from "@/lib/google-sheets-student";
import {
  loadStudentCardPhotoUrl,
  saveStudentCardPhotoUrl,
} from "@/lib/student-card-settings-server";
import { requireStudentSession } from "@/lib/student-session-server";

type PhotoBody = {
  studentId?: string;
  photoUrl?: string;
};

export async function GET(request: Request) {
  const auth = await requireStudentSession(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const photoUrl = await loadStudentCardPhotoUrl(auth.studentId);
    return NextResponse.json({ ok: true, photoUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "학생증 사진을 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: PhotoBody;
  try {
    body = (await request.json()) as PhotoBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const auth = await requireStudentSession(request, [body.studentId]);
  if (!auth.ok) {
    return auth.response;
  }
  const studentId = auth.studentId;
  const photoUrl = body.photoUrl?.trim() ?? "";

  if (!studentId || !photoUrl) {
    return NextResponse.json(
      { error: "학번과 사진 URL이 필요합니다." },
      { status: 400 },
    );
  }

  try {
    await saveStudentCardPhotoUrl(studentId, photoUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "학생증 사진을 저장하지 못했습니다.";
    const status = message.includes("sql") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const config = await loadStudentSheetsConfigFromDb();
  if (config) {
    try {
      await updateStudentApprovalPhoto(config, studentId, photoUrl);
    } catch {
      // 시트는 보조 저장. 서버 저장이 됐으면 기기 연동은 유지.
    }
  }

  return NextResponse.json({ ok: true, photoUrl });
}
