import { NextRequest, NextResponse } from "next/server";
import { rowToAdminAccess } from "@/lib/admin-permissions";
import { getRequestUser, resolveAdminAccess } from "@/lib/admin-permissions-server";
import {
  buildStudentSheetWebhookPayload,
  deleteStudentLogRow,
  listStudentApplicationLogs,
  loadStudentSheetsConfigFromDb,
  postStudentApplicationWebhook,
  updateStudentLogStatus,
  upsertStudentApprovalRecord,
} from "@/lib/google-sheets-student";
import { DEFAULT_STUDENT_SHEETS_APPROVAL_TAB } from "@/lib/site-student-auth-settings";
import { resolvePushSiteOrigin, resolvePushVisuals } from "@/lib/push-asset-url";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { sendWebPushNotification } from "@/lib/web-push-server";

type ReviewBody = {
  rowNumber?: number;
  action?: "approve" | "reject";
  sendPush?: boolean;
};

function getAccessToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
}

async function requireSiteSettingsAdmin(request: NextRequest) {
  const user = await getRequestUser(getAccessToken(request));
  if (!user?.email) {
    return { error: NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 }) };
  }

  const { row, error: accessError } = await resolveAdminAccess(user.id, user.email);
  if (accessError) {
    return { error: NextResponse.json({ error: accessError }, { status: 500 }) };
  }

  const access = row ? rowToAdminAccess(row) : null;
  if (!access?.is_active || !access.permissions.settings) {
    return { error: NextResponse.json({ error: "사이트 설정 권한이 없습니다." }, { status: 403 }) };
  }

  return { user };
}

export async function POST(request: NextRequest) {
  const auth = await requireSiteSettingsAdmin(request);
  if ("error" in auth) {
    return auth.error;
  }

  let body: ReviewBody;
  try {
    body = (await request.json()) as ReviewBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rowNumber = Number(body.rowNumber);
  const action = body.action;
  const sendPush = body.sendPush !== false;

  if (!Number.isFinite(rowNumber) || rowNumber < 1) {
    return NextResponse.json({ error: "로그 행 번호가 올바르지 않습니다." }, { status: 400 });
  }
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "승인 또는 거절을 선택해 주세요." }, { status: 400 });
  }

  const config = await loadStudentSheetsConfigFromDb();
  if (!config) {
    return NextResponse.json(
      { error: "구글 시트 스프레드시트 ID가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  let target;
  try {
    const logs = await listStudentApplicationLogs(config, { limit: 500 });
    target = logs.find((row) => row.rowNumber === rowNumber);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "신청 로그를 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!target) {
    return NextResponse.json({ error: "해당 신청 로그를 찾지 못했습니다." }, { status: 404 });
  }

  if (!target.studentId) {
    return NextResponse.json({ error: "학번이 없는 로그는 처리할 수 없습니다." }, { status: 400 });
  }

  const nextStatus = action === "approve" ? "approved" : "rejected";

  try {
    if (action === "reject") {
      await deleteStudentLogRow(config, rowNumber);
      return NextResponse.json({
        ok: true,
        status: "deleted",
        deleted: true,
        rowNumber,
        studentId: target.studentId,
        push: null,
      });
    }

    await updateStudentLogStatus(config, rowNumber, nextStatus);
    await upsertStudentApprovalRecord(config, {
      studentId: target.studentId,
      name: target.name || target.studentId,
      status: nextStatus,
      photoUrl: target.photoUrl,
      department: target.department,
      major: target.major,
    });

    const webhookPayload = buildStudentSheetWebhookPayload({
      sheetName: config.approvalTab || DEFAULT_STUDENT_SHEETS_APPROVAL_TAB,
      studentId: target.studentId,
      name: target.name || target.studentId,
      status: "승인",
      imageUrl: target.photoUrl,
      department: target.department,
      remarks: target.notes,
    });
    const webhookResult = await postStudentApplicationWebhook(webhookPayload);
    if (!webhookResult.ok && !("skipped" in webhookResult && webhookResult.skipped)) {
      console.error("승인 시트 웹훅 전송 실패:", webhookResult);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "시트 상태 변경에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  let pushResult: { sent: number; failed: number; skipped: boolean; message?: string } | null =
    null;

  if (action === "approve" && sendPush && target.deviceKey) {
    const admin = createSupabaseAdmin();
    if (admin) {
      const { data: subscriptions } = await admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("client_key", target.deviceKey);

      const { data: siteSettings } = await admin
        .from("site_settings")
        .select("main_domain, site_favicon_url, site_push_icon_url, site_pwa_icon_url")
        .eq("id", 1)
        .maybeSingle();

      const siteOrigin = resolvePushSiteOrigin(siteSettings?.main_domain);
      const visuals = resolvePushVisuals({
        siteOrigin,
        siteFaviconUrl: siteSettings?.site_favicon_url,
        sitePushIconUrl: siteSettings?.site_push_icon_url,
        sitePwaIconUrl: siteSettings?.site_pwa_icon_url,
      });

      pushResult = await sendWebPushNotification(subscriptions ?? [], {
        title: "학생증 승인",
        body: "학생증이 승인되었습니다. 다시 로그인해 주세요.",
        url: "/",
        icon: visuals.icon,
        badge: visuals.badge,
      });
    } else {
      pushResult = {
        sent: 0,
        failed: 0,
        skipped: true,
        message: "SUPABASE_SERVICE_ROLE_KEY가 없어 푸시를 보내지 못했습니다.",
      };
    }
  }

  return NextResponse.json({
    ok: true,
    status: nextStatus,
    rowNumber,
    studentId: target.studentId,
    push: pushResult,
  });
}
