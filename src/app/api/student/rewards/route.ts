import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  findCardFrameById,
  loadCardFrameCatalogFromDb,
  toPublicCardFrame,
} from "@/lib/student-card-frames";
import type { StudentRewardPublic, StudentRewardRow } from "@/lib/student-rewards";

export async function GET(request: NextRequest) {
  const studentId = new URL(request.url).searchParams.get("studentId")?.trim() ?? "";
  if (!studentId) {
    return NextResponse.json({ error: "studentId가 필요합니다." }, { status: 400 });
  }

  const supabase = createSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ rewards: [], pendingCount: 0 });
  }

  const { data, error } = await supabase
    .from("site_student_rewards")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({
      rewards: [],
      pendingCount: 0,
      warning: error.message,
    });
  }

  let catalog: Awaited<ReturnType<typeof loadCardFrameCatalogFromDb>> = [];
  try {
    catalog = await loadCardFrameCatalogFromDb();
  } catch {
    catalog = [];
  }

  const rewards: StudentRewardPublic[] = ((data as StudentRewardRow[]) ?? []).map(
    (row) => {
      const frame = row.frame_id
        ? findCardFrameById(catalog, row.frame_id)
        : null;
      const publicFrame = frame ? toPublicCardFrame(frame) : null;
      return {
        id: row.id,
        rewardType: row.reward_type,
        frameId: row.frame_id,
        frameName: publicFrame?.name ?? null,
        frameImageUrl: publicFrame?.imageUrl ?? null,
        title: row.title?.trim() || publicFrame?.name || "보상",
        message: row.message?.trim() || "",
        status: row.status === "claimed" ? "claimed" : "pending",
        createdAt: row.created_at,
        claimedAt: row.claimed_at,
      };
    },
  );

  return NextResponse.json({
    rewards,
    pendingCount: rewards.filter((r) => r.status === "pending").length,
  });
}

export async function DELETE(request: NextRequest) {
  const studentId = new URL(request.url).searchParams.get("studentId")?.trim() ?? "";
  const rewardId = new URL(request.url).searchParams.get("rewardId")?.trim() ?? "";

  if (!studentId || !rewardId) {
    return NextResponse.json({ error: "studentId와 rewardId가 필요합니다." }, { status: 400 });
  }

  const supabase = createSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  // 해당 학생의 보상인지 확인 후 삭제
  const { data: rewardData, error: fetchError } = await supabase
    .from("site_student_rewards")
    .select("*")
    .eq("id", rewardId)
    .eq("student_id", studentId)
    .single();

  if (fetchError || !rewardData) {
    return NextResponse.json({ error: "보상을 찾을 수 없습니다." }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("site_student_rewards")
    .delete()
    .eq("id", rewardId)
    .eq("student_id", studentId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message || "삭제에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
