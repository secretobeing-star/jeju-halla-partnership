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
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const studentId = body.studentId?.trim() || "";
  const name = body.name?.trim() || "";
  const department = body.department?.trim() || "";

  if (!studentId || !name) {
    return NextResponse.json(
      { error: "학번과 이름을 모두 입력해 주세요." },
      { status: 400 }
    );
  }

  // 1. 새로운 고유 세션 토큰 생성 (기존 기기 차단용)
  const sessionToken = randomUUID();

  try {
    // 2. site_user_sessions 테이블에 학번 기준 upsert (기존 세션 덮어쓰기)
    const { error: sessionError } = await admin
      .from("site_user_sessions")
      .upsert(
        {
          student_id: studentId,
          session_token: sessionToken,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id" }
      );

    if (sessionError) {
      throw new Error(`세션 저장 실패: ${sessionError.message}`);
    }

    // 3. 로그인 성공 응답 (클라이언트는 이 sessionToken을 로컬스토리지 등에 저장하여 활용)
    return NextResponse.json({
      ok: true,
      message: "로그인 성공",
      session: {
        studentId,
        name,
        department,
        sessionToken,
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "로그인 처리에 실패했습니다.";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}