import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/admin-auth-guard";
import { loadStudentSheetsConfigFromDb, listStudentApplicationLogs } from "@/lib/google-sheets-student";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) return auth.error;

  const ids = new Set<string>();
  const admin = createSupabaseAdmin();
  if (admin) {
    const tables = ["site_user_sessions", "site_student_rewards", "site_login_reward_claims"] as const;
    for (const table of tables) {
      const { data } = await admin.from(table).select("student_id").limit(8000);
      for (const row of data ?? []) {
        const id = String((row as { student_id?: string }).student_id ?? "").trim();
        if (id) ids.add(id);
      }
    }
  }

  try {
    const config = await loadStudentSheetsConfigFromDb();
    if (config) {
      const logs = await listStudentApplicationLogs(config, { limit: 1000, status: "approved" });
      for (const log of logs) {
        const id = log.studentId?.trim();
        if (id) ids.add(id);
      }
    }
  } catch {
    // 시트 연동이 없어도 세션·보상 학번은 사용
  }

  return NextResponse.json({ studentIds: [...ids].sort() });
}
