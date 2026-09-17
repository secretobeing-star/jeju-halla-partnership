import { NextRequest, NextResponse } from "next/server";
import { getSeasonPassState } from "@/lib/season-pass-server";
import { SESSION_TOKEN_HEADER, STUDENT_ID_HEADER } from "@/lib/student-session";
import { requireStudentSession } from "@/lib/student-session-server";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const requestedUserId = request.nextUrl.searchParams.get("userId")?.trim() || "";
  const hasSessionHeaders = Boolean(
    request.headers.get(STUDENT_ID_HEADER)?.trim() && request.headers.get(SESSION_TOKEN_HEADER)?.trim(),
  );

  let userId = "";
  if (hasSessionHeaders || requestedUserId) {
    const auth = await requireStudentSession(request, [requestedUserId]);
    if (!auth.ok) {
      return auth.response;
    }
    userId = auth.studentId;
  }

  try {
    const state = await getSeasonPassState(userId);
    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "시즌패스를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
