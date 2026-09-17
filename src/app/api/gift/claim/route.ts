import { NextRequest, NextResponse } from "next/server";
import { parseGiftPayload } from "@/lib/map-events";
import { grantStudentCardFrameOnServer } from "@/lib/student-card-settings-server";
import { requireStudentSession } from "@/lib/student-session-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  let body: { userId?: string; studentId?: string; giftId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const auth = await requireStudentSession(request, [body.userId, body.studentId]);
  if (!auth.ok) {
    return auth.response;
  }
  const userId = auth.studentId;
  const giftId = body.giftId?.trim() || "";
  if (!giftId) {
    return NextResponse.json({ error: "giftId가 필요합니다." }, { status: 400 });
  }

  const { data: gift, error } = await admin
    .from("user_gifts")
    .select("*")
    .eq("id", giftId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !gift) {
    return NextResponse.json({ error: "선물을 찾을 수 없습니다." }, { status: 404 });
  }

  if (gift.is_claimed) {
    const parsed = parseGiftPayload({
      frame_css_value: String(gift.frame_css_value ?? ""),
    });
    return NextResponse.json({
      ok: true,
      alreadyClaimed: true,
      gift,
      frameId: parsed.frameId,
      couponCode: parsed.couponCode,
    });
  }

  const claimedAt = new Date().toISOString();
  const { error: updateError } = await admin
    .from("user_gifts")
    .update({ is_claimed: true, claimed_at: claimedAt })
    .eq("id", giftId)
    .eq("user_id", userId)
    .eq("is_claimed", false);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const parsed = parseGiftPayload({
    frame_css_value: String(gift.frame_css_value ?? ""),
  });
  if (parsed.kind === "costume" && parsed.frameId) {
    await admin.from("user_frames").insert({
      user_id: userId,
      frame_id: parsed.frameId,
      acquired_at: claimedAt,
    });
    try {
      await grantStudentCardFrameOnServer(userId, parsed.frameId, "event", { activate: true });
    } catch (grantError) {
      console.error("코스튬 보관함 연동 실패:", grantError);
    }
  }

  if (parsed.kind === "coupon" && parsed.couponCode) {
    const { error: couponError } = await admin.from("user_inventory").insert({
      user_id: userId,
      category: "COUPON",
      reward_name: String(gift.reward_name ?? "쿠폰"),
      reward_img: (gift.reward_img as string | null) ?? null,
      item_value: parsed.couponCode,
      source: "GIFT_INBOX",
    });
    if (couponError) {
      console.error("쿠폰 인벤토리 저장 실패:", couponError);
    }
  }

  return NextResponse.json({
    ok: true,
    alreadyClaimed: false,
    frameId: parsed.frameId,
    couponCode: parsed.couponCode,
    claimedAt,
  });
}
