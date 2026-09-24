import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/admin-auth-guard";
import {
  asGachaRewardKind,
  mapGachaBox,
  mapGachaReward,
} from "@/lib/gold-shop-gacha";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

function missingTable(error: { message?: string } | null) {
  const message = error?.message ?? "";
  return message.includes("gold_shop_gacha") && (message.includes("does not exist") || message.includes("schema"));
}

export async function GET(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "partners");
  if ("error" in auth) {
    return auth.error;
  }
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const { data: boxes, error } = await admin
    .from("gold_shop_gacha_boxes")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      {
        error: missingTable(error)
          ? "확률성 아이템 테이블이 없습니다. supabase/gold-shop-gacha.sql 을 실행해 주세요."
          : error.message,
        boxes: [],
        rewards: [],
      },
      { status: missingTable(error) ? 200 : 500 },
    );
  }

  const mappedBoxes = (boxes ?? []).map((row) => mapGachaBox(row as Record<string, unknown>));
  const ids = mappedBoxes.map((box) => box.id);
  const { data: rewards } =
    ids.length > 0
      ? await admin
          .from("gold_shop_gacha_rewards")
          .select("*")
          .in("box_id", ids)
          .order("sort_order", { ascending: true })
      : { data: [] };

  return NextResponse.json({
    boxes: mappedBoxes.map((box) => ({
      ...box,
      rewards: (rewards ?? [])
        .map((row) => mapGachaReward(row as Record<string, unknown>))
        .filter((item) => item.box_id === box.id),
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "partners");
  if ("error" in auth) {
    return auth.error;
  }
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const entity = String(body.entity ?? "box");

  try {
    if (entity === "box") {
      const payload = {
        season_id: String(body.season_id ?? "").trim() || null,
        name: String(body.name ?? "").trim() || "확률 상자",
        price_gold: Math.max(0, Number(body.price_gold) || 0),
        original_price_gold: Math.max(0, Number(body.original_price_gold) || 0),
        badge_label: String(body.badge_label ?? "").trim(),
        fx_enabled: body.fx_enabled !== false,
        idle_image_url: String(body.idle_image_url ?? "").trim() || null,
        burst_image_url: String(body.burst_image_url ?? "").trim() || null,
        open_place: body.open_place === "inventory" ? "inventory" : "shop",
        layout_count: Math.max(1, Math.min(20, Math.floor(Number(body.layout_count) || 1))),
        confirm_popup: body.confirm_popup !== false,
        is_active: body.is_active !== false,
        sort_order: Number(body.sort_order) || 0,
      };
      const inserted = await admin.from("gold_shop_gacha_boxes").insert(payload).select("*").maybeSingle();
      if (inserted.error) {
        const retryPayload = { ...payload };
        delete retryPayload.open_place;
        delete retryPayload.layout_count;
        delete retryPayload.confirm_popup;
        const retry = await admin.from("gold_shop_gacha_boxes").insert(retryPayload).select("*").maybeSingle();
        if (retry.error) {
          throw new Error(
            missingTable(retry.error)
              ? "확률성 아이템 테이블이 없습니다. supabase/gold-shop-gacha.sql 을 실행해 주세요."
              : retry.error.message,
          );
        }
        return NextResponse.json({ box: mapGachaBox((retry.data ?? {}) as Record<string, unknown>, []) });
      }
      return NextResponse.json({ box: mapGachaBox((inserted.data ?? {}) as Record<string, unknown>, []) });
    }

    const boxId = String(body.box_id ?? "").trim();
    if (!boxId) {
      return NextResponse.json({ error: "상자가 필요합니다." }, { status: 400 });
    }
    const { data, error } = await admin
      .from("gold_shop_gacha_rewards")
      .insert({
        box_id: boxId,
        kind: asGachaRewardKind(body.kind),
        name: String(body.name ?? "").trim() || "보상",
        probability: Math.max(0, Number(body.probability) || 0),
        gold_amount: Math.max(0, Number(body.gold_amount) || 0),
        frame_id: String(body.frame_id ?? "").trim() || null,
        coupon_code: String(body.coupon_code ?? "").trim() || null,
        image_url: String(body.image_url ?? "").trim() || null,
        is_active: body.is_active !== false,
        sort_order: Number(body.sort_order) || 0,
      })
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ reward: mapGachaReward((data ?? {}) as Record<string, unknown>) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "저장에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "partners");
  if ("error" in auth) {
    return auth.error;
  }
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const entity = String(body.entity ?? "box");
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  try {
    if (entity === "box") {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const key of [
        "name",
        "price_gold",
        "original_price_gold",
        "badge_label",
        "fx_enabled",
        "idle_image_url",
        "burst_image_url",
        "open_place",
        "layout_count",
        "confirm_popup",
        "is_active",
        "sort_order",
        "season_id",
      ]) {
        if (body[key] !== undefined) {
          if (key === "fx_enabled" || key === "is_active" || key === "confirm_popup") {
            patch[key] = Boolean(body[key]);
          } else if (key === "price_gold" || key === "original_price_gold" || key === "sort_order") {
            patch[key] = Math.max(0, Number(body[key]) || 0);
          } else if (key === "layout_count") {
            patch[key] = Math.max(1, Math.min(20, Math.floor(Number(body[key]) || 1)));
          } else if (key === "open_place") {
            patch[key] = body[key] === "inventory" ? "inventory" : "shop";
          } else {
            const value = String(body[key] ?? "").trim();
            patch[key] = value || (key === "name" ? "확률 상자" : null);
          }
        }
      }
      const { error } = await admin.from("gold_shop_gacha_boxes").update(patch).eq("id", id);
      if (error) {
        delete patch.open_place;
        delete patch.layout_count;
        delete patch.confirm_popup;
        const retry = await admin.from("gold_shop_gacha_boxes").update(patch).eq("id", id);
        if (retry.error) throw retry.error;
      }
      return NextResponse.json({ ok: true });
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.kind !== undefined) patch.kind = asGachaRewardKind(body.kind);
    if (body.name !== undefined) patch.name = String(body.name ?? "").trim() || "보상";
    if (body.probability !== undefined) patch.probability = Math.max(0, Number(body.probability) || 0);
    if (body.gold_amount !== undefined) patch.gold_amount = Math.max(0, Number(body.gold_amount) || 0);
    if (body.frame_id !== undefined) patch.frame_id = String(body.frame_id ?? "").trim() || null;
    if (body.coupon_code !== undefined) patch.coupon_code = String(body.coupon_code ?? "").trim() || null;
    if (body.image_url !== undefined) patch.image_url = String(body.image_url ?? "").trim() || null;
    if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active);
    if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order) || 0;
    const { error } = await admin.from("gold_shop_gacha_rewards").update(patch).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "저장에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "partners");
  if ("error" in auth) {
    return auth.error;
  }
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }
  const url = new URL(request.url);
  const entity = url.searchParams.get("entity") || "box";
  const id = url.searchParams.get("id")?.trim() || "";
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }
  const table = entity === "reward" ? "gold_shop_gacha_rewards" : "gold_shop_gacha_boxes";
  const { error } = await admin.from(table).delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
