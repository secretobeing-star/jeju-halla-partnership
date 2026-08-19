import {
  AdminPermissionKey,
  AdminUserAccess,
  hasAdminPermission,
} from "@/lib/admin-permissions";

export type AdminNavLeafDef = {
  kind: "item";
  key: AdminNavKey;
  permission: AdminPermissionKey;
  label: string;
};

export type AdminNavSubgroupDef = {
  kind: "subgroup";
  key: string;
  navKey: AdminNavKey;
  permission: AdminPermissionKey;
  label: string;
  children: AdminNavLeafDef[];
};

export type AdminNavGroupEntry = AdminNavLeafDef | AdminNavSubgroupDef;

export const ADMIN_NAV_GROUPS: ReadonlyArray<{
  key: string;
  label: string;
  items: readonly AdminNavGroupEntry[];
}> = [
  {
    key: "site",
    label: "사이트",
    items: [
      { kind: "item", key: "site-basic", permission: "settings", label: "기본" },
      {
        kind: "subgroup",
        key: "site-pwa",
        navKey: "site-pwa",
        permission: "settings",
        label: "PWA (앱 설치)",
        children: [
          {
            kind: "item",
            key: "site-pwa-app-permissions",
            permission: "settings",
            label: "PWA 앱 권한",
          },
          {
            kind: "item",
            key: "site-pwa-loading",
            permission: "settings",
            label: "앱 로딩 화면",
          },
          {
            kind: "item",
            key: "site-pwa-permission-settings",
            permission: "settings",
            label: "권한 설정",
          },
          {
            kind: "item",
            key: "site-pwa-back-exit",
            permission: "settings",
            label: "뒤로가기 · 종료",
          },
        ],
      },
      { kind: "item", key: "site-admin-pwa", permission: "settings", label: "관리자 PWA (탭)" },
      {
        kind: "subgroup",
        key: "site-login-group",
        navKey: "site-login",
        permission: "settings",
        label: "학생증 · 보상",
        children: [
          {
            kind: "item",
            key: "site-login",
            permission: "settings",
            label: "설정",
          },
          {
            kind: "item",
            key: "site-student-card-frames",
            permission: "settings",
            label: "학생증 코스튬",
          },
          {
            kind: "item",
            key: "site-student-rewards",
            permission: "settings",
            label: "보상 지급",
          },
        ],
      },
      {
        kind: "subgroup",
        key: "site-members-group",
        navKey: "site-members",
        permission: "settings",
        label: "로그인",
        children: [
          {
            kind: "item",
            key: "site-student-logs",
            permission: "settings",
            label: "신청 로그",
          },
          {
            kind: "item",
            key: "site-members",
            permission: "settings",
            label: "회원 관리",
          },
        ],
      },
      { kind: "item", key: "site-browser-guide", permission: "settings", label: "브라우저 안내" },
      { kind: "item", key: "site-notifications", permission: "settings", label: "알림 · 푸시" },
      { kind: "item", key: "site-nav", permission: "settings", label: "상단·메뉴" },
      { kind: "item", key: "site-main", permission: "settings", label: "메인 화면" },
      { kind: "item", key: "user-settings", permission: "settings", label: "사용자 패널" },
    ],
  },
  {
    key: "partners",
    label: "제휴",
    items: [
      { kind: "item", key: "partners", permission: "partners", label: "업체 관리" },
      { kind: "item", key: "partner-taxonomy", permission: "partners", label: "카테고리 / 지역" },
      { kind: "item", key: "partner-search", permission: "partners", label: "검색 키워드" },
      { kind: "item", key: "partner-reviews", permission: "partners", label: "후기 관리" },
      { kind: "item", key: "partner-display", permission: "partners", label: "목록·지도·정렬" },
      { kind: "item", key: "map-events", permission: "partners", label: "지도 이벤트" },
    ],
  },
  {
    key: "board",
    label: "게시판",
    items: [
      { kind: "item", key: "boards", permission: "boards", label: "게시판 종류" },
      { kind: "item", key: "board-settings", permission: "board-settings", label: "게시판 설정" },
      { kind: "item", key: "posts", permission: "posts", label: "게시글 관리" },
      { kind: "item", key: "events", permission: "boards", label: "이벤트" },
      { kind: "item", key: "board-reports", permission: "posts", label: "신고 관리" },
      { kind: "item", key: "board-ip", permission: "posts", label: "IP 관리" },
      { kind: "item", key: "board-device", permission: "posts", label: "기기 관리" },
    ],
  },
  {
    key: "promo",
    label: "광고·팝업",
    items: [
      { kind: "item", key: "ads", permission: "ads", label: "광고" },
      { kind: "item", key: "popups", permission: "ads", label: "팝업" },
      { kind: "item", key: "benefits", permission: "ads", label: "혜택" },
    ],
  },
  {
    key: "advanced",
    label: "고급",
    items: [
      { kind: "item", key: "developer", permission: "developer", label: "개발자 모드" },
      { kind: "item", key: "permissions", permission: "permissions", label: "관리자 권한" },
    ],
  },
];

