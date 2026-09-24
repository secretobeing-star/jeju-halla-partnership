import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/admin-auth-guard";
import type { GachaAnalyticsItem, GachaAnalyticsKind, GachaAnalyticsSummary } from "@/lib/gacha-analytics";
import { analyticsRangeForPeriod, asAnalyticsPeriod, parseAnalyticsMonth } from "@/lib/site-analytics";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

function asKind(value: unknown): GachaAnalyticsKind {
  return value === "gold" || value === "coupon" ? value : "costume";
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

  const { data: boxRows, error: boxError } = await admin
    .from("gold_shop_gacha_boxes")
    .select("id, name")
    .order("sort_order", { ascending: true });
  if (boxError) {
    return NextResponse.json(
      {
        error: boxError.message.includes("gold_shop_gacha")
          ? "확률성 아이템 테이블이 없습니다. supabase/gold-shop-gacha.sql 을 실행해 주세요."
          : boxError.message,
      },
      { status: boxError.message.includes("gold_shop_gacha") ? 200 : 500 },
    );
  }

  const boxes = ((boxRows ?? []) as Array<{ id?: string; name?: string }>).map((row) => ({
    id: String(row.id ?? ""),
    name: String(row.name ?? "").trim() || "확률 상자",
  }));
  const boxNameById = new Map(boxes.map((box) => [box.id, box.name]));

  const { data: rewardRows } = await admin
    .from("gold_shop_gacha_rewards")
    .select("id, box_id, name, kind, probability");
  const rewards = ((rewardRows ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ""),
    boxId: String(row.box_id ?? ""),
    name: String(row.name ?? "").trim() || "보상",
    kind: asKind(row.kind),
    probability: Math.max(0, Number(row.probability) || 0),
  }));
  const rewardById = new Map(rewards.map((item) => [item.id, item]));
  const designedTotalByBox = new Map<string, number>();
  for (const reward of rewards) {
    designedTotalByBox.set(reward.boxId, (designedTotalByBox.get(reward.boxId) ?? 0) + reward.probability);
  }

  let pullQuery = admin
    .from("gold_shop_gacha_pulls")
    .select("box_id, reward_id, gold_spent, created_at")
    .gte("created_at", range.from)
    .limit(40000);
  if (range.until) {
    pullQuery = pullQuery.lt("created_at", range.until);
  }
  const pulls = await pullQuery;
  if (pulls.error && !String(pulls.error.message).includes("gold_shop_gacha_pulls")) {
    return NextResponse.json({ error: pulls.error.message }, { status: 500 });
  }

  const countByKey = new Map<string, GachaAnalyticsItem>();
  const pullCountByBox = new Map<string, number>();
  let pullCount = 0;
  let goldSpent = 0;

  for (const row of (pulls.data ?? []) as Array<{
    box_id?: string;
    reward_id?: string;
    gold_spent?: number;
    created_at?: string;
  }>) {
    const boxId = String(row.box_id ?? "");
    const reward = rewardById.get(String(row.reward_id ?? ""));
    const name = reward?.name || "삭제된 보상";
    const kind = reward?.kind || "costume";
    const rewardId = reward?.id || String(row.reward_id ?? "unknown");
    const designedTotal = designedTotalByBox.get(boxId) || 0;
    const designedProbability =
      designedTotal > 0 && reward ? (reward.probability / designedTotal) * 100 : 0;
    const key = `${boxId}:${rewardId}`;
    const current = countByKey.get(key) ?? {
      boxId,
      boxName: boxNameById.get(boxId) || "확률 상자",
      rewardId,
      name,
      kind,
      count: 0,
      goldSpent: 0,
      designedProbability,
    };
    current.count += 1;
    current.goldSpent += Math.max(0, Number(row.gold_spent) || 0);
    countByKey.set(key, current);
    pullCountByBox.set(boxId, (pullCountByBox.get(boxId) ?? 0) + 1);
    pullCount += 1;
    goldSpent += Math.max(0, Number(row.gold_spent) || 0);
  }

  const summary: GachaAnalyticsSummary = {
    periodLabel: range.periodLabel,
    pullCount,
    goldSpent,
    boxes: boxes.map((box) => ({
      id: box.id,
      name: box.name,
      pullCount: pullCountByBox.get(box.id) ?? 0,
    })),
    items: [...countByKey.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko")),
  };

  return NextResponse.json({ summary });
}
