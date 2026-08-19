import { NextRequest, NextResponse } from "next/server";
import { grantStudentCardFrameOnServer } from "@/lib/student-card-settings-server";
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

  const userId = body.userId?.trim() || body.studentId?.trim() || "";
  const giftId = body.giftId?.trim() || "";
  if (!userId || !giftId) {
    return NextResponse.json({ error: "userId와 giftId가 필요합니다." }, { status: 400 });
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
    return NextResponse.json({ ok: true, alreadyClaimed: true, gift });
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

  const frameId = String(gift.frame_css_value ?? "").trim();
  if (frameId) {
    await admin.from("user_frames").insert({
      user_id: userId,
      frame_id: frameId,
      acquired_at: claimedAt,
    });
    try {
      await grantStudentCardFrameOnServer(userId, frameId, "event", { activate: true });
    } catch (grantError) {
      console.error("코스튬 보관함 연동 실패:", grantError);
    }
  }

  return NextResponse.json({
    ok: true,
    alreadyClaimed: false,
    frameId: frameId || null,
    claimedAt,
  });
}
