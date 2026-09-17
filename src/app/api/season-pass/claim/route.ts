import { NextRequest, NextResponse } from "next/server";
import { claimSeasonReward } from "@/lib/season-pass-server";
import { requireStudentSession } from "@/lib/student-session-server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      studentId?: string;
      level?: number;
      track?: "free" | "premium";
    };
    const auth = await requireStudentSession(request, [body.userId, body.studentId]);
    if (!auth.ok) {
      return auth.response;
    }
    const { state, frameId, gifted } = await claimSeasonReward({
      userId: auth.studentId,
      level: Number(body.level) || 0,
      track: body.track === "premium" ? "premium" : "free",
    });
    return NextResponse.json({ ok: true, state, frameId, gifted: Boolean(gifted) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "보상을 수령하지 못했습니다.";
    const status = message.includes("로그인") ? 401 : message.includes("이미") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
