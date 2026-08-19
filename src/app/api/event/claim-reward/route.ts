import { NextRequest, NextResponse } from "next/server";
import { grantStudentCardFrameOnServer } from "@/lib/student-card-settings-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import type { MapEventReward } from "@/lib/map-events";

type ClaimBody = {
  eventId?: string;
  rewardId?: string;
  userId?: string;
  studentId?: string;
};

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  let body: ClaimBody;
  try {
    body = (await request.json()) as ClaimBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const eventId = body.eventId?.trim() || "";
  const rewardId = body.rewardId?.trim() || "";
  const userId = body.userId?.trim() || body.studentId?.trim() || "";
  const studentId = body.studentId?.trim() || userId;

  if (!eventId || !rewardId || !userId) {
    return NextResponse.json({ error: "eventId, rewardId, userId가 필요합니다." }, { status: 400 });
  }

  const { data: progress } = await admin
    .from("user_event_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (!progress?.is_completed) {
    return NextResponse.json({ error: "완주하지 않은 이벤트입니다." }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("user_inventory")
    .select("id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .eq("source", "COMPLETION")
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "이미 완주 보상을 수령했습니다." }, { status: 409 });
  }

  const { data: rewardRow, error: rewardError } = await admin
    .from("event_rewards")
    .select("*")
    .eq("id", rewardId)
    .eq("event_id", eventId)
    .eq("reward_type", "COMPLETION")
    .maybeSingle();

  if (rewardError || !rewardRow) {
    return NextResponse.json({ error: "완주 보상을 찾을 수 없습니다." }, { status: 404 });
  }

  const reward = rewardRow as MapEventReward;
  if (Number(reward.stock) <= 0) {
    return NextResponse.json({ error: "재고가 없는 보상입니다." }, { status: 409 });
  }

  await admin
    .from("event_rewards")
    .update({
      stock: Math.max(0, Number(reward.stock) - 1),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reward.id);

  const { data: inventory, error: inventoryError } = await admin
    .from("user_inventory")
    .insert({
      user_id: userId,
      event_id: eventId,
      reward_id: reward.id,
      category: reward.category,
      reward_name: reward.reward_name,
      reward_img: reward.reward_img,
      item_value: reward.item_value,
      source: "COMPLETION",
    })
    .select("*")
    .maybeSingle();

  if (inventoryError) {
    return NextResponse.json({ error: inventoryError.message }, { status: 500 });
  }

  let frameApplied = false;
  if (reward.category === "CARD_SKIN" && reward.item_value && studentId) {
    try {
      await grantStudentCardFrameOnServer(studentId, reward.item_value, "event", {
        activate: true,
      });
      frameApplied = true;
    } catch (error) {
      console.error("완주 카드 스킨 적용 실패:", error);
    }
  }

  return NextResponse.json({
    ok: true,
    inventory,
    reward,
    frameApplied,
  });
}
