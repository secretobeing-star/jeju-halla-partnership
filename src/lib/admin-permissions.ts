export const DEVELOPER_FREE_PASS_EMAILS = [
  "secretobeing@gmail.com",
  "edsf4444@naver.com",
];

export function isClientDeveloperFreePassEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  return DEVELOPER_FREE_PASS_EMAILS.includes(normalized);
}

export function createDeveloperFreePassAccess(
  userId: string,
  email: string,
): AdminUserAccess {
  return {
    user_id: userId,
    email,
    role: "developer",
    is_active: true,
    permissions: { ...FULL_ADMIN_PERMISSIONS },
    is_free_pass: true,
  };
}

export const ADMIN_TABS = [
  { key: "browser-tab", permission: "settings", label: "브라우저 탭" },
  { key: "settings", permission: "settings", label: "상단 문구 / 타이틀" },
  { key: "ads", permission: "ads", label: "광고" },
  { key: "popups", permission: "ads", label: "팝업창" },
  { key: "benefits", permission: "ads", label: "혜택" },
  { key: "partners", permission: "partners", label: "제휴업체 관리" },
  { key: "partner-reviews", permission: "partners", label: "제휴 후기 관리" },
  { key: "partner-categories", permission: "partners", label: "카테고리 관리" },
  { key: "partner-regions", permission: "partners", label: "지역 관리" },
  { key: "board-settings", permission: "board-settings", label: "게시판 설정" },
  { key: "boards", permission: "boards", label: "게시판 관리" },
  { key: "posts", permission: "posts", label: "게시글 관리" },
  { key: "user-settings", permission: "settings", label: "설정" },
  { key: "developer", permission: "developer", label: "개발자 모드 (Beta)" },
  { key: "permissions", permission: "permissions", label: "관리자 권한" },
] as const;

export type AdminTabKey = (typeof ADMIN_TABS)[number]["key"];
export type AdminPermissionKey = (typeof ADMIN_TABS)[number]["permission"];

export type AdminPermissionFlags = {
  settings: boolean;
  ads: boolean;
  partners: boolean;
  "board-settings": boolean;
  boards: boolean;
  posts: boolean;
  developer: boolean;
  permissions: boolean;
};

export type AdminUserAccess = {
  user_id: string;
  email: string;
  role: "developer" | "admin";
  is_active: boolean;
  permissions: AdminPermissionFlags;
  is_free_pass?: boolean;
};

export type AdminAuthUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
};

export type AdminPermissionRecord = AdminUserAccess & {
  created_at: string;
  updated_at: string;
};

export const FULL_ADMIN_PERMISSIONS: AdminPermissionFlags = {
  settings: true,
  ads: true,
  partners: true,
  "board-settings": true,
  boards: true,
  posts: true,
  developer: true,
  permissions: true,
};

export const EMPTY_ADMIN_PERMISSIONS: AdminPermissionFlags = {
  settings: false,
  ads: false,
  partners: false,
  "board-settings": false,
  boards: false,
  posts: false,
  developer: false,
  permissions: false,
};

const PERMISSION_COLUMN_MAP: Record<AdminPermissionKey, keyof AdminPermissionRow> = {
  settings: "can_settings",
  ads: "can_ads",
  partners: "can_partners",
  "board-settings": "can_board_settings",
  boards: "can_boards",
  posts: "can_posts",
  developer: "can_developer",
  permissions: "can_permissions",
};

export type AdminPermissionRow = {
  user_id: string;
  email: string;
  role: "developer" | "admin";
  is_active: boolean;
  can_settings: boolean;
  can_ads: boolean;
  can_partners: boolean;
  can_board_settings: boolean;
  can_boards: boolean;
  can_posts: boolean;
  can_developer: boolean;
  can_permissions: boolean;
  created_at?: string;
  updated_at?: string;
};

export function rowToAdminAccess(row: AdminPermissionRow): AdminUserAccess {
  const isDeveloper = row.role === "developer";

  return {
    user_id: row.user_id,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
    permissions: {
      settings: isDeveloper || row.can_settings,
      ads: isDeveloper || row.can_ads,
      partners: isDeveloper || row.can_partners,
      "board-settings": isDeveloper || row.can_board_settings,
      boards: isDeveloper || row.can_boards,
      posts: isDeveloper || row.can_posts,
      developer: isDeveloper || row.can_developer,
      permissions: isDeveloper || row.can_permissions,
    },
  };
}

export function permissionsToRowFlags(permissions: Partial<AdminPermissionFlags>): Pick<
  AdminPermissionRow,
  | "can_settings"
  | "can_ads"
  | "can_partners"
  | "can_board_settings"
  | "can_boards"
  | "can_posts"
  | "can_developer"
  | "can_permissions"
> {
  return {
    can_settings: permissions.settings ?? false,
    can_ads: permissions.ads ?? false,
    can_partners: permissions.partners ?? false,
    can_board_settings: permissions["board-settings"] ?? false,
    can_boards: permissions.boards ?? false,
    can_posts: permissions.posts ?? false,
    can_developer: permissions.developer ?? false,
    can_permissions: permissions.permissions ?? false,
  };
}

export const ADMIN_PERMISSION_ITEMS = [
  { key: "settings", permission: "settings", label: "사이트 설정" },
  { key: "ads", permission: "ads", label: "광고·팝업·혜택" },
  { key: "partners", permission: "partners", label: "제휴" },
  { key: "board-settings", permission: "board-settings", label: "게시판 설정" },
  { key: "boards", permission: "boards", label: "게시판 종류" },
  { key: "posts", permission: "posts", label: "게시글 관리" },
  { key: "developer", permission: "developer", label: "개발자 모드" },
  { key: "permissions", permission: "permissions", label: "관리자 권한" },
] as const;

export function hasAdminPermission(
  access: AdminUserAccess | null,
  permission: AdminPermissionKey,
): boolean {
  if (!access?.is_active) {
    return false;
  }

  return access.permissions[permission];
}

export function hasAdminTabAccess(
  access: AdminUserAccess | null,
  tab: AdminTabKey,
): boolean {
  const permission = ADMIN_TABS.find((item) => item.key === tab)?.permission;
  if (!permission) {
    return false;
  }

  return hasAdminPermission(access, permission);
}

export function getAllowedAdminTabs(access: AdminUserAccess | null): AdminTabKey[] {
  return ADMIN_TABS.filter((tab) => hasAdminTabAccess(access, tab.key)).map((tab) => tab.key);
}

export function getGrantablePermissionItems() {
  return ADMIN_PERMISSION_ITEMS;
}

export function getPermissionColumn(key: AdminPermissionKey) {
  return PERMISSION_COLUMN_MAP[key];
}
