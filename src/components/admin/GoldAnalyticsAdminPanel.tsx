"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import AnalyticsMiniChart from "@/components/admin/AnalyticsMiniChart";
import { adminApiFetch } from "@/lib/admin-api";
import { type GoldAnalyticsSummary } from "@/lib/gold-analytics";
import {
  analyticsMonthOptions,
  currentAnalyticsMonth,
  type SiteAnalyticsPeriod,
} from "@/lib/site-analytics";

type GoldAnalyticsAdminPanelProps = {
  onMessage: (message: string) => void;
};

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

function percent(part: number, whole: number) {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

export default function GoldAnalyticsAdminPanel({ onMessage }: GoldAnalyticsAdminPanelProps) {
  const monthOptions = useMemo(() => analyticsMonthOptions(24), []);
  const [period, setPeriod] = useState<SiteAnalyticsPeriod>("month");
  const [month, setMonth] = useState(currentAnalyticsMonth);
  const [summary, setSummary] = useState<GoldAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(
    async (nextPeriod: SiteAnalyticsPeriod, nextMonth: string) => {
      setLoading(true);
      try {
        const query =
          nextPeriod === "month"
            ? `/api/admin/analytics/gold?days=month&month=${encodeURIComponent(nextMonth)}`
            : `/api/admin/analytics/gold?days=${nextPeriod}`;
        const payload = (await adminApiFetch(query)) as {
          summary?: GoldAnalyticsSummary;
          error?: string;
        };
        if (payload.error && !payload.summary) {
          throw new Error(payload.error);
        }
        if (payload.summary) setSummary(payload.summary);
      } catch (error) {
        setSummary(null);
        onMessage(error instanceof Error ? error.message : "골드 분석을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [onMessage],
  );

  useEffect(() => {
    void loadSummary(period, month);
  }, [loadSummary, period, month]);

  const periodToggle = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
        {(
          [
            { id: 7, label: "7일" },
            { id: 14, label: "14일" },
            { id: "month", label: "월별" },
          ] as const
        ).map((item) => (
          <button
            key={String(item.id)}
            type="button"
            className={`rounded-md px-3 py-1.5 font-medium ${
              period === item.id ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
            onClick={() => setPeriod(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {period === "month" ? (
        <select
          className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-800"
          value={month}
          onChange={(event) => {
            setMonth(event.target.value);
            setPeriod("month");
          }}
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );

  const gainSources = summary?.sources.filter((item) => item.gained > 0) ?? [];
  const spendSources = summary?.sources.filter((item) => item.spent > 0) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          출석·방문·퀘스트·보상으로 받은 골드와 상점·프리미엄에 쓴 골드를 봅니다. 원장 테이블이 없으면 기존
          출석·방문·구매 기록으로 추정합니다.
        </p>
        {periodToggle}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">골드 분석을 불러오는 중...</p>
      ) : summary ? (
        <>
          <AdminCollapsibleSection
            title="골드 사용량"
            description="골드상점 구매와 프리미엄 패스에 사용한 골드입니다."
          >
            <p className="text-3xl font-semibold text-gray-900">{formatCount(summary.spent)}</p>
            <p className="mt-1 text-sm text-gray-500">{summary.periodLabel}</p>
            <AnalyticsMiniChart
              daily={summary.daily}
              value={(item) => item.spent}
              color="#dc2626"
              metric="사용"
              unit="골드"
            />
          </AdminCollapsibleSection>

          <AdminCollapsibleSection
            title="골드 획득량"
            description="출석, 제휴 방문, 퀘스트, 시즌패스 보상, 상점 골드 상품, 뽑기로 받은 골드입니다."
          >
            <p className="text-3xl font-semibold text-gray-900">{formatCount(summary.gained)}</p>
            <p className="mt-1 text-sm text-gray-500">
              {summary.periodLabel} · 순증 {formatCount(summary.net)}골드
            </p>
            <AnalyticsMiniChart
              daily={summary.daily}
              value={(item) => item.gained}
              color="#ca8a04"
              metric="획득"
              unit="골드"
            />
          </AdminCollapsibleSection>

          <AdminCollapsibleSection
            title="획득 · 사용 경로"
            description="어디서 골드가 들어오고 나갔는지입니다."
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-500">획득 경로</p>
                {gainSources.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">이 기간 획득 기록이 없습니다.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {gainSources.map((item) => (
                      <li key={item.source} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-gray-700">{item.label}</span>
                        <span className="font-medium text-gray-900">
                          {formatCount(item.gained)}골드 · {percent(item.gained, summary.gained)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">사용 경로</p>
                {spendSources.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">이 기간 사용 기록이 없습니다.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {spendSources.map((item) => (
                      <li key={item.source} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-gray-700">{item.label}</span>
                        <span className="font-medium text-gray-900">
                          {formatCount(item.spent)}골드 · {percent(item.spent, summary.spent)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </AdminCollapsibleSection>
        </>
      ) : (
        <p className="text-sm text-gray-500">골드 분석을 불러오지 못했습니다.</p>
      )}
    </div>
  );
}
