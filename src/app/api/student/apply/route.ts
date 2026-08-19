import { NextResponse } from "next/server";
import {
  appendStudentApplication,
  buildStudentSheetWebhookPayload,
  checkStudentApplicationDuplicate,
  getStudentSheetWebhookUrl,
  loadStudentSheetsConfigFromDb,
  postStudentApplicationWebhook,
} from "@/lib/google-sheets-student";
import {
  DEFAULT_STUDENT_SHEETS_LOG_TAB,
  type StudentGraduationStatus,
} from "@/lib/site-student-auth-settings";
import { createSupabaseServer } from "@/lib/supabase-server";

const REJOIN_BLOCK_MESSAGE =
  "탈퇴 후 14일이 지나지 않아 재가입할 수 없습니다. 기간이 지난 뒤 다시 신청해 주세요.";

async function getWithdrawalBlock(studentId: string) {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase
    .from("site_member_withdrawal_blocks")
    .select("rejoin_allowed_at, withdrawn_at")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error || !data?.rejoin_allowed_at) {
    return null;
  }
  const allowedAt = new Date(data.rejoin_allowed_at);
  if (Number.isNaN(allowedAt.getTime()) || allowedAt.getTime() <= Date.now()) {
    return null;
  }
  return {
    rejoinAllowedAt: allowedAt.toISOString(),
    withdrawnAt: data.withdrawn_at ?? null,
  };
}

type ApplyBody = {
  department?: string;
  major?: string;
  studentId?: string;
  name?: string;
  phone?: string;
  email?: string;
  statusType?: string;
  userId?: string;
  graduationStatus?: string;
  notes?: string;
  photoUrl?: string | null;
  deviceKey?: string;
  customFields?: Array<{ id?: string; label?: string; value?: string }>;
  visibleFields?: {
    department?: boolean;
    major?: boolean;
    phone?: boolean;
    graduation?: boolean;
  };
};

function normalizeGraduation(value: string | undefined): StudentGraduationStatus | null {
  if (value === "enrolled" || value === "재학") {
    return "enrolled";
  }
  if (value === "graduated" || value === "졸업") {
    return "graduated";
  }
  return null;
}

