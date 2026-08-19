import { NextRequest, NextResponse } from "next/server";
import {
  canManageAdminPermissions,
  getPermissionRow,
  getRequestUser,
  listAuthUsers,
  listPermissionRows,
  toAccessResponse,
} from "@/lib/admin-permissions-server";

function getAccessToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
}

export async function GET(request: NextRequest) {
  const accessToken = getAccessToken(request);
  const user = await getRequestUser(accessToken);

  if (!user?.email) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const { row, error } = await getPermissionRow(user.id);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  if (!(await canManageAdminPermissions(user.id, user.email, row))) {
    return NextResponse.json({ error: "권한 관리 기능이 필요합니다." }, { status: 403 });
  }

  const [authUsersResult, permissionRowsResult] = await Promise.all([
    listAuthUsers(),
    listPermissionRows(),
  ]);

  if (authUsersResult.error) {
    return NextResponse.json({ error: authUsersResult.error }, { status: 500 });
  }

  if (permissionRowsResult.error) {
    return NextResponse.json(
      {
        authUsers: authUsersResult.users,
        permissionRecords: [],
        warning: permissionRowsResult.error,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    authUsers: authUsersResult.users,
    permissionRecords: permissionRowsResult.rows.map((record) => toAccessResponse(record)),
  });
}
