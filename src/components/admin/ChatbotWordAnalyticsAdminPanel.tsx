"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { adminApiFetch } from "@/lib/admin-api";
import {
  analyticsMonthOptions,
  currentAnalyticsMonth,
  type SiteAnalyticsPeriod,
  type SiteAnalyticsSummary,
} from "@/lib/site-analytics";

type ChatbotWordAnalyticsAdminPanelProps = {
  onMessage: (message: string) => void;
};

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

export default function ChatbotWordAnalyticsAdminPanel({ onMessage }: ChatbotWordAnalyticsAdminPanelProps) {
  const monthOptions = useMemo(() => analyticsMonthOptions(24), []);
  const [period, setPeriod] = useState<SiteAnalyticsPeriod>("month");
  const [month, setMonth] = useState(currentAnalyticsMonth);
  const [summary, setSummary] = useState<SiteAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(
    async (nextPeriod: SiteAnalyticsPeriod, nextMonth: string) => {
      setLoading(true);
      try {
        const query =
          nextPeriod === "month"
            ? `/api/admin/analytics?days=month&month=${encodeURIComponent(nextMonth)}`
            : `/api/admin/analytics?days=${nextPeriod}`;
        const payload = (await adminApiFetch(query)) as {
          summary?: SiteAnalyticsSummary;
          error?: string;
        };
        if (payload.error && !payload.summary) {
          throw new Error(payload.error);
        }
        if (payload.summary) setSummary(payload.summary);
      } catch (error) {
        setSummary(null);
        onMessage(error instanceof Error ? error.message : "챗봇 단어 분석을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [onMessage],
  );

  useEffect(() => {
    void loadSummary(period, month);
  }, [loadSummary, period, month]);

  const words = summary?.chatbotWords ?? [];
  const missed = summary?.chatbotMissedWords ?? [];
  const max = words[0]?.count || 1;
  const missedMax = missed[0]?.count || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          외부 AI가 아니라, 지금 사이트 챗봇이 알아듣는 말을 셉니다. 찾지 못했을 때 말한 이름도 따로 모읍니다.
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
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">단어 분석을 불러오는 중...</p>
      ) : summary ? (
        <>
        <AdminCollapsibleSection
          title="챗봇이 알아들은 단어"
          description={`${summary.periodLabel} 동안 챗봇이 쓰는 말(목록, 리스트, 학습 문장 등)이 질문에 나온 횟수입니다. 말 ${formatCount(summary.chatbotMessages)}회.`}
        >
          {words.length === 0 ? (
            <p className="text-sm text-gray-500">아직 챗봇이 알아들은 단어가 없습니다. 챗봇에 말이 쌓이면 여기에 보입니다.</p>
          ) : (
            <ul className="space-y-1.5">
              {words.map((item) => (
                <li key={item.word} className="flex items-center gap-2 text-sm">
                  <span className="w-28 shrink-0 truncate font-medium text-gray-800">{item.word}</span>
                  <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <span
                      className="block h-full rounded-full bg-violet-500"
                      style={{ width: `${Math.max(8, Math.round((item.count / max) * 100))}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right text-xs text-gray-500">{formatCount(item.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCollapsibleSection>
        <AdminCollapsibleSection
          title="찾지 못한 말"
          description="챗봇이 제휴를 찾지 못했을 때 상대가 말한 이름입니다. 학습 문장에 넣을 후보를 모읍니다."
        >
          {missed.length === 0 ? (
            <p className="text-sm text-gray-500">찾지 못한 말이 없습니다.</p>
          ) : (
            <ul className="space-y-1.5">
              {missed.map((item) => (
                <li key={item.word} className="flex items-center gap-2 text-sm">
                  <span className="w-28 shrink-0 truncate font-medium text-gray-800">{item.word}</span>
                  <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <span
                      className="block h-full rounded-full bg-amber-500"
                      style={{ width: `${Math.max(8, Math.round((item.count / missedMax) * 100))}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right text-xs text-gray-500">{formatCount(item.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCollapsibleSection>
        </>
      ) : (
        <p className="text-sm text-gray-500">단어 분석을 불러오지 못했습니다.</p>
      )}
    </div>
  );
}