export async function POST(request: Request) {
  let body: ApplyBody;
  try {
    body = (await request.json()) as ApplyBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const requireDepartment = body.visibleFields?.department !== false;
  const requireMajor = body.visibleFields?.major !== false;
  const requirePhone = body.visibleFields?.phone !== false;
  const requireGraduation = body.visibleFields?.graduation !== false;

  const department = body.department?.trim() ?? "";
  const major = body.major?.trim() ?? "";
  const studentId = body.studentId?.trim() ?? "";
  const name = body.name?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const notes = body.notes?.trim() ?? "";
  const photoUrl = body.photoUrl?.trim() || null;
  const deviceKey = body.deviceKey?.trim() ?? "";
  const graduationStatus = requireGraduation
    ? normalizeGraduation(body.graduationStatus)
    : normalizeGraduation(body.graduationStatus) ?? "enrolled";

  const missing: string[] = [];
  if (requireDepartment && !department) missing.push("학과");
  if (requireMajor && !major) missing.push("직속(전공)");
  if (!studentId) missing.push("학번");
  if (!name) missing.push("이름");
  if (requirePhone && !phone) missing.push("연락처");
  if (requireGraduation && !graduationStatus) missing.push("졸업여부");

  const customFields = (body.customFields ?? [])
    .map((field) => ({
      label: field.label?.trim() ?? "",
      value: field.value?.trim() ?? "",
    }))
    .filter((field) => field.label);

  for (const field of customFields) {
    if (!field.value) {
      missing.push(field.label);
    }
  }

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `${missing.join(", ")}을(를) 입력해 주세요.` },
      { status: 400 },
    );
  }

  if (!deviceKey || deviceKey.length < 8) {
    return NextResponse.json({ error: "기기 식별 정보가 없습니다." }, { status: 400 });
  }

  try {
    const block = await getWithdrawalBlock(studentId);
    if (block) {
      return NextResponse.json(
        {
          error: REJOIN_BLOCK_MESSAGE,
          code: "REJOIN_BLOCKED",
          rejoinAllowedAt: block.rejoinAllowedAt,
        },
        { status: 403 },
      );
    }
  } catch {
    // 테이블 미존재 시 신청은 계속 진행
  }

  const config = await loadStudentSheetsConfigFromDb();
  const webhookUrl = getStudentSheetWebhookUrl();
  if (!config && !webhookUrl) {
    return NextResponse.json(
      {
        error:
          "구글 시트 연동이 없습니다. 관리자에서 스프레드시트 ID를 저장하거나 GOOGLE_SHEET_WEBHOOK_URL(Apps Script 웹훅)을 설정해 주세요.",
      },
      { status: 503 },
    );
  }

  if (config) {
    try {
      const duplicate = await checkStudentApplicationDuplicate(config, studentId);
      if (duplicate.duplicate) {
        if (
          duplicate.reason === "approval_approved" ||
          duplicate.reason === "log_approved"
        ) {
          return NextResponse.json({
            status: "already_approved",
            message: "이미 승인된 학번입니다. 로그인해 주세요.",
            student: {
              studentId,
              name,
              department,
              major,
              phone,
              graduationStatus: graduationStatus ?? "enrolled",
              photoUrl,
              notes: null,
              approvalStatus: "approved",
            },
          });
        }

        return NextResponse.json({
          status: "already_approved",
          message: "이미 신청된 학번입니다. 로그인해 주세요.",
          student: {
            studentId,
            name,
            department,
            major,
            phone,
            graduationStatus: graduationStatus ?? "enrolled",
            photoUrl,
            notes: null,
            approvalStatus: "approved",
          },
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "중복 신청을 확인하지 못했습니다.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const customNotes = customFields
    .map((field) => `${field.label}: ${field.value}`)
    .join("\n");
  const mergedNotes = [notes, customNotes].filter(Boolean).join("\n");
  const email = body.email?.trim() || "";
  const statusType =
    body.statusType?.trim() ||
    (graduationStatus === "graduated" ? "졸업" : "재학");
  const userId = body.userId?.trim() || deviceKey || studentId;
  const createdAt = new Date().toISOString();

  let wroteViaApi = false;
  let wroteViaWebhook = false;
  const writeErrors: string[] = [];

  if (config) {
    try {
      await appendStudentApplication(config, {
        department,
        major,
        studentId,
        name,
        phone,
        graduationStatus: graduationStatus ?? "enrolled",
        notes: mergedNotes,
        photoUrl,
        deviceKey,
        email,
        statusType,
        userId,
        createdAt,
      });
      wroteViaApi = true;
    } catch (error) {
      writeErrors.push(
        error instanceof Error
          ? error.message
          : "구글 시트 API 저장에 실패했습니다.",
      );
    }
  }

  const sheetPayload = buildStudentSheetWebhookPayload({
    sheetName: config?.logTab || DEFAULT_STUDENT_SHEETS_LOG_TAB,
    studentId,
    name,
    status: "대기",
    imageUrl: photoUrl,
    department,
    remarks: mergedNotes,
    createdAt,
  });

  const webhookResult = await postStudentApplicationWebhook(sheetPayload);

  if (webhookResult.ok) {
    wroteViaWebhook = true;
  } else if (!("skipped" in webhookResult && webhookResult.skipped)) {
    writeErrors.push(
      "error" in webhookResult ? webhookResult.error : "웹훅 전송에 실패했습니다.",
    );
  }

  if (!wroteViaApi && !wroteViaWebhook) {
    return NextResponse.json(
      {
        error:
          writeErrors[0] ||
          "구글 시트에 신청을 저장하지 못했습니다. 시트 API 또는 GOOGLE_SHEET_WEBHOOK_URL을 확인하세요.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    status: "ok",
    student: {
      studentId,
      name,
      department,
      major,
      phone,
      graduationStatus: graduationStatus ?? "enrolled",
      photoUrl,
      notes: mergedNotes || null,
      approvalStatus: "approved",
    },
  });
}
