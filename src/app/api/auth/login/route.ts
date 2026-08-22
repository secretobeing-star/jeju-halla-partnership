import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

type LoginBody = {
  studentId?: string;
  name?: string;
  department?: string;
};

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase 설정 오류" }, { status: 503 });

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const studentId = body.studentId?.trim() || "";
  const name = body.name?.trim() || "";
  
  if (!studentId || !name) return NextResponse.json({ error: "정보 입력 필수" }, { status: 400 });

  const sessionToken = randomUUID();

  try {
    const { error: sessionError } = await admin
      .from("site_user_sessions")
      .upsert({ student_id: studentId, session_token: sessionToken, updated_at: new Date().toISOString() }, { onConflict: "student_id" });

    if (sessionError) throw sessionError;

    return NextResponse.json({ ok: true, session: { studentId, name, sessionToken } });
  } catch (err) {
    return NextResponse.json({ error: "로그인 실패" }, { status: 500 });
  }
}