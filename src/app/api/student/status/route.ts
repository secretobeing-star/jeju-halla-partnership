import { NextResponse } from "next/server";
import {
  loadStudentSheetsConfigFromDb,
  lookupStudentApprovalStatus,
} from "@/lib/google-sheets-student";

export async function GET(request: Request) {
  const studentId = new URL(request.url).searchParams.get("studentId")?.trim() ?? "";
  if (!studentId) {
    return NextResponse.json({ error: "학번이 필요합니다." }, { status: 400 });
  }

  const config = await loadStudentSheetsConfigFromDb();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "구글 시트 스프레드시트 ID가 설정되지 않았습니다. 관리자 > 학생증 · 인증 또는 GOOGLE_SHEETS_STUDENT_SPREADSHEET_ID를 확인하세요.",
      },
      { status: 503 },
    );
  }

  try {
    const record = await lookupStudentApprovalStatus(config, studentId);
    return NextResponse.json({ status: record.approvalStatus, student: record });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "구글 시트에서 승인 상태를 조회하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
