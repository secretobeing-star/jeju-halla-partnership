import { NextRequest, NextResponse } from "next/server";
import { purchasePremiumPass } from "@/lib/season-pass-server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { userId?: string; studentId?: string };
    const userId = body.userId?.trim() || body.studentId?.trim() || "";
    const state = await purchasePremiumPass(userId);
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "구매에 실패했습니다.";
    const status = message.includes("로그인") ? 401 : message.includes("부족") ? 400 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
