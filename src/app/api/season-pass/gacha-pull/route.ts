import { NextRequest, NextResponse } from "next/server";
import { pullGoldShopGacha } from "@/lib/season-pass-server";
import { requireStudentSession } from "@/lib/student-session-server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      studentId?: string;
      boxId?: string;
      giftId?: string;
    };
    const auth = await requireStudentSession(request, [body.userId, body.studentId]);
    if (!auth.ok) {
      return auth.response;
    }
    const result = await pullGoldShopGacha(auth.studentId, body.boxId?.trim() || "", {
      giftId: body.giftId?.trim() || "",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "뽑기에 실패했습니다.";
    const status = message.includes("로그인") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
