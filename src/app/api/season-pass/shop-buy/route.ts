import { NextRequest, NextResponse } from "next/server";
import { purchaseGoldShopItem } from "@/lib/season-pass-server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      studentId?: string;
      shopItemId?: string;
    };
    const userId = body.userId?.trim() || body.studentId?.trim() || "";
    const result = await purchaseGoldShopItem(userId, body.shopItemId?.trim() || "");
    return NextResponse.json({
      ok: true,
      state: result.state,
      gifted: result.gifted,
      name: result.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "구매에 실패했습니다.";
    const status = message.includes("로그인") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
