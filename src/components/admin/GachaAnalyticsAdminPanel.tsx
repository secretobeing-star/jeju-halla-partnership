"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import AnalyticsPieChart, { type AnalyticsPieSlice } from "@/components/admin/AnalyticsPieChart";
import { adminApiFetch } from "@/lib/admin-api";
import { gachaKindLabel, type GachaAnalyticsSummary } from "@/lib/gacha-analytics";
import {
  analyticsMonthOptions,
  currentAnalyticsMonth,
  type SiteAnalyticsPeriod,
} from "@/lib/site-analytics";

const PIE_COLORS = [
  "#059669",
  "#2563eb",
  "#d97706",
  "#db2777",
  "#7c3aed",
  "#0ea5e9",
  "#65a30d",
  "#ea580c",
  "#4f46e5",
  "#e11d48",
  "#0891b2",
  "#ca8a04",
];

type GachaAnalyticsAdminPanelProps = {
  onMessage: (message: string) => void;
};

export default function GachaAnalyticsAdminPanel({ onMessage }: GachaAnalyticsAdminPanelProps) {
  const monthOptions = useMemo(() => analyticsMonthOptions(24), []);
  const [period, setPeriod] = useState<SiteAnalyticsPeriod>("month");
  const [month, setMonth] = useState(currentAnalyticsMonth);
  const [boxId, setBoxId] = useState("all");
  const [summary, setSummary] = useState<GachaAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(
    async (nextPeriod: SiteAnalyticsPeriod, nextMonth: string) => {
      setLoading(true);
      try {
        const query =
          nextPeriod === "month"
            ? `/api/admin/analytics/gacha?days=month&month=${encodeURIComponent(nextMonth)}`
            : `/api/admin/analytics/gacha?days=${nextPeriod}`;
        const payload = (await adminApiFetch(query)) as {
          summary?: GachaAnalyticsSummary;
          error?: string;
        };
        if (payload.error && !payload.summary) {
          throw new Error(payload.error);
        }
        if (payload.summary) setSummary(payload.summary);
      } catch (error) {
        setSummary(null);
        onMessage(error instanceof Error ? error.message : "확률형 아이템 분석을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [onMessage],
  );

  useEffect(() => {
    void loadSummary(period, month);
  }, [loadSummary, period, month]);

  const items = useMemo(() => {
    const rows = summary?.items ?? [];
    if (boxId === "all") return rows;
    return rows.filter((item) => item.boxId === boxId);
  }, [summary?.items, boxId]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; kind: string; count: number; goldSpent: number; designed: number }>();
    const total = items.reduce((sum, item) => sum + item.count, 0);
    for (const item of items) {
      const key = boxId === "all" ? `${item.name}:${item.kind}` : item.rewardId;
      const current = map.get(key) ?? {
        name: item.name,
        kind: item.kind,
        count: 0,
        goldSpent: 0,
        designed: item.designedProbability,
      };
      current.count += item.count;
      current.goldSpent += item.goldSpent;
      map.set(key, current);
    }
    return [...map.values()]
      .map((item) => ({
        ...item,
        actual: total > 0 ? (item.count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [items, boxId]);

  const slices: AnalyticsPieSlice[] = grouped.map((item, index) => ({
    id: `${item.name}-${item.kind}-${index}`,
    label: item.name,
    value: item.count,
    color: PIE_COLORS[index % PIE_COLORS.length],
  }));

  const pullCount = items.reduce((sum, item) => sum + item.count, 0);
  const goldSpent = items.reduce((sum, item) => sum + item.goldSpent, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          실제로 뽑힌 횟수를 아이템 이름별로 원 그래프로 봅니다. 상자를 고르면 설정 확률과 실제 확률을 같이 비교합니다.
        </p>
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
          <select
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-800"
            value={boxId}
            onChange={(event) => setBoxId(event.target.value)}
          >
            <option value="all">전체 상자</option>
            {(summary?.boxes ?? []).map((box) => (
              <option key={box.id} value={box.id}>
                {box.name} ({box.pullCount.toLocaleString("ko-KR")})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">확률형 아이템 분석을 불러오는 중...</p>
      ) : summary ? (
        <>
          <AdminCollapsibleSection
            title="뽑기 횟수"
            description="선택한 기간·상자의 실제 뽑기 횟수와 사용된 골드입니다."
          >
            <p className="text-3xl font-semibold text-gray-900">{pullCount.toLocaleString("ko-KR")}회</p>
            <p className="mt-1 text-sm text-gray-500">
              {summary.periodLabel} · 사용 골드 {goldSpent.toLocaleString("ko-KR")}
            </p>
          </AdminCollapsibleSection>

          <AdminCollapsibleSection
            title="아이템별 실제 확률"
            description="아이템 이름 기준으로 실제로 나온 비율입니다."
          >
            <AnalyticsPieChart slices={slices} unit="회" />
          </AdminCollapsibleSection>

          <AdminCollapsibleSection
            title="아이템 이름"
            description={
              boxId === "all"
                ? "전체 상자 합산입니다. 설정 확률은 상자를 고르면 비교됩니다."
                : "설정 확률은 관리자에 넣은 가중치 비율입니다."
            }
          >
            {grouped.length === 0 ? (
              <p className="text-sm text-gray-500">이 기간 뽑기 기록이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {grouped.map((item) => (
                  <li key={`${item.name}-${item.kind}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
                    <span className="text-gray-800">
                      {item.name}
                      <span className="ml-2 text-xs text-gray-400">{gachaKindLabel(item.kind)}</span>
                    </span>
                    <span className="font-medium text-gray-900">
                      {item.count.toLocaleString("ko-KR")}회 · 실제 {item.actual.toFixed(1)}%
                      {boxId !== "all" ? ` · 설정 ${item.designed.toFixed(1)}%` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AdminCollapsibleSection>
        </>
      ) : (
        <p className="text-sm text-gray-500">확률형 아이템 분석을 불러오지 못했습니다.</p>
      )}
    </div>
  );
}
