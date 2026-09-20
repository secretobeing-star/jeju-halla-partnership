import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/admin-auth-guard";
import {
  asGoldLedgerSource,
  emptyGoldDaily,
  emptyGoldSources,
  type GoldAnalyticsDaily,
  type GoldAnalyticsSummary,
  type GoldLedgerSource,
} from "@/lib/gold-analytics";
import {
  analyticsRangeForPeriod,
  asAnalyticsPeriod,
  kstYmd,
  parseAnalyticsMonth,
} from "@/lib/site-analytics";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdmin>>;

function applyAmount(
  dailyMap: Map<string, GoldAnalyticsDaily>,
  sources: ReturnType<typeof emptyGoldSources>,
  totals: { gained: number; spent: number },
  at: string,
  amount: number,
  source: GoldLedgerSource,
) {
  const bucket = dailyMap.get(kstYmd(new Date(at)));
  if (!bucket || amount === 0) return;
  const row = sources.find((item) => item.source === source);
  if (amount > 0) {
    bucket.gained += amount;
    totals.gained += amount;
    if (row) row.gained += amount;
    return;
  }
  const spent = Math.abs(amount);
  bucket.spent += spent;
  totals.spent += spent;
  if (row) row.spent += spent;
}

async function loadInRange(
  admin: AdminClient,
  table: string,
  columns: string,
  timeColumn: string,
  from: string,
  until: string | null,
) {
  let query = admin.from(table).select(columns).gte(timeColumn, from).limit(40000);
  if (until) query = query.lt(timeColumn, until);
  return query;
}

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
  const dailyMap = new Map<string, GoldAnalyticsDaily>();
  for (const key of range.keys) dailyMap.set(key, emptyGoldDaily(key));
  const sources = emptyGoldSources();
  const totals = { gained: 0, spent: 0 };
  const usedSources = new Set<GoldLedgerSource>();

  const ledgerQuery = await loadInRange(
    admin,
    "gold_ledger",
    "amount, source, created_at",
    "created_at",
    range.from,
    range.until,
  );

  if (ledgerQuery.error && !String(ledgerQuery.error.message).includes("gold_ledger")) {
    return NextResponse.json({ error: ledgerQuery.error.message }, { status: 500 });
  }

  for (const row of (ledgerQuery.data ?? []) as Array<{ amount?: number; source?: string; created_at?: string }>) {
    const source = asGoldLedgerSource(String(row.source ?? ""));
    if (!source || !row.created_at) continue;
    usedSources.add(source);
    applyAmount(dailyMap, sources, totals, row.created_at, Number(row.amount) || 0, source);
  }

  if (!usedSources.has("shop_spend")) {
    const purchases = await loadInRange(
      admin,
      "gold_shop_purchases",
      "gold_spent, created_at",
      "created_at",
      range.from,
      range.until,
    );
    for (const row of (purchases.data ?? []) as Array<{ gold_spent?: number; created_at?: string }>) {
      if (!row.created_at) continue;
      applyAmount(dailyMap, sources, totals, row.created_at, -(Number(row.gold_spent) || 0), "shop_spend");
    }
  }

  if (!usedSources.has("attendance") || !usedSources.has("visit")) {
    const { data: seasonRows } = await admin.from("seasons").select("id, attendance_gold, visit_gold");
    const goldBySeason = new Map(
      ((seasonRows ?? []) as Array<{ id?: string; attendance_gold?: number; visit_gold?: number }>).map((row) => [
        String(row.id ?? ""),
        {
          attendance: Math.max(0, Number(row.attendance_gold) || 0),
          visit: Math.max(0, Number(row.visit_gold) || 0),
        },
      ]),
    );

    if (!usedSources.has("attendance")) {
      const logs = await loadInRange(
        admin,
        "season_attendance_logs",
        "season_id, created_at",
        "created_at",
        range.from,
        range.until,
      );
      for (const row of (logs.data ?? []) as Array<{ season_id?: string; created_at?: string }>) {
        if (!row.created_at) continue;
        applyAmount(
          dailyMap,
          sources,
          totals,
          row.created_at,
          goldBySeason.get(String(row.season_id ?? ""))?.attendance ?? 0,
          "attendance",
        );
      }
    }

    if (!usedSources.has("visit")) {
      const logs = await loadInRange(
        admin,
        "season_visit_logs",
        "season_id, visited_at",
        "visited_at",
        range.from,
        range.until,
      );
      for (const row of (logs.data ?? []) as Array<{ season_id?: string; visited_at?: string }>) {
        if (!row.visited_at) continue;
        applyAmount(
          dailyMap,
          sources,
          totals,
          row.visited_at,
          goldBySeason.get(String(row.season_id ?? ""))?.visit ?? 0,
          "visit",
        );
      }
    }
  }

  const summary: GoldAnalyticsSummary = {
    periodLabel: range.periodLabel,
    averageLabel: range.averageLabel,
    gained: totals.gained,
    spent: totals.spent,
    net: totals.gained - totals.spent,
    daily: [...dailyMap.values()],
    sources: sources.filter((item) => item.gained > 0 || item.spent > 0),
  };

  return NextResponse.json({ summary });
}
