import { NextRequest, NextResponse } from "next/server";
import { claimSeasonReward } from "@/lib/season-pass-server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      studentId?: string;
      level?: number;
      track?: "free" | "premium";
    };
    const userId = body.userId?.trim() || body.studentId?.trim() || "";
    const { state, frameId } = await claimSeasonReward({
      userId,
      level: Number(body.level) || 0,
      track: body.track === "premium" ? "premium" : "free",
    });
    return NextResponse.json({ ok: true, state, frameId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "보상을 수령하지 못했습니다.";
    const status = message.includes("로그인") ? 401 : message.includes("이미") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
