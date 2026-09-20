import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type StudentSuspension = {
  studentId: string;
  reason: string;
  until: string | null;
  createdBy: string | null;
  createdAt: string;
};

export function studentSuspensionMessage(row: Pick<StudentSuspension, "reason" | "until">) {
  const untilLabel = row.until
    ? ` (${new Date(row.until).toLocaleString("ko-KR")}까지)`
    : "";
  const reason = row.reason.trim();
  return reason
    ? `이 학번은 정지되었습니다${untilLabel}. ${reason}`
    : `이 학번은 정지되었습니다${untilLabel}.`;
}

export function isSuspensionActive(until: string | null | undefined) {
  if (!until) return true;
  const end = new Date(until).getTime();
  return Number.isFinite(end) && end > Date.now();
}

export async function getActiveStudentSuspension(
  studentIdRaw: string,
): Promise<StudentSuspension | null> {
  const studentId = studentIdRaw.trim();
  if (!studentId) return null;
  const admin = createSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("site_student_suspensions")
    .select("student_id, reason, until, created_by, created_at")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error || !data) return null;
  const until = (data.until as string | null) ?? null;
  if (!isSuspensionActive(until)) return null;

  return {
    studentId: String(data.student_id ?? studentId),
    reason: String(data.reason ?? ""),
    until,
    createdBy: (data.created_by as string | null) ?? null,
    createdAt: String(data.created_at ?? ""),
  };
}

export async function revokeStudentSessions(studentIds: string[]) {
  const admin = createSupabaseAdmin();
  if (!admin || studentIds.length === 0) return;
  await admin.from("site_user_sessions").delete().in("student_id", studentIds);
}
