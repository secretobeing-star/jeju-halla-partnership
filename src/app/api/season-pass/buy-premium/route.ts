import { NextRequest, NextResponse } from "next/server";
import { purchasePremiumPass } from "@/lib/season-pass-server";
import { requireStudentSession } from "@/lib/student-session-server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { userId?: string; studentId?: string };
    const auth = await requireStudentSession(request, [body.userId, body.studentId]);
    if (!auth.ok) {
      return auth.response;
    }
    const state = await purchasePremiumPass(auth.studentId);
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "구매에 실패했습니다.";
    const status = message.includes("로그인") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
