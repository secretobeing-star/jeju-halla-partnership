"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { adminApiFetch } from "@/lib/admin-api";
import {
  AdminAuthUser,
  AdminPermissionFlags,
  AdminPermissionRecord,
  AdminUserAccess,
  EMPTY_ADMIN_PERMISSIONS,
  FULL_ADMIN_PERMISSIONS,
  getGrantablePermissionItems,
} from "@/lib/admin-permissions";
import { PermissionCheckboxGrid } from "@/components/admin/AdminPermissionCheckboxGrid";

type PermissionsApiResponse = {
  authUsers?: AdminAuthUser[];
  permissionRecords?: AdminPermissionRecord[];
};

type DraftState = {
  role: "developer" | "admin";
  is_active: boolean;
  permissions: AdminPermissionFlags;
};

function createDraft(record: AdminPermissionRecord): DraftState {
  return {
    role: record.role,
    is_active: record.is_active,
    permissions: { ...record.permissions },
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("ko-KR");
}

type AdminPermissionsPanelProps = {
  currentAccess: AdminUserAccess;
};

type ManageApiResponse = {
  authUsers?: AdminAuthUser[];
  permissionRecords?: AdminPermissionRecord[];
  warning?: string;
};

export default function AdminPermissionsPanel({ currentAccess }: AdminPermissionsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const access = currentAccess;
  const [authUsers, setAuthUsers] = useState<AdminAuthUser[]>([]);
  const [permissionRecords, setPermissionRecords] = useState<AdminPermissionRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newUserPermissions, setNewUserPermissions] =
    useState<AdminPermissionFlags>(EMPTY_ADMIN_PERMISSIONS);

  const grantableItems = useMemo(() => getGrantablePermissionItems(), []);

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const payload = (await adminApiFetch("/api/admin/permissions/manage")) as ManageApiResponse;
      setAuthUsers(payload.authUsers ?? []);
      setPermissionRecords(payload.permissionRecords ?? []);

      if (payload.warning) {
        setMessage(`권한 목록 일부를 불러오지 못했습니다: ${payload.warning}`);
      }

      const nextDrafts: Record<string, DraftState> = {};
      for (const record of payload.permissionRecords ?? []) {
        nextDrafts[record.user_id] = createDraft(record);
      }
      setDrafts(nextDrafts);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "권한 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  const registeredUserIds = useMemo(
    () => new Set(permissionRecords.map((record) => record.user_id)),
    [permissionRecords],
  );

  const unregisteredUsers = useMemo(
    () => authUsers.filter((user) => !registeredUserIds.has(user.id)),
    [authUsers, registeredUserIds],
  );

  function updateDraft(userId: string, updater: (draft: DraftState) => DraftState) {
    setDrafts((prev) => {
      const current = prev[userId];
      if (!current) {
        return prev;
      }

      return {
        ...prev,
        [userId]: updater(current),
      };
    });
  }

  async function handleGrantUser(e: FormEvent) {
    e.preventDefault();

    if (!selectedUserId) {
      setMessage("권한을 부여할 Supabase 사용자를 선택해 주세요.");
      return;
    }

    setSavingUserId(selectedUserId);
    setMessage("");

    try {
      await adminApiFetch("/api/admin/permissions", {
        method: "POST",
        body: JSON.stringify({
          user_id: selectedUserId,
          role: "admin",
          is_active: true,
          permissions: newUserPermissions,
        }),
      });

      setSelectedUserId("");
      setNewUserPermissions(EMPTY_ADMIN_PERMISSIONS);
      setMessage("관리자 권한 계정이 등록되었습니다.");
      await loadPermissions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "권한 등록에 실패했습니다.");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleSaveRecord(userId: string) {
    const draft = drafts[userId];
    if (!draft) {
      return;
    }

    setSavingUserId(userId);
    setMessage("");

    try {
      await adminApiFetch("/api/admin/permissions", {
        method: "PATCH",
        body: JSON.stringify({
          user_id: userId,
          role: draft.role,
          is_active: draft.is_active,
          permissions: draft.permissions,
        }),
      });

      setMessage("권한 설정이 저장되었습니다.");
      await loadPermissions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "권한 저장에 실패했습니다.");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleDeleteRecord(userId: string, email: string) {
    if (!window.confirm(`${email} 계정의 관리자 권한을 삭제하시겠습니까?`)) {
      return;
    }

    setSavingUserId(userId);
    setMessage("");

    try {
      await adminApiFetch(`/api/admin/permissions?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });

      setMessage("관리자 권한이 삭제되었습니다.");
      await loadPermissions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "권한 삭제에 실패했습니다.");
    } finally {
      setSavingUserId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">권한 정보를 불러오는 중...</p>;
  }

  if (!access?.permissions.permissions) {
    return (
      <AdminCollapsibleSection
        title="관리자 권한"
        description="개발자 권한이 있는 계정만 이 메뉴를 사용할 수 있습니다."
      >
        {null}
      </AdminCollapsibleSection>
    );
  }

  return (
    <div className="space-y-6">
      <AdminCollapsibleSection
        title="관리자 권한"
        description="Supabase Authentication에 등록된 계정에 관리자 탭별 권한을 부여합니다. 개발자 계정은 모든 기능이 활성화됩니다."
      >
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">현재 로그인 계정</p>
          <p className="mt-1 text-sm text-emerald-800">
            {access.email} · {access.role === "developer" ? "개발자 (전체 활성화)" : "관리자"}
            {access.is_free_pass && (
              <span className="ml-2 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-emerald-700">
                프리패스
              </span>
            )}
          </p>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="권한 계정 등록"
        description="Supabase 대시보드 → Authentication → Users에서 먼저 사용자를 등록한 뒤, 아래에서 권한을 부여하세요."
      >
        <form onSubmit={handleGrantUser} className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Supabase 사용자
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">사용자 선택</option>
              {unregisteredUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-800">접근 가능한 관리자 탭</p>
            <p className="mt-1 text-xs text-gray-500">
              등록할 계정이 사용할 수 있는 탭을 선택하세요.
            </p>
            <div className="mt-3">
              <PermissionCheckboxGrid
                permissions={newUserPermissions}
                disabled={!selectedUserId}
                onChange={setNewUserPermissions}
                items={grantableItems}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedUserId || savingUserId === selectedUserId}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {savingUserId === selectedUserId ? "등록 중..." : "권한 계정 추가"}
          </button>
        </form>

        {unregisteredUsers.length === 0 && (
          <p className="mt-3 text-xs text-gray-500">
            등록 가능한 Supabase 사용자가 없습니다. Authentication에 사용자를 추가하거나, 이미 등록된
            계정은 아래 목록에서 권한을 수정하세요.
          </p>
        )}
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="권한 계정 목록" contentClassName="p-0">
        {permissionRecords.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500">등록된 권한 계정이 없습니다.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {permissionRecords.map((record) => {
              const draft = drafts[record.user_id] ?? createDraft(record);
              const isDeveloper = draft.role === "developer";
              const isCurrentUser = record.user_id === access.user_id;

              return (
                <article key={record.user_id} className="px-6 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{record.email}</h4>
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                            isDeveloper
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {isDeveloper ? "개발자" : "관리자"}
                        </span>
                        {!draft.is_active && (
                          <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            비활성
                          </span>
                        )}
                        {isCurrentUser && (
                          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            현재 계정
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        최근 로그인:{" "}
                        {formatDate(
                          authUsers.find((user) => user.id === record.user_id)?.last_sign_in_at,
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveRecord(record.user_id)}
                        disabled={savingUserId === record.user_id}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        {savingUserId === record.user_id ? "저장 중..." : "저장"}
                      </button>
                      {!isCurrentUser && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteRecord(record.user_id, record.email)}
                          disabled={savingUserId === record.user_id}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <label className="block text-sm font-medium text-gray-700">
                      역할
                      <select
                        value={draft.role}
                        onChange={(e) =>
                          updateDraft(record.user_id, (current) => ({
                            ...current,
                            role: e.target.value as "developer" | "admin",
                            permissions:
                              e.target.value === "developer"
                                ? { ...FULL_ADMIN_PERMISSIONS }
                                : current.permissions,
                          }))
                        }
                        disabled={isCurrentUser}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:bg-gray-100"
                      >
                        <option value="admin">관리자</option>
                        <option value="developer">개발자 (전체 활성화)</option>
                      </select>
                    </label>

                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={draft.is_active}
                        onChange={(e) =>
                          updateDraft(record.user_id, (current) => ({
                            ...current,
                            is_active: e.target.checked,
                          }))
                        }
                        disabled={isCurrentUser}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      계정 활성화
                    </label>
                  </div>

                  <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-medium text-gray-800">탭별 권한</p>
                    {isDeveloper ? (
                      <p className="mt-2 text-xs text-emerald-700">
                        개발자 계정은 모든 관리자 탭과 권한 관리 기능이 자동으로 활성화됩니다.
                      </p>
                    ) : (
                      <div className="mt-3">
                        <PermissionCheckboxGrid
                          permissions={draft.permissions}
                          onChange={(permissions) =>
                            updateDraft(record.user_id, (current) => ({
                              ...current,
                              permissions,
                            }))
                          }
                          items={grantableItems}
                        />
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </AdminCollapsibleSection>

      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
