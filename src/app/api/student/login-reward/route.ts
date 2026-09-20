import { NextRequest, NextResponse } from "next/server";
import { claimDailyLoginReward } from "@/lib/login-reward-server";
import { requireStudentSession } from "@/lib/student-session-server";

export async function POST(request: NextRequest) {
  let body: { studentId?: string; clientKey?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const auth = await requireStudentSession(request, [body.studentId]);
  if (!auth.ok) return auth.response;

  const extraKeys = [body.clientKey?.trim() || ""].filter(Boolean);
  const result = await claimDailyLoginReward(auth.studentId, extraKeys);
  return NextResponse.json(result);
}