export type AdminNavKey =
  | "site-basic"
  | "site-pwa"
  | "site-pwa-app-permissions"
  | "site-pwa-loading"
  | "site-pwa-permission-settings"
  | "site-pwa-back-exit"
  | "site-admin-pwa"
  | "site-login"
  | "site-student-card-frames"
  | "site-student-rewards"
  | "site-student-logs"
  | "site-members"
  | "site-browser-guide"
  | "site-notifications"
  | "site-nav"
  | "site-main"
  | "user-settings"
  | "partners"
  | "partner-taxonomy"
  | "partner-search"
  | "partner-reviews"
  | "partner-display"
  | "map-events"
  | "boards"
  | "board-settings"
  | "posts"
  | "board-reports"
  | "board-ip"
  | "board-device"
  | "ads"
  | "popups"
  | "events"
  | "benefits"
  | "developer"
  | "permissions";

export type AdminNavItem = {
  key: AdminNavKey;
  permission: AdminPermissionKey;
  label: string;
  groupKey: string;
  groupLabel: string;
};

function flattenGroupItems(
  group: (typeof ADMIN_NAV_GROUPS)[number],
): AdminNavItem[] {
  return group.items.flatMap((entry) => {
    if (entry.kind === "subgroup") {
      const subgroupItem: AdminNavItem = {
        key: entry.navKey,
        permission: entry.permission,
        label: entry.label,
        groupKey: group.key,
        groupLabel: group.label,
      };
      const childItems = entry.children.map((child) => ({
        key: child.key,
        permission: child.permission,
        label: child.label,
        groupKey: group.key,
        groupLabel: group.label,
      }));
      return [subgroupItem, ...childItems];
    }

    return [
      {
        key: entry.key,
        permission: entry.permission,
        label: entry.label,
        groupKey: group.key,
        groupLabel: group.label,
      },
    ];
  });
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((group) =>
  flattenGroupItems(group),
);

export const SITE_PWA_NAV_KEYS = [
  "site-pwa",
  "site-pwa-app-permissions",
  "site-pwa-loading",
  "site-pwa-permission-settings",
  "site-pwa-back-exit",
] as const satisfies readonly AdminNavKey[];

export type SitePwaNavKey = (typeof SITE_PWA_NAV_KEYS)[number];

export function isSitePwaNavKey(navKey: AdminNavKey): navKey is SitePwaNavKey {
  return SITE_PWA_NAV_KEYS.includes(navKey as SitePwaNavKey);
}

export const DEFAULT_ADMIN_NAV: AdminNavKey = "site-basic";

export const ADMIN_NAV_STORAGE_KEY = "admin-active-nav";

export function hasAdminNavAccess(
  access: AdminUserAccess | null,
  navKey: AdminNavKey,
): boolean {
  const item = ADMIN_NAV_ITEMS.find((entry) => entry.key === navKey);
  if (!item) {
    return false;
  }

  return hasAdminPermission(access, item.permission);
}

export function getAllowedAdminNavKeys(access: AdminUserAccess | null): AdminNavKey[] {
  return ADMIN_NAV_ITEMS.filter((item) => hasAdminNavAccess(access, item.key)).map(
    (item) => item.key,
  );
}

function filterGroupEntry(
  entry: AdminNavGroupEntry,
  allowedKeys: Set<AdminNavKey>,
): AdminNavGroupEntry | null {
  if (entry.kind === "item") {
    return allowedKeys.has(entry.key) ? entry : null;
  }

  const children = entry.children.filter((child) => allowedKeys.has(child.key));
  const parentAllowed = allowedKeys.has(entry.navKey);

  if (!parentAllowed && children.length === 0) {
    return null;
  }

  return {
    ...entry,
    children,
  };
}

export function getAllowedAdminNavGroups(access: AdminUserAccess | null) {
  const allowedKeys = new Set(getAllowedAdminNavKeys(access));

  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .map((entry) => filterGroupEntry(entry, allowedKeys))
      .filter((entry): entry is AdminNavGroupEntry => entry !== null),
  })).filter((group) => group.items.length > 0);
}

export function getAdminNavLabel(navKey: AdminNavKey): string {
  return ADMIN_NAV_ITEMS.find((item) => item.key === navKey)?.label ?? navKey;
}

export function resolveStoredAdminNav(
  stored: string | null,
  access: AdminUserAccess | null,
): AdminNavKey {
  const allowed = getAllowedAdminNavKeys(access);
  if (allowed.length === 0) {
    return DEFAULT_ADMIN_NAV;
  }

  if (stored && allowed.includes(stored as AdminNavKey)) {
    return stored as AdminNavKey;
  }

  return allowed[0];
}

export function getAdminNavSubgroupKeys(navKey: AdminNavKey): string[] {
  for (const group of ADMIN_NAV_GROUPS) {
    for (const entry of group.items) {
      if (entry.kind !== "subgroup") {
        continue;
      }

      if (
        entry.navKey === navKey ||
        entry.children.some((child) => child.key === navKey)
      ) {
        return [entry.key];
      }
    }
  }

  return [];
}

/** 상단 「저장하기」로 제출할 수 있는 메뉴 */
export const ADMIN_NAV_WITH_HEADER_SAVE: AdminNavKey[] = [
  "site-basic",
  ...SITE_PWA_NAV_KEYS,
  "site-admin-pwa",
  "site-login",
  "site-student-card-frames",
  "site-student-rewards",
  "site-browser-guide",
  "site-notifications",
  "site-nav",
  "site-main",
  "user-settings",
  "partners",
  "partner-display",
  "board-settings",
  "ads",
  "benefits",
  "developer",
];

export function hasAdminHeaderSave(navKey: AdminNavKey): boolean {
  return ADMIN_NAV_WITH_HEADER_SAVE.includes(navKey);
}

export const ADMIN_PRIMARY_FORM_ATTR = "data-admin-primary-form";
