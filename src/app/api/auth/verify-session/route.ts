import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type VerifyBody = {
  studentId?: string;
  sessionToken?: string;
};

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const studentId = body.studentId?.trim() || "";
  const sessionToken = body.sessionToken?.trim() || "";

  if (!studentId || !sessionToken) {
    return NextResponse.json({ valid: false, error: "세션 정보가 부족합니다." }, { status: 400 });
  }

  // DB에 저장된 해당 학번의 최신 세션 토큰 조회
  const { data, error } = await admin
    .from("site_user_sessions")
    .select("session_token")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error || !data || data.session_token !== sessionToken) {
    // 토큰이 일치하지 않음 = 다른 기기에서 새로 로그인함!
    return NextResponse.json({
      valid: false,
      message: "다른 기기에서 로그인하여 현재 기기에서 로그아웃되었습니다.",
    });
  }

  return NextResponse.json({ valid: true });
}