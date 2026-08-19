import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { grantStudentCardFrameOnServer } from "@/lib/student-card-settings-server";
import {
  findCardFrameById,
  loadCardFrameCatalogFromDb,
  toPublicCardFrame,
} from "@/lib/student-card-frames";
import type { StudentRewardRow } from "@/lib/student-rewards";

export async function POST(request: NextRequest) {
  let body: { studentId?: string; rewardId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const studentId = body.studentId?.trim() ?? "";
  const rewardId = body.rewardId?.trim() ?? "";
  if (!studentId || !rewardId) {
    return NextResponse.json(
      { error: "studentId와 rewardId가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: "서버 설정을 확인해 주세요." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("site_student_rewards")
    .select("*")
    .eq("id", rewardId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "보상을 찾을 수 없습니다." }, { status: 404 });
  }

  const row = data as StudentRewardRow;
  const catalog = await loadCardFrameCatalogFromDb().catch(() => []);
  const frame = row.frame_id ? findCardFrameById(catalog, row.frame_id) : null;

  if (row.status === "claimed") {
    return NextResponse.json({
      ok: true,
      alreadyClaimed: true,
      frame: frame ? toPublicCardFrame(frame) : null,
    });
  }

  const claimedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("site_student_rewards")
    .update({ status: "claimed", claimed_at: claimedAt })
    .eq("id", rewardId)
    .eq("student_id", studentId)
    .eq("status", "pending");

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (frame?.id) {
    try {
      await grantStudentCardFrameOnServer(studentId, frame.id, "admin", {
        activate: true,
      });
    } catch (grantError) {
      console.log("Card frame server grant failed:", grantError);
    }
  }

  return NextResponse.json({
    ok: true,
    alreadyClaimed: false,
    frame: frame ? toPublicCardFrame(frame) : null,
    claimedAt,
  });
}
