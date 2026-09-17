import { NextResponse } from "next/server";
import { SESSION_TOKEN_HEADER, STUDENT_ID_HEADER } from "@/lib/student-session";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type StudentSessionOk = { ok: true; studentId: string };
export type StudentSessionFail = { ok: false; response: NextResponse };
export type StudentSessionResult = StudentSessionOk | StudentSessionFail;

function fail(status: number, error: string): StudentSessionFail {
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

export async function requireStudentSession(
  request: Request,
  claimedIds: Array<string | null | undefined> = [],
): Promise<StudentSessionResult> {
  const url = new URL(request.url);
  const studentId =
    request.headers.get(STUDENT_ID_HEADER)?.trim() ||
    url.searchParams.get("sessionStudentId")?.trim() ||
    "";
  const sessionToken =
    request.headers.get(SESSION_TOKEN_HEADER)?.trim() ||
    url.searchParams.get("sessionToken")?.trim() ||
    "";

  if (!studentId || !sessionToken) {
    return fail(401, "로그인이 필요합니다.");
  }

  for (const claimed of claimedIds) {
    const value = claimed?.trim();
    if (value && value !== studentId) {
      return fail(403, "다른 계정으로는 요청할 수 없습니다.");
    }
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return fail(503, "Supabase 서버 설정이 없습니다.");
  }

  const { data, error } = await admin
    .from("site_user_sessions")
    .select("session_token")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error || !data || data.session_token !== sessionToken) {
    return fail(401, "세션이 만료되었습니다. 다시 로그인해 주세요.");
  }

  return { ok: true, studentId };
}
