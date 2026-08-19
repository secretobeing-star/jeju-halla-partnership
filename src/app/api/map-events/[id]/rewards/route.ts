import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { isRewardType } from "@/lib/map-events";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { adminAuthMiddleware } = await import("@/lib/admin-auth-guard");
  const auth = await adminAuthMiddleware(request, "partners");
  if ("error" in auth) {
    return auth.error;
  }

  const { id: eventId } = await context.params;
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isRewardType(body.reward_type)) {
    return NextResponse.json({ error: "보상 유형이 올바르지 않습니다." }, { status: 400 });
  }

  const category = "CARD_SKIN";
  const frameValue =
    String(body.frame_css_value ?? body.item_value ?? "").trim() || null;

  const payload = {
    event_id: eventId,
    reward_type: body.reward_type,
    category,
    reward_name: String(body.reward_name ?? "").trim() || "학생증 코스튬",
    reward_img: String(body.reward_img ?? "").trim() || null,
    item_value: frameValue,
    frame_css_value: frameValue,
    stock: Math.max(0, Math.floor(Number(body.stock) || 999)),
    sort_order: Number(body.sort_order) || 0,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin.from("event_rewards").insert(payload).select("*").maybeSingle();
  if (error || !data) {
    return NextResponse.json(
      {
        error:
          error?.message?.includes("event_rewards_type_check")
            ? "확정형 보상을 쓰려면 supabase/map-events-guaranteed.sql 을 실행해 주세요."
            : error?.message || "보상 등록에 실패했습니다.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, reward: data });
}
