import { createHash } from "crypto";
import { requireStudentSession } from "@/lib/student-session-server";

function studentOwnedContentPassword(studentId: string) {
  const pepper =
    process.env.STUDENT_BOARD_PASSWORD_PEPPER?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "jeju-halla-student-content";
  return createHash("sha256").update(`${studentId}::${pepper}`).digest("hex").slice(0, 24);
}

/** 직접 입력한 비밀번호가 있으면 쓰고, 없으면 학번 로그인 세션으로 대체합니다. */
export async function resolveContentPassword(request: Request, provided: string | undefined) {
  const typed = String(provided ?? "").trim();
  if (typed.length >= 4) {
    return typed;
  }
  const auth = await requireStudentSession(request);
  if (!auth.ok) {
    return null;
  }
  return studentOwnedContentPassword(auth.studentId);
}
