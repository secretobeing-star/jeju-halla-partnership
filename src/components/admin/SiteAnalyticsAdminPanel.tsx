"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import AnalyticsMiniChart from "@/components/admin/AnalyticsMiniChart";
import { adminApiFetch } from "@/lib/admin-api";
import {
  analyticsMonthOptions,
  currentAnalyticsMonth,
  type SiteAnalyticsPeriod,
  type SiteAnalyticsSummary,
} from "@/lib/site-analytics";

type SiteAnalyticsAdminPanelProps = {
  onMessage: (message: string) => void;
};

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

export default function SiteAnalyticsAdminPanel({ onMessage }: SiteAnalyticsAdminPanelProps) {
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
        onMessage(error instanceof Error ? error.message : "사이트 분석을 불러오지 못했습니다.");
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          월별을 고르면 해당 달을 하루씩 볼 수 있습니다. 관리자 화면은 집계하지 않습니다.
        </p>
        {periodToggle}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">분석 데이터를 불러오는 중...</p>
      ) : summary ? (
        <>
          <AdminCollapsibleSection
            title="사이트 이용률"
            description="본페이지 조회 수입니다."
          >
            <p className="text-3xl font-semibold text-gray-900">{formatCount(summary.pageViews)}</p>
            <p className="mt-1 text-sm text-gray-500">
              {summary.periodLabel} · {summary.averageLabel} {formatCount(summary.pageViewsPerDay)}회
            </p>
            <AnalyticsMiniChart daily={summary.daily} value={(item) => item.page_view} color="#059669" metric="페이지 조회" />
          </AdminCollapsibleSection>

          <AdminCollapsibleSection
            title="시즌패스 · 도장 이벤트 참여"
            description="시즌패스는 출석·제휴 방문·보상 수령마다, 도장 이벤트는 도장을 찍는 데 성공할 때마다 집계합니다. 비율은 사이트 조회 대비입니다."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">시즌패스 참여</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCount(summary.seasonPassJoins)}</p>
                <p className="mt-1 text-xs text-gray-500">전체 대비 {summary.seasonPassRate}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">도장 이벤트 참여</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCount(summary.stampJoins)}</p>
                <p className="mt-1 text-xs text-gray-500">전체 대비 {summary.stampRate}%</p>
              </div>
            </div>
            <p className="mt-4 text-xs font-medium text-gray-500">시즌패스</p>
            <AnalyticsMiniChart
              className="mt-1"
              daily={summary.daily}
              value={(item) => item.season_pass_join}
              color="#c2410c"
              metric="시즌패스 참여"
            />
            <p className="mt-3 text-xs font-medium text-gray-500">도장 이벤트</p>
            <AnalyticsMiniChart
              className="mt-1"
              daily={summary.daily}
              value={(item) => item.stamp_join}
              color="#0f766e"
              metric="도장 참여"
            />
          </AdminCollapsibleSection>

          <AdminCollapsibleSection
            title="PWA 앱 이용률"
            description="홈 화면·앱으로 연 조회입니다. 브라우저로 연 조회와 비교한 비율입니다."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">앱 조회</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCount(summary.pwaViews)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">전체 대비</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.pwaRate}%</p>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {summary.periodLabel} · 브라우저 조회 {formatCount(Math.max(0, summary.pageViews - summary.pwaViews))}회
            </p>
            <AnalyticsMiniChart daily={summary.daily} value={(item) => item.pwa_view} color="#2563eb" metric="PWA 앱 조회" />
          </AdminCollapsibleSection>

          <AdminCollapsibleSection
            title="링크 공유"
            description="푸터 링크 공유·복사와 SNS 유입입니다."
          >
            <p className="text-3xl font-semibold text-gray-900">{formatCount(summary.linkShares)}</p>
            <p className="mt-1 text-sm text-gray-500">{summary.periodLabel} 공유·유입</p>
            <AnalyticsMiniChart daily={summary.daily} value={(item) => item.link_share} color="#0ea5e9" metric="링크 공유" />
          </AdminCollapsibleSection>

          <AdminCollapsibleSection
            title="게시판 열람"
            description="게시글을 열어 본 횟수입니다."
          >
            <p className="text-3xl font-semibold text-gray-900">{formatCount(summary.boardViews)}</p>
            <p className="mt-1 text-sm text-gray-500">{summary.periodLabel}</p>
            <AnalyticsMiniChart
              daily={summary.daily}
              value={(item) => item.board_view}
              color="#d97706"
              metric="게시판 열람"
            />
          </AdminCollapsibleSection>

          <AdminCollapsibleSection
            title="게시판 작성"
            description="게시글이 등록된 횟수입니다."
          >
            <p className="text-3xl font-semibold text-gray-900">{formatCount(summary.boardWrites)}</p>
            <p className="mt-1 text-sm text-gray-500">{summary.periodLabel}</p>
            <AnalyticsMiniChart
              daily={summary.daily}
              value={(item) => item.board_write}
              color="#b45309"
              metric="게시판 작성"
            />
          </AdminCollapsibleSection>

          <AdminCollapsibleSection
            title="게시판 댓글"
            description="댓글·답글이 등록된 횟수입니다."
          >
            <p className="text-3xl font-semibold text-gray-900">{formatCount(summary.boardComments)}</p>
            <p className="mt-1 text-sm text-gray-500">{summary.periodLabel}</p>
            <AnalyticsMiniChart
              daily={summary.daily}
              value={(item) => item.board_comment}
              color="#92400e"
              metric="게시판 댓글"
            />
          </AdminCollapsibleSection>

          <AdminCollapsibleSection
            title="AI 챗봇"
            description="열기는 말풍선 버튼을 누른 횟수입니다. 말은 보내기·더보기로 답이 나온 횟수입니다. 말한 단어는 「AI 챗봇 단어 분석」에서 봅니다."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">열기</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCount(summary.chatbotOpens)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">말</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {formatCount(summary.chatbotMessages)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs font-medium text-gray-500">열기</p>
            <AnalyticsMiniChart
              className="mt-1"
              daily={summary.daily}
              value={(item) => item.chatbot_open}
              color="#7c3aed"
              metric="챗봇 열기"
            />
            <p className="mt-3 text-xs font-medium text-gray-500">말</p>
            <AnalyticsMiniChart
              className="mt-1"
              daily={summary.daily}
              value={(item) => item.chatbot_message}
              color="#db2777"
              metric="챗봇 말"
            />
          </AdminCollapsibleSection>
        </>
      ) : (
        <p className="text-sm text-gray-500">분석 데이터를 불러오지 못했습니다.</p>
      )}
    </div>
  );
}
