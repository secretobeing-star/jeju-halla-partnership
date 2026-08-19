import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  deleteStudentFromSheets,
  loadStudentSheetsConfigFromDb,
} from "@/lib/google-sheets-student";

const REJOIN_BLOCK_DAYS = 14;

async function deleteByStudentId(
  admin: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  studentId: string,
) {
  const tables = [
    "site_student_rewards",
    "site_student_auth_logs",
    "site_student_application_logs",
    "site_student_profiles",
    "site_student_card_settings",
    "site_student_card_frames",
  ] as const;

  for (const table of tables) {
    try {
      await admin.from(table).delete().eq("student_id", studentId);
    } catch {
      // table may not exist
    }
  }
}

export async function POST(request: NextRequest) {
  let body: { studentId?: string; studentName?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const studentId = body.studentId?.trim() || "";
  const studentName = body.studentName?.trim() || "";
  if (!studentId) {
    return NextResponse.json(
      { error: "학번이 필요합니다. 로그인 후 다시 시도해 주세요." },
      { status: 401 },
    );
  }

  const admin = createSupabaseAdmin();
  const supabase = createSupabaseServer();
  if (!admin && !supabase) {
    return NextResponse.json(
      { error: "Supabase 서버 설정이 없습니다." },
      { status: 503 },
    );
  }

  const db = admin ?? supabase!;

  try {
    const withdrawnAt = new Date();
    const rejoinAllowedAt = new Date(
      withdrawnAt.getTime() + REJOIN_BLOCK_DAYS * 24 * 60 * 60 * 1000,
    );

    const { error: blockError } = await db.from("site_member_withdrawal_blocks").upsert(
      {
        student_id: studentId,
        student_name: studentName || null,
        withdrawn_at: withdrawnAt.toISOString(),
        rejoin_allowed_at: rejoinAllowedAt.toISOString(),
      },
      { onConflict: "student_id" },
    );

    if (blockError) {
      return NextResponse.json(
        {
          error: blockError.message.includes("site_member_withdrawal_blocks")
            ? "탈퇴 제한 테이블이 없습니다. Supabase에서 site-student-card-settings.sql을 실행해 주세요."
            : blockError.message,
        },
        { status: 500 },
      );
    }

    if (admin) {
      await deleteByStudentId(admin, studentId);
    } else {
      await deleteByStudentId(db as NonNullable<ReturnType<typeof createSupabaseAdmin>>, studentId);
    }

    try {
      const sheetsConfig = await loadStudentSheetsConfigFromDb();
      if (sheetsConfig) {
        await deleteStudentFromSheets(sheetsConfig, studentId);
      }
    } catch (sheetError) {
      console.log("Sheets deletion skipped:", sheetError);
    }

    // Auth 사용자 삭제는 service role 필요
    if (admin) {
      try {
        const authHeader = request.headers.get("authorization");
        const accessToken = authHeader?.startsWith("Bearer ")
          ? authHeader.slice("Bearer ".length)
          : null;
        if (accessToken) {
          const { data: userData } = await admin.auth.getUser(accessToken);
          if (userData.user?.id) {
            await admin.auth.admin.deleteUser(userData.user.id);
          }
        }
      } catch (authError) {
        console.log("Auth user delete skipped:", authError);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `회원 탈퇴가 완료되었습니다. ${REJOIN_BLOCK_DAYS}일 동안 동일 학번으로 재가입할 수 없습니다.`,
      rejoinAllowedAt: rejoinAllowedAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "회원탈퇴에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
