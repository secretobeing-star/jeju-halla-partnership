"use client";

import { useCallback, useEffect, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { adminApiFetch } from "@/lib/admin-api";

type Member = {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata: Record<string, unknown>;
};

type DeletionRequest = {
  id: string;
  user_id: string;
  user_email: string;
  student_id: string | null;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  processed_at: string | null;
};

type WithdrawalBlock = {
  studentId: string;
  studentName: string | null;
  withdrawnAt: string;
  rejoinAllowedAt: string;
  isBlocked: boolean;
};

type MembersAdminPanelProps = {
  settings: unknown;
};

export default function MembersAdminPanel({
  settings,
}: MembersAdminPanelProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [withdrawalBlocks, setWithdrawalBlocks] = useState<WithdrawalBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<
    "members" | "withdrawals" | "deletion-requests" | "settings"
  >("members");
  const [requestFilter, setRequestFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [withdrawalFilter, setWithdrawalFilter] = useState<"all" | "blocked" | "expired">("all");
  const [clearingStudentId, setClearingStudentId] = useState<string | null>(null);
  const [withdrawalMessage, setWithdrawalMessage] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [customMessages, setCustomMessages] = useState({
    deletion_request_message: "",
    deletion_approve_message: "",
    deletion_reject_message: "",
  });
  const [messageSaving, setMessageSaving] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = (await adminApiFetch("/api/admin/members?limit=50")) as {
        members?: Member[];
        error?: string;
      };
      if (payload.error) {
        setError(payload.error);
        setMembers([]);
        return;
      }
      setMembers(payload.members ?? []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "회원 목록을 불러오지 못했습니다.");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDeletionRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = (await adminApiFetch(`/api/admin/account-deletion-requests?status=${requestFilter}`)) as {
        requests?: DeletionRequest[];
        messages?: Record<string, string>;
        error?: string;
      };
      if (payload.error) {
        setError(payload.error);
        setDeletionRequests([]);
        return;
      }
      setDeletionRequests(payload.requests ?? []);
      
      // 저장된 메시지 로드
      if (payload.messages) {
        setCustomMessages({
          deletion_request_message: payload.messages.deletion_request_message || "",
          deletion_approve_message: payload.messages.deletion_approve_message || "",
          deletion_reject_message: payload.messages.deletion_reject_message || "",
        });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "탈퇴 신청 목록을 불러오지 못했습니다.");
      setDeletionRequests([]);
    } finally {
      setLoading(false);
    }
  }, [requestFilter]);

  const loadWithdrawalBlocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = (await adminApiFetch(
        `/api/admin/withdrawal-blocks?filter=${withdrawalFilter}&limit=100`,
      )) as {
        blocks?: WithdrawalBlock[];
        error?: string;
      };
      if (payload.error) {
        setError(payload.error);
        setWithdrawalBlocks([]);
        return;
      }
      setWithdrawalBlocks(payload.blocks ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "탈퇴 이력을 불러오지 못했습니다.",
      );
      setWithdrawalBlocks([]);
    } finally {
      setLoading(false);
    }
  }, [withdrawalFilter]);

  async function handleClearRejoinBlock(row: WithdrawalBlock) {
    if (
      !window.confirm(
        `${row.studentName || row.studentId} (${row.studentId}) 재가입 차단을 해제할까요?\n해제 후 해당 학번으로 바로 다시 신청할 수 있습니다.`,
      )
    ) {
      return;
    }

    setClearingStudentId(row.studentId);
    setWithdrawalMessage(null);
    setError(null);
    try {
      const payload = (await adminApiFetch(
        `/api/admin/withdrawal-blocks?studentId=${encodeURIComponent(row.studentId)}`,
        { method: "DELETE" },
      )) as { ok?: boolean; message?: string; error?: string };

      if (payload.error) {
        setError(payload.error);
        return;
      }

      setWithdrawalBlocks((prev) =>
        prev.filter((item) => item.studentId !== row.studentId),
      );
      setWithdrawalMessage(
        payload.message || "재가입 차단을 해제했습니다.",
      );
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : "재가입 차단 해제에 실패했습니다.",
      );
    } finally {
      setClearingStudentId(null);
    }
  }

  const loadSettings = useCallback(async () => {
    try {
      const payload = (await adminApiFetch("/api/admin/members-settings")) as {
        deletion_request_message?: string;
        deletion_approve_message?: string;
        deletion_reject_message?: string;
        error?: string;
      };
      if (payload.error) {
        console.error("Failed to load settings:", payload.error);
        return;
      }
      setCustomMessages({
        deletion_request_message: payload.deletion_request_message || "",
        deletion_approve_message: payload.deletion_approve_message || "",
        deletion_reject_message: payload.deletion_reject_message || "",
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }, []);

  useEffect(() => {
    setWithdrawalMessage(null);
    if (tab === "members") {
      void loadMembers();
    } else if (tab === "withdrawals") {
      void loadWithdrawalBlocks();
    } else if (tab === "deletion-requests") {
      void loadDeletionRequests();
    } else if (tab === "settings") {
      void loadSettings();
    }
  }, [tab, loadMembers, loadWithdrawalBlocks, loadDeletionRequests, loadSettings]);

  async function handleDeleteMember(userId: string) {
    setDeletingId(userId);
    setDeleteMessage(null);
    try {
      const payload = (await adminApiFetch(`/api/admin/members?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      })) as {
        ok?: boolean;
        error?: string;
        deletedUserId?: string;
      };

      if (payload.error) {
        setDeleteMessage(payload.error);
        return;
      }

      setDeleteMessage("회원이 삭제되었습니다.");
      setDeleteConfirmId(null);
      await loadMembers();
    } catch (error) {
      setDeleteMessage(error instanceof Error ? error.message : "회원 삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeletionRequest(requestId: string, action: "approve" | "reject") {
    setProcessingRequest(requestId);
    try {
      const payload = (await adminApiFetch("/api/admin/account-deletion-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      })) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };

      if (payload.error) {
        alert(payload.error);
        return;
      }

      // 저장된 메시지 사용
      const message = action === "approve" 
        ? customMessages.deletion_approve_message || "탈퇴가 승인되고 처리되었습니다."
        : customMessages.deletion_reject_message || "탈퇴 신청이 거절되었습니다.";
      
      alert(message);
      await loadDeletionRequests();
    } catch (error) {
      alert(error instanceof Error ? error.message : "처리에 실패했습니다.");
    } finally {
      setProcessingRequest(null);
    }
  }

  async function handleSaveMessages() {
    setMessageSaving(true);
    try {
      const payload = (await adminApiFetch("/api/admin/members-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customMessages),
      })) as {
        ok?: boolean;
        error?: string;
      };

      if (payload.error) {
        alert(payload.error);
        return;
      }

      alert("메시지가 저장되었습니다.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setMessageSaving(false);
    }
  }

  return (
    <AdminCollapsibleSection
      title="회원 관리"
      description="회원 목록과 즉시 탈퇴 이력(14일 재가입 차단)을 확인할 수 있습니다."
    >
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("members")}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              tab === "members"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            회원 목록
          </button>
          <button
            type="button"
            onClick={() => setTab("withdrawals")}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              tab === "withdrawals"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            탈퇴 이력
          </button>
          <button
            type="button"
            onClick={() => setTab("deletion-requests")}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              tab === "deletion-requests"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            탈퇴 신청(구)
          </button>
          <button
            type="button"
            onClick={() => setTab("settings")}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              tab === "settings"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            메시지 설정
          </button>
        </div>
      </div>

      {tab === "withdrawals" ? (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-600">
              즉시 탈퇴한 학번 목록입니다. 「재가입 허용」으로 14일 차단을 즉시 해제할 수 있습니다.
            </p>
            <div className="flex items-center gap-2">
              <select
                value={withdrawalFilter}
                onChange={(e) =>
                  setWithdrawalFilter(e.target.value as "all" | "blocked" | "expired")
                }
                className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
              >
                <option value="all">전체</option>
                <option value="blocked">차단 중</option>
                <option value="expired">기간 만료</option>
              </select>
              <button
                type="button"
                onClick={() => void loadWithdrawalBlocks()}
                className="text-xs text-emerald-700 hover:underline"
              >
                새로고침
              </button>
            </div>
          </div>
          {withdrawalMessage ? (
            <p className="mb-2 text-sm text-emerald-700">{withdrawalMessage}</p>
          ) : null}
          {loading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : withdrawalBlocks.length === 0 ? (
            <p className="text-sm text-gray-500">탈퇴 이력이 없습니다.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">학번</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">이름</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">탈퇴일</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">재가입 가능일</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">상태</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {withdrawalBlocks.map((row) => (
                    <tr key={`${row.studentId}-${row.withdrawnAt}`}>
                      <td className="px-3 py-2 font-mono text-gray-900">{row.studentId}</td>
                      <td className="px-3 py-2 text-gray-700">{row.studentName || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {new Date(row.withdrawnAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {new Date(row.rejoinAllowedAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-3 py-2">
                        {row.isBlocked ? (
                          <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                            재가입 차단
                          </span>
                        ) : (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            기간 만료
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={clearingStudentId === row.studentId}
                          onClick={() => void handleClearRejoinBlock(row)}
                          className="rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {clearingStudentId === row.studentId
                            ? "해제 중..."
                            : "재가입 허용"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      {tab === "members" ? (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm text-gray-600">총 {members.length}명의 회원</p>
            <button
              type="button"
              onClick={() => void loadMembers()}
              className="text-xs text-emerald-700 hover:underline"
            >
              새로고침
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-500">회원이 없습니다.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">이메일</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">가입일</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">마지막 로그인</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900">{member.email}</p>
                        {member.email_confirmed_at ? (
                          <span className="text-xs text-emerald-600">인증됨</span>
                        ) : (
                          <span className="text-xs text-amber-600">미인증</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {new Date(member.created_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {member.last_sign_in_at
                          ? new Date(member.last_sign_in_at).toLocaleDateString("ko-KR")
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(member.id)}
                          disabled={deletingId === member.id}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === member.id ? "삭제 중..." : "삭제"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRequestFilter("pending")}
                className={`px-2 py-1 text-xs rounded ${
                  requestFilter === "pending"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                대기 ({deletionRequests.filter(r => r.status === "pending").length})
              </button>
              <button
                type="button"
                onClick={() => setRequestFilter("approved")}
                className={`px-2 py-1 text-xs rounded ${
                  requestFilter === "approved"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                승인됨
              </button>
              <button
                type="button"
                onClick={() => setRequestFilter("rejected")}
                className={`px-2 py-1 text-xs rounded ${
                  requestFilter === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                거절됨
              </button>
            </div>
            <button
              type="button"
              onClick={() => void loadDeletionRequests()}
              className="text-xs text-emerald-700 hover:underline"
            >
              새로고침
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : deletionRequests.length === 0 ? (
            <p className="text-sm text-gray-500">탈퇴 신청이 없습니다.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">이메일</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">학번</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">신청일</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deletionRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900">{request.user_email}</p>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {request.student_id || "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {new Date(request.requested_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {request.status === "pending" ? (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeletionRequest(request.id, "approve")}
                              disabled={processingRequest === request.id}
                              className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              {processingRequest === request.id ? "처리 중..." : "승인"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletionRequest(request.id, "reject")}
                              disabled={processingRequest === request.id}
                              className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              거절
                            </button>
                          </div>
                        ) : (
                          <span className={`text-xs ${
                            request.status === "approved" ? "text-emerald-600" : "text-red-600"
                          }`}>
                            {request.status === "approved" ? "승인됨" : "거절됨"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "settings" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              탈퇴 신청 완료 메시지
            </label>
            <textarea
              value={customMessages.deletion_request_message}
              onChange={(e) => setCustomMessages(prev => ({ ...prev, deletion_request_message: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              placeholder="탈퇴 신청이 접수되었습니다. 관리자 승인 후 탈퇴가 처리됩니다."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              탈퇴 승인 완료 메시지
            </label>
            <textarea
              value={customMessages.deletion_approve_message}
              onChange={(e) => setCustomMessages(prev => ({ ...prev, deletion_approve_message: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              placeholder="탈퇴가 승인되고 처리되었습니다."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              탈퇴 거절 완료 메시지
            </label>
            <textarea
              value={customMessages.deletion_reject_message}
              onChange={(e) => setCustomMessages(prev => ({ ...prev, deletion_reject_message: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              placeholder="탈퇴 신청이 거절되었습니다."
            />
          </div>
          <button
            type="button"
            onClick={handleSaveMessages}
            disabled={messageSaving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {messageSaving ? "저장 중..." : "메시지 저장"}
          </button>
        </div>
      )}

      {deleteMessage && (
        <p className="mt-3 text-sm text-emerald-700">{deleteMessage}</p>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">회원 삭제</h3>
            <p className="text-sm text-gray-600 mb-4">
              이 회원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며 모든 데이터가 삭제됩니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deletingId !== null}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMember(deleteConfirmId)}
                disabled={deletingId !== null}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminCollapsibleSection>
  );
}
