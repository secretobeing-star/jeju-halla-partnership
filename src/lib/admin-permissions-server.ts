import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  AdminPermissionRow,
  DEVELOPER_FREE_PASS_EMAILS,
  FULL_ADMIN_PERMISSIONS,
  rowToAdminAccess,
} from "@/lib/admin-permissions";

type DeveloperSettings = {
  developer_user_id: string | null;
  admin_developer_email: string | null;
};

export function getDeveloperFreePassEmails() {
  const raw = process.env.ADMIN_DEVELOPER_EMAIL ?? "";
  const envEmails = raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set([...DEVELOPER_FREE_PASS_EMAILS, ...envEmails])];
}

export async function getRequestUser(accessToken: string | null) {
  if (!accessToken) {
    return null;
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function getDeveloperSettings() {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return { settings: null, error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." };
  }

  const { data, error } = await admin
    .from("site_settings")
    .select("developer_user_id, admin_developer_email")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return { settings: null, error: error.message };
  }

  return {
    settings: (data as DeveloperSettings | null) ?? {
      developer_user_id: null,
      admin_developer_email: null,
    },
    error: null,
  };
}

export async function isDeveloperFreePass(userId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const envEmails = getDeveloperFreePassEmails();

  if (envEmails.includes(normalizedEmail)) {
    return true;
  }

  const { settings, error } = await getDeveloperSettings();
  if (error) {
    return envEmails.includes(normalizedEmail);
  }

  if (settings?.admin_developer_email?.trim().toLowerCase() === normalizedEmail) {
    return true;
  }

  if (settings?.developer_user_id) {
    return settings.developer_user_id === userId;
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return false;
  }

  const { error: claimError } = await admin
    .from("site_settings")
    .update({ developer_user_id: userId })
    .eq("id", 1)
    .is("developer_user_id", null);

  if (!claimError) {
    return true;
  }

  const { count, error: countError } = await admin
    .from("admin_user_permissions")
    .select("*", { count: "exact", head: true });

  if (!countError && (count ?? 0) === 0) {
    return true;
  }

  return false;
}

export async function getPermissionRow(userId: string) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return { row: null, error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." };
  }

  const { data, error } = await admin
    .from("admin_user_permissions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { row: null, error: error.message };
  }

  return { row: (data as AdminPermissionRow | null) ?? null, error: null };
}

export async function ensureDeveloperPermissionRow(userId: string, email: string) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return;
  }

  try {
    const payload = developerPermissionPayload(userId, email);
    await admin.from("admin_user_permissions").upsert(payload, { onConflict: "user_id" });
  } catch {
    // 권한 테이블이 아직 없어도 프리패스 로그인은 허용
  }
}

export async function resolveAdminAccess(userId: string, email: string) {
  const freePass = await isDeveloperFreePass(userId, email);

  if (freePass) {
    const row = developerPermissionPayload(userId, email);
    void ensureDeveloperPermissionRow(userId, email);
    return { row, error: null, isFreePass: true };
  }

  const existing = await getPermissionRow(userId);
  if (existing.error) {
    return { ...existing, isFreePass: false };
  }

  if (existing.row) {
    return { row: existing.row, error: null, isFreePass: false };
  }

  return { row: null, error: null, isFreePass: false };
}

export async function hasDeveloperPrivilege(
  userId: string,
  email: string,
  row: AdminPermissionRow | null = null,
) {
  if (await isDeveloperFreePass(userId, email)) {
    return true;
  }

  return row?.role === "developer" && row.is_active;
}

export async function canManageAdminPermissions(
  userId: string,
  email: string,
  row: AdminPermissionRow | null = null,
) {
  if (await hasDeveloperPrivilege(userId, email, row)) {
    return true;
  }

  let permissionRow = row;
  if (!permissionRow) {
    const result = await getPermissionRow(userId);
    if (result.error) {
      return false;
    }
    permissionRow = result.row;
  }

  return Boolean(permissionRow?.is_active && permissionRow.can_permissions);
}

export function isDeveloperAccess(row: AdminPermissionRow | null) {
  return row?.role === "developer" && row.is_active;
}

export function toAccessResponse(row: AdminPermissionRow | null, isFreePass = false) {
  if (!row) {
    return null;
  }

  const access = rowToAdminAccess(row);
  return {
    ...access,
    is_free_pass: isFreePass,
  };
}

export async function listAuthUsers() {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return { users: [], error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." };
  }

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });

  if (error) {
    return { users: [], error: error.message };
  }

  const users =
    data.users
      ?.filter((user) => user.email)
      .map((user) => ({
        id: user.id,
        email: user.email as string,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
      })) ?? [];

  return { users, error: null };
}

export async function listPermissionRows() {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return { rows: [], error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." };
  }

  const { data, error } = await admin
    .from("admin_user_permissions")
    .select("*")
    .order("role", { ascending: true })
    .order("email", { ascending: true });

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: (data as AdminPermissionRow[]) ?? [], error: null };
}

export function developerPermissionPayload(
  userId: string,
  email: string,
): AdminPermissionRow {
  return {
    user_id: userId,
    email,
    role: "developer",
    is_active: true,
    can_settings: FULL_ADMIN_PERMISSIONS.settings,
    can_ads: FULL_ADMIN_PERMISSIONS.ads,
    can_partners: FULL_ADMIN_PERMISSIONS.partners,
    can_board_settings: FULL_ADMIN_PERMISSIONS["board-settings"],
    can_boards: FULL_ADMIN_PERMISSIONS.boards,
    can_posts: FULL_ADMIN_PERMISSIONS.posts,
    can_developer: FULL_ADMIN_PERMISSIONS.developer,
    can_permissions: FULL_ADMIN_PERMISSIONS.permissions,
  };
}
