import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/admin-auth-guard";
import {
  analyticsRangeForPeriod,
  asAnalyticsPeriod,
  emptyDaily,
  kstYmd,
  parseAnalyticsMonth,
  type SiteAnalyticsDaily,
  type SiteAnalyticsSummary,
} from "@/lib/site-analytics";
import { aggregateChatbotWords } from "@/lib/chatbot-word-analytics";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) return auth.error;

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const month = parseAnalyticsMonth(request.nextUrl.searchParams.get("month"));
  const period = asAnalyticsPeriod(request.nextUrl.searchParams.get("days"), month);
  const range = analyticsRangeForPeriod(period, month);
  let query = admin
    .from("site_analytics_events")
    .select("event_type, created_at, path")
    .gte("created_at", range.from)
    .order("created_at", { ascending: true })
    .limit(80000);
  if (range.until) {
    query = query.lt("created_at", range.until);
  }
  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("site_analytics_events")
          ? "분석 테이블이 없습니다. Supabase SQL Editor에서 supabase/ai-chatbot.sql 을 실행해 주세요."
          : error.message.includes("event_type")
            ? "분석 이벤트 종류가 오래되었습니다. supabase/ai-chatbot.sql 을 다시 실행해 주세요."
            : error.message,
      },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as { event_type: string; created_at: string; path?: string | null }[];
  const dailyMap = new Map<string, SiteAnalyticsDaily>();
  for (const key of range.keys) {
    dailyMap.set(key, emptyDaily(key));
  }

  let pageViews = 0;
  let pwaViews = 0;
  let linkShares = 0;
  let boardViews = 0;
  let boardWrites = 0;
  let boardComments = 0;
  let chatbotOpens = 0;
  let chatbotMessages = 0;
  let stampJoins = 0;
  let seasonPassJoins = 0;
  const chatbotPaths: string[] = [];

  for (const row of rows) {
    const created = new Date(row.created_at);
    const key = kstYmd(created);
    const bucket = dailyMap.get(key);
    if (!bucket) continue;

    if (row.event_type === "page_view") {
      bucket.page_view += 1;
      pageViews += 1;
    } else if (row.event_type === "pwa_view") {
      bucket.pwa_view += 1;
      pwaViews += 1;
    } else if (row.event_type === "link_share") {
      bucket.link_share += 1;
      linkShares += 1;
    } else if (row.event_type === "board_view") {
      bucket.board_view += 1;
      boardViews += 1;
    } else if (row.event_type === "chatbot_open") {
      bucket.chatbot_open += 1;
      chatbotOpens += 1;
    } else if (row.event_type === "chatbot_message") {
      bucket.chatbot_message += 1;
      chatbotMessages += 1;
      if (row.path) chatbotPaths.push(row.path);
    } else if (row.event_type === "stamp_join") {
      bucket.stamp_join += 1;
      stampJoins += 1;
    }
  }

  async function addJoinRows(
    table: string,
    column: string,
    field: "season_pass_join" | "stamp_join" | "board_comment" | "board_write",
  ) {
    if (!admin) return;
    let extraQuery = admin.from(table).select(column).gte(column, range.from).limit(40000);
    if (range.until) extraQuery = extraQuery.lt(column, range.until);
    const extra = await extraQuery;
    if (extra.error) return;
    for (const row of (extra.data ?? []) as unknown as Record<string, unknown>[]) {
      const raw = row[column];
      if (typeof raw !== "string") continue;
      const bucket = dailyMap.get(kstYmd(new Date(raw)));
      if (!bucket) continue;
      bucket[field] += 1;
      if (field === "season_pass_join") seasonPassJoins += 1;
      else if (field === "stamp_join") stampJoins += 1;
      else if (field === "board_write") boardWrites += 1;
      else boardComments += 1;
    }
  }

  await Promise.all([
    addJoinRows("season_attendance_logs", "created_at", "season_pass_join"),
    addJoinRows("season_visit_logs", "visited_at", "season_pass_join"),
    addJoinRows("reward_claims", "claimed_at", "season_pass_join"),
  ]);

  if (stampJoins === 0) {
    await addJoinRows("user_event_progress", "last_stamped_at", "stamp_join");
  }

  await Promise.all([
    addJoinRows("board_posts", "created_at", "board_write"),
    addJoinRows("board_comments", "created_at", "board_comment"),
  ]);

  const summary: SiteAnalyticsSummary = {
    period,
    periodLabel: range.periodLabel,
    averageLabel: range.averageLabel,
    pageViews,
    pageViewsPerDay: Math.round((pageViews / range.divisor) * 10) / 10,
    pwaViews,
    pwaRate: pageViews > 0 ? Math.round((pwaViews / pageViews) * 1000) / 10 : 0,
    linkShares,
    boardViews,
    boardWrites,
    boardComments,
    chatbotOpens,
    chatbotMessages,
    stampJoins,
    stampRate: pageViews > 0 ? Math.round((stampJoins / pageViews) * 1000) / 10 : 0,
    seasonPassJoins,
    seasonPassRate: pageViews > 0 ? Math.round((seasonPassJoins / pageViews) * 1000) / 10 : 0,
    chatbotWords: aggregateChatbotWords(chatbotPaths),
    daily: [...dailyMap.values()],
  };

  return NextResponse.json({ summary });
}
