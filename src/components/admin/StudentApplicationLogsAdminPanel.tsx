"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { adminApiFetch } from "@/lib/admin-api";
import type { StudentApplicationLogRow } from "@/lib/google-sheets-student";
import type { StudentApprovalStatus } from "@/lib/site-student-auth-settings";

type StatusFilter = "all" | StudentApprovalStatus;

function formatSubmittedAt(value: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeClass(status: StudentApprovalStatus) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "rejected") {
    return "bg-red-100 text-red-700";
  }
  if (status === "none") {
    return "bg-gray-100 text-gray-600";
  }
  return "bg-amber-100 text-amber-800";
}

function statusLabel(status: StudentApprovalStatus, raw: string) {
  if (status === "approved") return "승인";
  if (status === "rejected") return "거절";
  if (status === "none") return raw || "없음";
  return raw || "대기";
}

export default function StudentApplicationLogsAdminPanel() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [logs, setLogs] = useState<StudentApplicationLogRow[]>([]);
  const [logTab, setLogTab] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [busyRow, setBusyRow] = useState<number | null>(null);

  const loadLogs = useCallback(
    async (filters?: {
      query?: string;
      status?: StatusFilter;
      from?: string;
      to?: string;
    }) => {
      const nextQuery = filters?.query ?? query;
      const nextStatus = filters?.status ?? status;
      const nextFrom = filters?.from ?? from;
      const nextTo = filters?.to ?? to;

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (nextQuery.trim()) params.set("q", nextQuery.trim());
        if (nextStatus !== "all") params.set("status", nextStatus);
        if (nextFrom) params.set("from", nextFrom);
        if (nextTo) params.set("to", nextTo);
        params.set("limit", "500");

        const payload = (await adminApiFetch(`/api/admin/student-logs?${params.toString()}`, {
          timeoutMs: 45_000,
        })) as {
          logs?: StudentApplicationLogRow[];
          logTab?: string;
          spreadsheetId?: string;
          total?: number;
        };

        setLogs(payload.logs ?? []);
        setLogTab(payload.logTab ?? null);
        setSpreadsheetId(payload.spreadsheetId ?? null);
      } catch (loadError) {
        setLogs([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "신청 로그를 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    },
    [from, query, status, to],
  );

  useEffect(() => {
    void loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilterSubmit(event: FormEvent) {
    event.preventDefault();
    void loadLogs();
  }

  function handleReset() {
    setQuery("");
    setStatus("all");
    setFrom("");
    setTo("");
    void loadLogs({ query: "", status: "all", from: "", to: "" });
  }

  async function handleReview(row: StudentApplicationLogRow, action: "approve" | "reject") {
    const label = action === "approve" ? "승인" : "거절";
    if (
      !window.confirm(
        action === "reject"
          ? `${row.name || row.studentId} 신청을 거절하고 로그에서 삭제할까요?`
          : `${row.name || row.studentId} 신청을 ${label}할까요?`,
      )
    ) {
      return;
    }

    setBusyRow(row.rowNumber);
    setMessage(null);
    setError(null);
    try {
      const payload = (await adminApiFetch("/api/admin/student-logs/review", {
        method: "POST",
        body: JSON.stringify({
          rowNumber: row.rowNumber,
          action,
          sendPush: action === "approve",
        }),
        timeoutMs: 45_000,
      })) as {
        push?: { sent?: number; skipped?: boolean; message?: string };
        deleted?: boolean;
      };

      if (action === "reject" || payload.deleted) {
        setLogs((prev) => prev.filter((item) => item.rowNumber !== row.rowNumber));
        setMessage("거절 처리되어 신청 로그에서 삭제했습니다.");
        return;
      }

      if (action === "approve") {
        const push = payload.push;
        if (push?.skipped) {
          setMessage(`${label} 처리했습니다. 푸시: ${push.message || "건너뜀"}`);
        } else if (typeof push?.sent === "number") {
          setMessage(`${label} 처리했습니다. 푸시 ${push.sent}건 발송`);
        } else {
          setMessage(`${label} 처리했습니다.`);
        }
      } else {
        setMessage(`${label} 처리했습니다.`);
      }

      await loadLogs();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error ? reviewError.message : `${label} 처리에 실패했습니다.`,
      );
    } finally {
      setBusyRow(null);
    }
  }

  return (
    <AdminCollapsibleSection
      title="신청 로그"
      description="구글 시트 신청 로그를 필터하고, 여기서 승인·거절할 수 있습니다. 승인 시 해당 기기 푸시 구독으로 알림을 보냅니다."
      defaultExpanded
    >
      <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
        <p>
          읽는 탭: <code className="rounded bg-white/80 px-1">{logTab || "(미확인)"}</code>
          {spreadsheetId ? (
            <>
              {" "}
              · 시트 ID: <code className="rounded bg-white/80 px-1">{spreadsheetId}</code>
            </>
          ) : null}
        </p>
        <p className="mt-1 text-emerald-800">
          탭 이름이 실제 시트와 다르면 「로그인 · 학생증 → 구글 시트 연동」에서 맞춰 주세요. 기본 탭명
          은 <code>사용자_로그</code> 입니다.
        </p>
      </div>
      <form onSubmit={handleFilterSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm font-medium text-gray-700">
            검색
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            상태
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              <option value="all">전체</option>
              <option value="pending">대기</option>
              <option value="approved">승인</option>
              <option value="rejected">거절</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            시작일
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            종료일
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "불러오는 중..." : "필터 적용"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleReset}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            초기화
          </button>
          {logTab ? (
            <p className="text-xs text-gray-500">시트 탭: {logTab}</p>
          ) : null}
        </div>
      </form>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading && logs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">불러오는 중...</p>
        ) : logs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">조건에 맞는 신청 로그가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {logs.map((log) => {
              const open = expandedId === log.rowNumber;
              const busy = busyRow === log.rowNumber;
              return (
                <li key={`${log.rowNumber}-${log.studentId}-${log.submittedAt}`}>
                  <div className="flex w-full items-start justify-between gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((current) =>
                          current === log.rowNumber ? null : log.rowNumber,
                        )
                      }
                      className="min-w-0 flex-1 text-left hover:opacity-80"
                    >
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {log.name || "(이름 없음)"} · {log.studentId || "(학번 없음)"}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatSubmittedAt(log.submittedAt)}
                        {log.department ? ` · ${log.department}` : ""}
                        {log.major ? ` / ${log.major}` : ""}
                      </p>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(log.statusNormalized)}`}
                      >
                        {statusLabel(log.statusNormalized, log.status)}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={busy || loading || log.statusNormalized === "approved"}
                          onClick={() => void handleReview(log, "approve")}
                          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          승인
                        </button>
                        <button
                          type="button"
                          disabled={busy || loading || log.statusNormalized === "rejected"}
                          onClick={() => void handleReview(log, "reject")}
                          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          거절
                        </button>
                      </div>
                    </div>
                  </div>
                  {open ? (
                    <div className="space-y-2 border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      <p>
                        <span className="font-medium text-gray-900">연락처</span>{" "}
                        {log.phone || "-"}
                      </p>
                      <p>
                        <span className="font-medium text-gray-900">졸업여부</span>{" "}
                        {log.graduation || "-"}
                      </p>
                      <p className="whitespace-pre-wrap">
                        <span className="font-medium text-gray-900">비고</span>{" "}
                        {log.notes || "-"}
                      </p>
                      {log.photoUrl ? (
                        <div>
                          <p className="font-medium text-gray-900">사진</p>
                          <a
                            href={log.photoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block"
                          >
                            <img
                              src={log.photoUrl}
                              alt=""
                              className="h-24 w-auto max-w-full rounded-lg border border-gray-200 object-cover"
                            />
                          </a>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {!loading && logs.length > 0 ? (
        <p className="mt-2 text-xs text-gray-500">최근 조건 기준 {logs.length}건 표시 (최대 200건)</p>
      ) : null}
    </AdminCollapsibleSection>
  );
}
