import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/admin-auth-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";

export type WithdrawalBlockRow = {
  student_id: string;
  student_name: string | null;
  withdrawn_at: string;
  rejoin_allowed_at: string;
};

export async function GET(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) {
    return auth.error;
  }

  const db = createSupabaseAdmin() ?? createSupabaseServer();
  if (!db) {
    return NextResponse.json(
      { error: "Supabase 서버 설정이 없습니다." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter")?.trim() || "all";
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "100", 10);
  const limit = Math.min(300, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 100));

  let query = db
    .from("site_member_withdrawal_blocks")
    .select("student_id, student_name, withdrawn_at, rejoin_allowed_at")
    .order("withdrawn_at", { ascending: false })
    .limit(limit);

  const nowIso = new Date().toISOString();
  if (filter === "blocked") {
    query = query.gt("rejoin_allowed_at", nowIso);
  } else if (filter === "expired") {
    query = query.lte("rejoin_allowed_at", nowIso);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("site_member_withdrawal_blocks")
          ? "탈퇴 이력 테이블이 없습니다. Supabase에서 site-student-card-settings.sql을 실행해 주세요."
          : error.message,
      },
      { status: 500 },
    );
  }

  const blocks = ((data ?? []) as WithdrawalBlockRow[]).map((row) => ({
    studentId: row.student_id,
    studentName: row.student_name,
    withdrawnAt: row.withdrawn_at,
    rejoinAllowedAt: row.rejoin_allowed_at,
    isBlocked: new Date(row.rejoin_allowed_at).getTime() > Date.now(),
  }));

  return NextResponse.json({ blocks });
}

/** 재가입 차단 해제 (행 삭제) */
export async function DELETE(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) {
    return auth.error;
  }

  const db = createSupabaseAdmin() ?? createSupabaseServer();
  if (!db) {
    return NextResponse.json(
      { error: "Supabase 서버 설정이 없습니다." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  let studentId = searchParams.get("studentId")?.trim() || "";

  if (!studentId) {
    try {
      const body = (await request.json()) as { studentId?: string };
      studentId = body.studentId?.trim() || "";
    } catch {
      // query only
    }
  }

  if (!studentId) {
    return NextResponse.json({ error: "학번이 필요합니다." }, { status: 400 });
  }

  const { error } = await db
    .from("site_member_withdrawal_blocks")
    .delete()
    .eq("student_id", studentId);

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("site_member_withdrawal_blocks")
          ? "탈퇴 이력 테이블이 없습니다. Supabase에서 site-student-card-settings.sql을 실행해 주세요."
          : error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    studentId,
    message: "재가입 차단을 해제했습니다. 해당 학번으로 다시 신청할 수 있습니다.",
  });
}
