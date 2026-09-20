"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import StudentIdsField from "@/components/admin/StudentIdsField";
import { adminApiFetch } from "@/lib/admin-api";
import type { RewardDistributionLog } from "@/lib/reward-distribution-log";
import { resolveCardFrameCatalog } from "@/lib/student-card-frames";
import type { StudentRewardRow } from "@/lib/student-rewards";
import { SiteSettings } from "@/lib/supabase";

type StudentRewardsAdminPanelProps = {
  settings: SiteSettings;
};

export default function StudentRewardsAdminPanel({
  settings,
}: StudentRewardsAdminPanelProps) {
  const frames = useMemo(
    () => resolveCardFrameCatalog(settings.site_student_card_frames),
    [settings.site_student_card_frames],
  );
  const [studentIdsText, setStudentIdsText] = useState("");
  const [kind, setKind] = useState<"costume" | "gold" | "coupon">("costume");
  const [frameId, setFrameId] = useState("");
  const [frameQuery, setFrameQuery] = useState("");
  const [goldAmount, setGoldAmount] = useState("100");
  const [couponCode, setCouponCode] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [recent, setRecent] = useState<StudentRewardRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<RewardDistributionLog[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [deleteConfirmLogId, setDeleteConfirmLogId] = useState<string | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteAllRewardsConfirm, setDeleteAllRewardsConfirm] = useState(false);
  const [deletingAllRewards, setDeletingAllRewards] = useState(false);

  const costumeOptions = frames.filter((frame) => {
    const hay = `${frame.name} ${frame.id}`.toLowerCase();
    return hay.includes(frameQuery.trim().toLowerCase());
  });

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const payload = (await adminApiFetch("/api/admin/student-rewards?limit=40")) as {
        rewards?: StudentRewardRow[];
        error?: string;
      };
      if (payload.error) {
        setStatusMessage(payload.error);
        setRecent([]);
        return;
      }
      setRecent(payload.rewards ?? []);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "지급 내역을 불러오지 못했습니다.",
      );
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const payload = (await adminApiFetch(
        "/api/admin/student-rewards?view=audit&limit=50",
      )) as {
        logs?: RewardDistributionLog[];
        error?: string;
      };
      if (payload.error) {
        setStatusMessage(payload.error);
        setAuditLogs([]);
        return;
      }
      setAuditLogs(payload.logs ?? []);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "감사 로그를 불러오지 못했습니다.",
      );
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    void loadRecent();
    void loadAuditLogs();
  }, [loadRecent, loadAuditLogs]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatusMessage(null);
    try {
      const payload = (await adminApiFetch("/api/admin/student-rewards", {
        method: "POST",
        body: JSON.stringify({
          studentIds: studentIdsText,
          kind,
          frameId,
          goldAmount,
          couponCode,
          title,
          message,
          reason,
        }),
      })) as {
        ok?: boolean;
        sent?: number;
        error?: string;
        auditWarning?: string;
      };

      if (payload.error) {
        setStatusMessage(payload.error);
        return;
      }

      setStatusMessage(
        [
          `${payload.sent ?? 0}명에게 보상을 선물함으로 보냈습니다.`,
          payload.auditWarning,
        ]
          .filter(Boolean)
          .join(" "),
      );
      setStudentIdsText("");
      setTitle("");
      setMessage("");
      setReason("");
      await Promise.all([loadRecent(), loadAuditLogs()]);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "보상 지급에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAllRewards() {
    setDeletingAllRewards(true);
    setStatusMessage(null);
    try {
      const payload = (await adminApiFetch("/api/admin/student-rewards?view=rewards&all=1", {
        method: "DELETE",
      })) as {
        ok?: boolean;
        error?: string;
      };

      if (payload.error) {
        setStatusMessage(payload.error);
        return;
      }

      setStatusMessage("선물함 지급 내역을 모두 삭제했습니다.");
      setDeleteAllRewardsConfirm(false);
      await loadRecent();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "지급 내역 전체 삭제에 실패했습니다.",
      );
    } finally {
      setDeletingAllRewards(false);
    }
  }

  async function handleDeleteAllAuditLogs() {
    setDeletingAll(true);
    setStatusMessage(null);
    try {
      const payload = (await adminApiFetch("/api/admin/student-rewards?all=1", {
        method: "DELETE",
      })) as {
        ok?: boolean;
        error?: string;
      };

      if (payload.error) {
        setStatusMessage(payload.error);
        return;
      }

      setStatusMessage("감사 로그를 모두 삭제했습니다.");
      setDeleteAllConfirm(false);
      await loadAuditLogs();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "감사 로그 전체 삭제에 실패했습니다.",
      );
    } finally {
      setDeletingAll(false);
    }
  }

  async function handleDeleteAuditLog(logId: string) {
    setDeletingLogId(logId);
    setStatusMessage(null);
    try {
      const payload = (await adminApiFetch(
        `/api/admin/student-rewards?logId=${encodeURIComponent(logId)}`,
        {
          method: "DELETE",
        },
      )) as {
        ok?: boolean;
        error?: string;
        deletedLogId?: string;
      };

      if (payload.error) {
        setStatusMessage(payload.error);
        return;
      }

      setStatusMessage("감사 로그가 삭제되었습니다.");
      setDeleteConfirmLogId(null);
      await loadAuditLogs();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "감사 로그 삭제에 실패했습니다.",
      );
    } finally {
      setDeletingLogId(null);
    }
  }

  return (
    <AdminCollapsibleSection
      title="보상 지급"
      description="학번을 지정해 골드, 쿠폰, 코스튬을 선물함으로 보냅니다. 학생은 상단 메뉴 선물함에서 수령합니다."
    >
      <p className="mb-3 text-xs text-gray-500">
        DB:{" "}
        <code className="rounded bg-gray-100 px-1">supabase/site-student-rewards.sql</code>
        {" · "}
        <code className="rounded bg-gray-100 px-1">
          supabase/site-reward-distribution-logs.sql
        </code>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <StudentIdsField
          label="받을 학번 (쉼표·줄바꿈으로 여러 명)"
          value={studentIdsText}
          onChange={setStudentIdsText}
        />

        <div>
          <p className="text-sm font-medium text-gray-700">지급 종류</p>
          <div className="mt-1 flex rounded-lg border border-gray-200 p-0.5 text-xs">
            {(
              [
                { id: "costume", label: "코스튬" },
                { id: "gold", label: "골드" },
                { id: "coupon", label: "쿠폰" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
                  kind === item.id ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => setKind(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {kind === "costume" ? (
          <>
            <label className="block text-sm font-medium text-gray-700">
              지급할 코스튬
              <input
                value={frameQuery}
                onChange={(e) => setFrameQuery(e.target.value)}
                placeholder="이름·ID 검색"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <select
                value={frameId}
                onChange={(e) => setFrameId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                required
              >
                <option value="">선택</option>
                {costumeOptions.map((frame) => (
                  <option key={frame.id} value={frame.id}>
                    {frame.name || frame.id}
                  </option>
                ))}
              </select>
            </label>
            {frames.length === 0 ? (
              <p className="text-xs text-amber-700">
                등록된 코스튬이 없습니다. 「학생증 코스튬」 메뉴에서 먼저 추가해 주세요.
              </p>
            ) : null}
          </>
        ) : null}

        {kind === "gold" ? (
          <label className="block text-sm font-medium text-gray-700">
            지급할 골드
            <input
              type="number"
              min={1}
              step={1}
              value={goldAmount}
              onChange={(e) => setGoldAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              required
            />
          </label>
        ) : null}

        {kind === "coupon" ? (
          <label className="block text-sm font-medium text-gray-700">
            쿠폰 코드
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="학생이 받을 때 보이는 코드"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500"
              required
            />
          </label>
        ) : null}

        <label className="block text-sm font-medium text-gray-700">
          선물 제목 (선택)
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          안내 문구 (선택)
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          지급 사유 (감사 로그)
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 행사 참석 보상, 운영진 수동 지급"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
          <span className="mt-1 block text-xs font-normal text-gray-500">
            비우면 안내 문구·제목을 사유로 기록합니다. 관리자 ID·IP·브라우저 정보와 함께 저장됩니다.
          </span>
        </label>

        <button
          type="submit"
          disabled={
            busy ||
            (kind === "costume" && !frameId) ||
            (kind === "gold" && !(Number(goldAmount) > 0)) ||
            (kind === "coupon" && !couponCode.trim())
          }
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "전송 중..." : "선물함으로 보내기"}
        </button>
      </form>

      {statusMessage ? (
        <p className="mt-3 text-sm text-emerald-700">{statusMessage}</p>
      ) : null}

      <div className="mt-6 border-t border-gray-100 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-700">최근 지급 내역 (선물함)</p>
          <div className="flex items-center gap-3">
            {recent.length > 0 ? (
              <button
                type="button"
                onClick={() => setDeleteAllRewardsConfirm(true)}
                disabled={deletingAllRewards}
                className="text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                전체 삭제
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void loadRecent()}
              className="text-xs text-emerald-700 hover:underline"
            >
              새로고침
            </button>
          </div>
        </div>
        {loadingRecent ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-gray-500">지급 내역이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {recent.map((row) => (
              <li key={row.id} className="px-3 py-2 text-sm">
                <p className="font-medium text-gray-900">
                  {row.student_id} · {row.title || row.frame_id || "보상"}
                </p>
                <p className="text-xs text-gray-500">
                  {row.reward_type === "gold"
                    ? "골드"
                    : row.reward_type === "coupon"
                      ? "쿠폰"
                      : "코스튬"}{" "}
                  · {row.status === "claimed" ? "수령 완료" : "대기"} ·{" "}
                  {new Date(row.created_at).toLocaleString("ko-KR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 border-t border-gray-100 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-700">보상 지급 감사 로그</p>
          <div className="flex items-center gap-3">
            {auditLogs.length > 0 ? (
              <button
                type="button"
                onClick={() => setDeleteAllConfirm(true)}
                disabled={deletingAll}
                className="text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                전체 삭제
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void loadAuditLogs()}
              className="text-xs text-emerald-700 hover:underline"
            >
              새로고침
            </button>
          </div>
        </div>
        <p className="mb-2 text-xs text-gray-500">
          관리자가 수동·일괄 지급할 때마다 실시간으로 누적됩니다. 비인가 API 접근은 401/403으로
          차단됩니다.
        </p>
        {loadingAudit ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : auditLogs.length === 0 ? (
          <p className="text-sm text-gray-500">감사 로그가 없습니다.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
            {auditLogs.map((log) => (
              <li key={log.logId} className="px-3 py-2.5 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {log.rewardType} · {log.rewardName} → {log.targetUserId}
                      {log.targetUserName ? ` (${log.targetUserName})` : ""}
                    </p>
                    <p className="text-xs text-gray-600">
                      사유: {log.reason || "(없음)"} · 관리자 {log.adminName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(log.createdAt).toLocaleString("ko-KR")}
                      {log.ipAddress ? ` · IP ${log.ipAddress}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmLogId(log.logId)}
                    disabled={deletingLogId === log.logId}
                    className="shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingLogId === log.logId ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {deleteConfirmLogId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">감사 로그 삭제</h3>
            <p className="text-sm text-gray-600 mb-4">
              이 감사 로그를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmLogId(null)}
                disabled={deletingLogId !== null}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAuditLog(deleteConfirmLogId)}
                disabled={deletingLogId !== null}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deletingLogId ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteAllConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">감사 로그 전체 삭제</h3>
            <p className="mb-4 text-sm text-gray-600">
              보상 지급 감사 로그를 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다. 학생
              선물함 내역은 그대로 둡니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteAllConfirm(false)}
                disabled={deletingAll}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAllAuditLogs()}
                disabled={deletingAll}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingAll ? "삭제 중..." : "전체 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteAllRewardsConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">지급 내역 전체 삭제</h3>
            <p className="mb-4 text-sm text-gray-600">
              선물함 지급 내역을 모두 삭제하시겠습니까? 대기 중인 선물이 학생 선물함에서도
              사라집니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteAllRewardsConfirm(false)}
                disabled={deletingAllRewards}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAllRewards()}
                disabled={deletingAllRewards}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingAllRewards ? "삭제 중..." : "전체 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminCollapsibleSection>
  );
}
