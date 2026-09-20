import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/admin-auth-guard";
import { parseStudentIds } from "@/lib/student-rewards";
import {
  isSuspensionActive,
  revokeStudentSessions,
  type StudentSuspension,
} from "@/lib/student-suspension";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

function mapRow(row: Record<string, unknown>): StudentSuspension {
  return {
    studentId: String(row.student_id ?? ""),
    reason: String(row.reason ?? ""),
    until: (row.until as string | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: String(row.created_at ?? ""),
  };
}

function missingTableMessage(message: string) {
  return message.includes("site_student_suspensions")
    ? "학번 정지 테이블이 없습니다. Supabase에서 supabase/site-student-suspensions.sql 을 실행해 주세요."
    : message;
}

export async function GET(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) return auth.error;

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const { data, error } = await admin
    .from("site_student_suspensions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(400);

  if (error) {
    return NextResponse.json({ error: missingTableMessage(error.message) }, { status: 500 });
  }

  const rows = ((data ?? []) as Record<string, unknown>[]).map(mapRow);
  return NextResponse.json({
    suspensions: rows.filter((row) => isSuspensionActive(row.until)),
    expired: rows.filter((row) => !isSuspensionActive(row.until)),
  });
}

export async function POST(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) return auth.error;

  let body: { studentIds?: string | string[]; reason?: string; until?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const studentIds = Array.isArray(body.studentIds)
    ? Array.from(new Set(body.studentIds.map((id) => String(id).trim()).filter(Boolean)))
    : parseStudentIds(typeof body.studentIds === "string" ? body.studentIds : "");

  if (studentIds.length === 0) {
    return NextResponse.json({ error: "정지할 학번을 입력해 주세요." }, { status: 400 });
  }

  const reason = body.reason?.trim() || "";
  const untilRaw = typeof body.until === "string" ? body.until.trim() : "";
  const until = untilRaw ? new Date(untilRaw).toISOString() : null;
  if (untilRaw && Number.isNaN(new Date(untilRaw).getTime())) {
    return NextResponse.json({ error: "정지 종료 시각이 올바르지 않습니다." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const now = new Date().toISOString();
  const rows = studentIds.map((student_id) => ({
    student_id,
    reason,
    until,
    created_by: auth.email,
    created_at: now,
    updated_at: now,
  }));

  const { error } = await admin.from("site_student_suspensions").upsert(rows, { onConflict: "student_id" });
  if (error) {
    return NextResponse.json({ error: missingTableMessage(error.message) }, { status: 500 });
  }

  await revokeStudentSessions(studentIds);
  return NextResponse.json({ ok: true, count: studentIds.length });
}

export async function DELETE(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) return auth.error;

  const studentId = request.nextUrl.searchParams.get("studentId")?.trim() || "";
  if (!studentId) {
    return NextResponse.json({ error: "학번이 필요합니다." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const { error } = await admin.from("site_student_suspensions").delete().eq("student_id", studentId);
  if (error) {
    return NextResponse.json({ error: missingTableMessage(error.message) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
