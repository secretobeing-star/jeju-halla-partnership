import { NextRequest, NextResponse } from "next/server";
import {
  buildStudentSheetWebhookPayload,
  getStudentSheetWebhookUrl,
  postStudentApplicationWebhook,
} from "@/lib/google-sheets-student";
import { DEFAULT_STUDENT_SHEETS_APPROVAL_TAB } from "@/lib/site-student-auth-settings";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * 클라이언트 → 서버 중계 → Google Apps Script Webhook
 * 웹훅 URL은 서버 env(GOOGLE_SHEET_WEBHOOK_URL)만 사용합니다.
 * Content-Type: text/plain 으로 Apps Script에 전달합니다.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const webhookUrl = getStudentSheetWebhookUrl();
  if (!webhookUrl) {
    return NextResponse.json(
      {
        error:
          "GOOGLE_SHEET_WEBHOOK_URL이 설정되지 않았습니다. .env.local 또는 Vercel Environment Variables를 확인하세요.",
      },
      { status: 503 },
    );
  }

  const studentId = asString(body.student_id) || asString(body.studentId);
  const name = asString(body.name);
  const status = asString(body.status) || "승인";
  const sheetName =
    asString(body.sheetName) ||
    (status === "승인" ? DEFAULT_STUDENT_SHEETS_APPROVAL_TAB : "사용자_로그");

  const payload = buildStudentSheetWebhookPayload({
    sheetName,
    studentId,
    name,
    status,
    imageUrl: asString(body.image_url) || asString(body.photoUrl) || asString(body.photo_url),
    department: asString(body.department),
    remarks: asString(body.remarks) || asString(body.notes),
    createdAt: asString(body.created_at) || new Date().toISOString(),
  });

  if (!payload.student_id) {
    return NextResponse.json({ error: "학번(student_id)이 필요합니다." }, { status: 400 });
  }
  if (!payload.name) {
    return NextResponse.json({ error: "이름(name)이 필요합니다." }, { status: 400 });
  }

  const result = await postStudentApplicationWebhook(payload);
  if (!result.ok) {
    if ("skipped" in result && result.skipped) {
      return NextResponse.json(
        { error: "GOOGLE_SHEET_WEBHOOK_URL이 설정되지 않았습니다." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "error" in result ? result.error : "웹훅 전송에 실패했습니다." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, payload });
}
