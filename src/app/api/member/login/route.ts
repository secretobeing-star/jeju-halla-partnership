import { NextResponse } from "next/server";
import {
  loadStudentSheetsConfigFromDb,
  lookupStudentApprovalStatus,
} from "@/lib/google-sheets-student";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { SiteMemberStudentProfile } from "@/lib/site-member-session";

type LoginBody = {
  preview_name?: string;
  student_id?: string;
};

async function loadLoginFailMessage() {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return null;
  }
  const { data } = await supabase
    .from("site_settings")
    .select("site_login_status_notice")
    .limit(1)
    .maybeSingle();
  return {
    statusNotice: data?.site_login_status_notice?.trim() || null,
  };
}

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const studentId = body.student_id?.trim() ?? "";
  if (studentId) {
    const config = await loadStudentSheetsConfigFromDb();
    if (!config) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "학생 로그인(시트) 설정이 없습니다. 관리자에서 스프레드시트와 서비스 계정을 확인해 주세요.",
        },
        { status: 503 },
      );
    }

    const notices = await loadLoginFailMessage();

    try {
      const record = await lookupStudentApprovalStatus(config, studentId);

      if (record.approvalStatus !== "none") {
        const student: SiteMemberStudentProfile = {
          studentId: record.studentId,
          name: record.name?.trim() || record.studentId,
          department: record.department?.trim() || "",
          major: record.major?.trim() || "",
          phone: "",
          graduationStatus: "enrolled",
          photoUrl: record.photoUrl?.trim() || null,
          notes: null,
          approvalStatus: "approved",
        };

        return NextResponse.json({
          status: "student",
          session: {
            provider: "student-id",
            displayName: student.name,
            loggedInAt: new Date().toISOString(),
            student,
          },
        });
      }

      return NextResponse.json({
        status: "error",
        message:
          notices?.statusNotice ||
          "학번을 확인하거나, 학생 인증을 먼저 신청해 주세요.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "학생 로그인에 실패했습니다.";
      return NextResponse.json({ status: "error", message }, { status: 500 });
    }
  }

  const previewName = body.preview_name?.trim() ?? "";
  if (previewName) {
    return NextResponse.json({
      status: "preview",
      session: {
        provider: "preview",
        displayName: previewName,
        loggedInAt: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({
    status: "coming_soon",
    message: null,
  });
}
