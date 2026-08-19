import { NextRequest, NextResponse } from "next/server";
import {
  AdminPermissionFlags,
  permissionsToRowFlags,
} from "@/lib/admin-permissions";
import {
  developerPermissionPayload,
  getPermissionRow,
  getRequestUser,
  canManageAdminPermissions,
  hasDeveloperPrivilege,
  isDeveloperFreePass,
  listAuthUsers,
  listPermissionRows,
  resolveAdminAccess,
  toAccessResponse,
} from "@/lib/admin-permissions-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type SavePermissionBody = {
  user_id?: string;
  email?: string;
  role?: "developer" | "admin";
  is_active?: boolean;
  permissions?: Partial<AdminPermissionFlags>;
};

function getAccessToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
}

async function requirePermissionManager(request: NextRequest) {
  const accessToken = getAccessToken(request);
  const user = await getRequestUser(accessToken);

  if (!user?.email) {
    return { error: NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 }) };
  }

  const { row, error } = await getPermissionRow(user.id);
  if (error) {
    return { error: NextResponse.json({ error }, { status: 500 }) };
  }

  if (!(await canManageAdminPermissions(user.id, user.email, row))) {
    return {
      error: NextResponse.json({ error: "권한 관리 기능이 필요합니다." }, { status: 403 }),
    };
  }

  return { user, row };
}

export async function GET(request: NextRequest) {
  const accessToken = getAccessToken(request);
  const user = await getRequestUser(accessToken);

  if (!user?.email) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const { row, error, isFreePass } = await resolveAdminAccess(user.id, user.email);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const access = toAccessResponse(row, isFreePass);
  if (!access?.is_active) {
    return NextResponse.json({ error: "관리자 접근 권한이 없습니다." }, { status: 403 });
  }

  if (!(await hasDeveloperPrivilege(user.id, user.email, row))) {
    return NextResponse.json({ access });
  }

  return NextResponse.json({ access });
}

export async function POST(request: NextRequest) {
  const auth = await requirePermissionManager(request);
  if (auth.error) {
    return auth.error;
  }

  let body: SavePermissionBody;
  try {
    body = (await request.json()) as SavePermissionBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const userId = body.user_id?.trim();
  if (!userId) {
    return NextResponse.json({ error: "user_id가 필요합니다." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const authUsers = await listAuthUsers();
  if (authUsers.error) {
    return NextResponse.json({ error: authUsers.error }, { status: 500 });
  }

  const authUser = authUsers.users.find((user) => user.id === userId);
  if (!authUser) {
    return NextResponse.json(
      { error: "Supabase Authentication에 등록된 사용자를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const role = body.role === "developer" ? "developer" : "admin";
  const payload =
    role === "developer"
      ? developerPermissionPayload(userId, authUser.email)
      : {
          user_id: userId,
          email: authUser.email,
          role: "admin" as const,
          is_active: body.is_active ?? true,
          ...permissionsToRowFlags(body.permissions ?? {}),
          updated_at: new Date().toISOString(),
        };

  const { data, error } = await admin
    .from("admin_user_permissions")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("admin_user_permissions")
          ? `권한 저장 실패: admin-permissions.sql을 실행해 주세요. (${error.message})`
          : error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ record: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePermissionManager(request);
  if (auth.error) {
    return auth.error;
  }

  let body: SavePermissionBody;
  try {
    body = (await request.json()) as SavePermissionBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const userId = body.user_id?.trim();
  if (!userId) {
    return NextResponse.json({ error: "user_id가 필요합니다." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const { data: existing, error: fetchError } = await admin
    .from("admin_user_permissions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "권한 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const role =
    body.role === "developer" ? "developer" : body.role === "admin" ? "admin" : existing.role;
  const nextPermissions = body.permissions
    ? permissionsToRowFlags(body.permissions)
    : {
        can_settings: existing.can_settings,
        can_ads: existing.can_ads,
        can_partners: existing.can_partners,
        can_board_settings: existing.can_board_settings,
        can_boards: existing.can_boards,
        can_posts: existing.can_posts,
        can_developer: existing.can_developer,
      };

  const payload =
    role === "developer"
      ? {
          ...developerPermissionPayload(userId, existing.email),
          updated_at: new Date().toISOString(),
        }
      : {
          user_id: userId,
          email: existing.email,
          role: "admin" as const,
          is_active: body.is_active ?? existing.is_active,
          ...nextPermissions,
          updated_at: new Date().toISOString(),
        };

  const { data, error } = await admin
    .from("admin_user_permissions")
    .update(payload)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ record: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermissionManager(request);
  if (auth.error) {
    return auth.error;
  }

  const userId = request.nextUrl.searchParams.get("userId")?.trim();
  if (!userId) {
    return NextResponse.json({ error: "userId가 필요합니다." }, { status: 400 });
  }

  if (userId === auth.user?.id) {
    return NextResponse.json({ error: "본인 개발자 권한은 삭제할 수 없습니다." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const { data: existing } = await admin
    .from("admin_user_permissions")
    .select("email")
    .eq("user_id", userId)
    .maybeSingle();

  const targetEmail = existing?.email ?? "";
  if (targetEmail && (await isDeveloperFreePass(userId, targetEmail))) {
    return NextResponse.json({ error: "프리패스 개발자 계정은 삭제할 수 없습니다." }, { status: 400 });
  }

  const { error } = await admin.from("admin_user_permissions").delete().eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
