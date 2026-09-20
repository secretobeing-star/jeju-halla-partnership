"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { adminApiFetch } from "@/lib/admin-api";
import StudentIdsField from "@/components/admin/StudentIdsField";
import type { StudentSuspension } from "@/lib/student-suspension";

export default function StudentSuspensionAdminPanel() {
  const [studentIdsText, setStudentIdsText] = useState("");
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<StudentSuspension[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const payload = (await adminApiFetch("/api/admin/student-suspensions")) as {
        suspensions?: StudentSuspension[];
        error?: string;
      };
      if (payload.error) {
        setStatusMessage(payload.error);
        setRows([]);
        return;
      }
      setRows(payload.suspensions ?? []);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "정지 목록을 불러오지 못했습니다.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatusMessage(null);
    try {
      const payload = (await adminApiFetch("/api/admin/student-suspensions", {
        method: "POST",
        body: JSON.stringify({
          studentIds: studentIdsText,
          reason,
          until: until || null,
        }),
      })) as { ok?: boolean; count?: number; error?: string };
      if (payload.error) {
        setStatusMessage(payload.error);
        return;
      }
      setStatusMessage(`${payload.count ?? 0}개 학번을 정지했습니다. 해당 계정은 바로 로그아웃됩니다.`);
      setStudentIdsText("");
      setReason("");
      setUntil("");
      await loadRows();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "학번 정지에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function clearSuspension(studentId: string) {
    setClearingId(studentId);
    setStatusMessage(null);
    try {
      const payload = (await adminApiFetch(
        `/api/admin/student-suspensions?studentId=${encodeURIComponent(studentId)}`,
        { method: "DELETE" },
      )) as { error?: string };
      if (payload.error) {
        setStatusMessage(payload.error);
        return;
      }
      setStatusMessage(`${studentId} 정지를 해제했습니다.`);
      await loadRows();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "정지 해제에 실패했습니다.");
    } finally {
      setClearingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        정지된 학번은 로그인·학생 API·신규 신청이 막힙니다. 종료 시각을 비우면 해제할 때까지 유지됩니다.
      </p>
      <p className="text-xs text-gray-500">
        DB: <code className="rounded bg-gray-100 px-1">supabase/site-student-suspensions.sql</code>
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <StudentIdsField value={studentIdsText} onChange={setStudentIdsText} />
        <label className="block text-sm font-medium text-gray-700">
          사유 (선택)
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="예: 부정 이용, 운영 정책 위반"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          정지 종료 (선택)
          <input
            type="datetime-local"
            value={until}
            onChange={(event) => setUntil(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
          <span className="mt-1 block text-xs font-normal text-gray-500">비우면 무기한입니다.</span>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? "처리 중..." : "학번 정지"}
        </button>
      </form>

      {statusMessage ? <p className="text-sm text-emerald-700">{statusMessage}</p> : null}

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-700">정지 중인 학번</p>
        <button type="button" onClick={() => void loadRows()} className="text-xs text-emerald-700 hover:underline">
          새로고침
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">정지된 학번이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {rows.map((row) => (
            <li key={row.studentId} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
              <div>
                <p className="font-medium text-gray-900">{row.studentId}</p>
                <p className="text-xs text-gray-600">{row.reason || "사유 없음"}</p>
                <p className="text-xs text-gray-500">
                  {row.until ? `${new Date(row.until).toLocaleString("ko-KR")}까지` : "무기한"}
                  {row.createdBy ? ` · ${row.createdBy}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void clearSuspension(row.studentId)}
                disabled={clearingId === row.studentId}
                className="shrink-0 rounded px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                {clearingId === row.studentId ? "해제 중..." : "해제"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
