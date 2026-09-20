import { NextRequest, NextResponse } from "next/server";
import { issueStudentApiSession } from "@/lib/student-session-server";
import { getActiveStudentSuspension, studentSuspensionMessage } from "@/lib/student-suspension";

type LoginBody = {
  studentId?: string;
  name?: string;
  department?: string;
};

export async function POST(request: NextRequest) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const studentId = body.studentId?.trim() || "";
  const name = body.name?.trim() || "";

  if (!studentId || !name) {
    return NextResponse.json({ error: "정보 입력 필수" }, { status: 400 });
  }

  const suspension = await getActiveStudentSuspension(studentId);
  if (suspension) {
    return NextResponse.json(
      { error: studentSuspensionMessage(suspension), code: "STUDENT_SUSPENDED" },
      { status: 403 },
    );
  }

  const sessionToken = await issueStudentApiSession(studentId);
  if (!sessionToken) {
    return NextResponse.json({ error: "로그인 실패" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, session: { studentId, name, sessionToken } });
}
