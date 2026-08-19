import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import {
  AdminPermissionKey,
  AdminUserAccess,
  rowToAdminAccess,
} from "@/lib/admin-permissions";
import { getRequestUser, resolveAdminAccess } from "@/lib/admin-permissions-server";

export type AdminAuthSuccess = {
  user: User;
  access: AdminUserAccess;
  email: string;
};

export type AdminAuthFailure = {
  error: NextResponse;
};

function getAccessToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
}

/**
 * 관리자 전용 API 가드.
 * JWT(Bearer) 검증 후 admin_permissions 기반 활성·권한 확인.
 */
export async function adminAuthMiddleware(
  request: NextRequest,
  permission: AdminPermissionKey = "settings",
): Promise<AdminAuthSuccess | AdminAuthFailure> {
  const user = await getRequestUser(getAccessToken(request));
  if (!user?.email) {
    return {
      error: NextResponse.json(
        { error: "관리자 로그인이 필요합니다.", code: "UNAUTHORIZED" },
        { status: 401 },
      ),
    };
  }

  const email = user.email.trim();
  const { row, error: accessError } = await resolveAdminAccess(user.id, email);
  if (accessError) {
    return {
      error: NextResponse.json(
        { error: accessError, code: "ACCESS_LOOKUP_FAILED" },
        { status: 500 },
      ),
    };
  }

  const access = row ? rowToAdminAccess(row) : null;
  if (!access?.is_active) {
    return {
      error: NextResponse.json(
        { error: "관리자 권한이 없거나 비활성 계정입니다.", code: "FORBIDDEN" },
        { status: 403 },
      ),
    };
  }

  if (!access.permissions[permission]) {
    return {
      error: NextResponse.json(
        { error: `「${permission}」 권한이 없습니다.`, code: "FORBIDDEN" },
        { status: 403 },
      ),
    };
  }

  return { user, access, email };
}

export function clientIpFromRequest(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return request.headers.get("x-real-ip");
}
