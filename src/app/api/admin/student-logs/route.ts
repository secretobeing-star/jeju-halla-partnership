import { NextRequest, NextResponse } from "next/server";
import { rowToAdminAccess } from "@/lib/admin-permissions";
import { getRequestUser, resolveAdminAccess } from "@/lib/admin-permissions-server";
import {
  listStudentApplicationLogs,
  loadStudentSheetsConfigFromDb,
} from "@/lib/google-sheets-student";
import type { StudentApprovalStatus } from "@/lib/site-student-auth-settings";

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

function asStatus(value: string | null): "all" | StudentApprovalStatus {
  if (
    value === "pending" ||
    value === "approved" ||
    value === "rejected" ||
    value === "none"
  ) {
    return value;
  }
  return "all";
}

export async function GET(request: NextRequest) {
  const auth = await requireSiteSettingsAdmin(request);
  if ("error" in auth) {
    return auth.error;
  }

  const config = await loadStudentSheetsConfigFromDb();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "구글 시트 스프레드시트 ID가 설정되지 않았습니다. 로그인 · 학생증에서 시트 ID를 저장해 주세요.",
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";
  const status = asStatus(searchParams.get("status"));
  const from = searchParams.get("from")?.trim() || "";
  const to = searchParams.get("to")?.trim() || "";
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "200", 10);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 200;

  try {
    const logs = await listStudentApplicationLogs(config, {
      query,
      status,
      from: from || undefined,
      to: to || undefined,
      limit,
    });

    return NextResponse.json({
      logs,
      total: logs.length,
      logTab: config.logTab,
      spreadsheetId: config.spreadsheetId,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "구글 시트 신청 로그를 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
