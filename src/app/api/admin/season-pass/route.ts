import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/admin-auth-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { SEASON_PASS_ITEM_TYPES, asSeasonPassQuestType, type SeasonPassItemType } from "@/lib/season-pass";

export const maxDuration = 60;

function asItemType(value: unknown): SeasonPassItemType {
  return SEASON_PASS_ITEM_TYPES.includes(value as SeasonPassItemType)
    ? (value as SeasonPassItemType)
    : "costume";
}

async function rowsOrEmpty(
  query: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
) {
  try {
    const { data, error } = await query;
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    void promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
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

  try {
    let seasonsQuery = await admin
      .from("seasons")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (seasonsQuery.error) {
      seasonsQuery = await admin.from("seasons").select("*").order("sort_order", { ascending: true });
    }

    if (seasonsQuery.error) {
      const message = seasonsQuery.error.message;
      return NextResponse.json(
        {
          error: message.includes("does not exist")
            ? "시즌패스 테이블이 없습니다. supabase/season-pass.sql 을 실행해 주세요."
            : message,
        },
        { status: 500 },
      );
    }

    const [items, levels, quests, shopItems] = await withTimeout(
      Promise.all([
        rowsOrEmpty(admin.from("reward_items").select("*").order("sort_order", { ascending: true })),
        rowsOrEmpty(admin.from("season_pass_levels").select("*").order("level", { ascending: true })),
        rowsOrEmpty(admin.from("quests").select("*").order("sort_order", { ascending: true }).limit(500)),
        rowsOrEmpty(admin.from("gold_shop_items").select("*").order("sort_order", { ascending: true })),
      ]),
      8_000,
      [[], [], [], []] as [unknown[], unknown[], unknown[], unknown[]],
    );

    return NextResponse.json({
      seasons: seasonsQuery.data ?? [],
      items,
      levels,
      quests,
      shopItems,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "시즌패스를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
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
  const entity = String(body.entity ?? "");

  try {
    if (entity === "season") {
      const { data, error } = await admin
        .from("seasons")
        .insert({
          code: String(body.code ?? "").trim() || `season-${Date.now()}`,
          title: String(body.title ?? "").trim() || "새 시즌",
          starts_at: body.starts_at ? String(body.starts_at) : null,
          ends_at: body.ends_at ? String(body.ends_at) : null,
          is_active: Boolean(body.is_active),
          bg_image_url: String(body.bg_image_url ?? "").trim() || null,
          ui_image_url: String(body.ui_image_url ?? "").trim() || null,
          track_image_url: String(body.track_image_url ?? "").trim() || null,
          premium_badge_url: String(body.premium_badge_url ?? "").trim() || null,
          free_pass_image_url: String(body.free_pass_image_url ?? "").trim() || null,
          premium_pass_image_url: String(body.premium_pass_image_url ?? "").trim() || null,
          exp_per_level: Math.max(1, Number(body.exp_per_level) || 1000),
          visit_exp: Math.max(0, Number(body.visit_exp) || 0),
          visit_gold: Math.max(0, Number(body.visit_gold) || 0),
          attendance_exp: Math.max(0, Number(body.attendance_exp) || 50),
          attendance_gold: Math.max(0, Number(body.attendance_gold) || 5),
          premium_gold_price: Math.max(0, Number(body.premium_gold_price) || 0),
          gold_shop_enabled: body.gold_shop_enabled !== false,
          sort_order: Number(body.sort_order) || 0,
        })
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ season: data });
    }

    if (entity === "item") {
      const { data, error } = await admin
        .from("reward_items")
        .insert({
          name: String(body.name ?? "").trim() || "새 아이템",
          item_type: asItemType(body.item_type),
          image_url: String(body.image_url ?? "").trim() || null,
          metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
          is_active: body.is_active !== false,
          sort_order: Number(body.sort_order) || 0,
        })
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ item: data });
    }

    if (entity === "level") {
      const { data, error } = await admin
        .from("season_pass_levels")
        .insert({
          season_id: String(body.season_id ?? ""),
          level: Math.max(1, Number(body.level) || 1),
          required_exp: Math.max(0, Number(body.required_exp) || 0),
          free_reward_item_id: String(body.free_reward_item_id ?? "").trim() || null,
          premium_reward_item_id: String(body.premium_reward_item_id ?? "").trim() || null,
        })
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ level: data });
    }

    if (entity === "quest") {
      const payload = {
        season_id: String(body.season_id ?? ""),
        title: String(body.title ?? "").trim() || (asSeasonPassQuestType(body.quest_type) === "attendance" ? "출석 체크" : "제휴 방문"),
        description: String(body.description ?? "").trim(),
        quest_type: asSeasonPassQuestType(body.quest_type),
        target_count: Math.max(1, Number(body.target_count) || 1),
        reward_exp: Math.max(0, Number(body.reward_exp) || 0),
        reward_gold: Math.max(0, Number(body.reward_gold) || 0),
        is_active: body.is_active !== false,
        sort_order: Number(body.sort_order) || 0,
      };
      let inserted = await admin.from("quests").insert(payload).select("*").maybeSingle();
      if (inserted.error?.message.includes("description")) {
        const { description: _description, ...withoutDescription } = payload;
        inserted = await admin.from("quests").insert(withoutDescription).select("*").maybeSingle();
      }
      if (inserted.error) throw inserted.error;
      return NextResponse.json({ quest: inserted.data });
    }

    if (entity === "shop_item") {
      const seasonId = String(body.season_id ?? "").trim();
      if (!seasonId) {
        return NextResponse.json({ error: "시즌이 필요합니다." }, { status: 400 });
      }
      const payload = {
          season_id: seasonId,
          reward_item_id: String(body.reward_item_id ?? "").trim() || null,
          name: String(body.name ?? "").trim() || "새 상품",
          price_gold: Math.max(0, Number(body.price_gold) || 0),
          original_price_gold: Math.max(0, Number(body.original_price_gold) || 0),
          badge_label: String(body.badge_label ?? "").trim(),
          stock: body.stock === "" || body.stock == null ? null : Math.max(0, Number(body.stock) || 0),
          per_user_limit: Math.max(0, Number(body.per_user_limit) || 1),
          is_active: body.is_active !== false,
          sort_order: Number(body.sort_order) || 0,
        };
      let inserted = await admin.from("gold_shop_items").insert(payload).select("*").maybeSingle();
      if (
        inserted.error &&
        (inserted.error.message.includes("original_price_gold") || inserted.error.message.includes("badge_label"))
      ) {
        const { original_price_gold: _original, badge_label: _badge, ...withoutPromo } = payload;
        inserted = await admin.from("gold_shop_items").insert(withoutPromo).select("*").maybeSingle();
      }
      if (inserted.error) {
        throw new Error(
          inserted.error.message.includes("gold_shop_items")
            ? "골드 상점 테이블이 없습니다. supabase/season-pass.sql 을 실행해 주세요."
            : inserted.error.message,
        );
      }
      return NextResponse.json({ shopItem: inserted.data });
    }

    if (entity === "premium") {
      const userId = String(body.userId ?? body.studentId ?? "").trim();
      const seasonId = String(body.season_id ?? "").trim();
      if (!userId || !seasonId) {
        return NextResponse.json({ error: "학번과 시즌이 필요합니다." }, { status: 400 });
      }
      const { data: existing } = await admin
        .from("user_season_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("season_id", seasonId)
        .maybeSingle();
      const { error } = await admin.from("user_season_progress").upsert(
        {
          user_id: userId,
          season_id: seasonId,
          level: Number(existing?.level) || 1,
          exp: Number(existing?.exp) || 0,
          gold: Number(existing?.gold) || 0,
          is_premium: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,season_id" },
      );
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "알 수 없는 entity 입니다." }, { status: 400 });
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
  const entity = String(body.entity ?? "");
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  try {
    if (entity === "season") {
      if (body.is_active === true) {
        await admin.from("seasons").update({ is_active: false }).neq("id", id);
      }
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const key of [
        "code",
        "title",
        "starts_at",
        "ends_at",
        "is_active",
        "bg_image_url",
        "ui_image_url",
        "track_image_url",
        "premium_badge_url",
        "free_pass_image_url",
        "premium_pass_image_url",
        "gold_icon_url",
        "claimed_check_image_url",
        "exp_per_level",
        "visit_exp",
        "visit_gold",
        "attendance_exp",
        "attendance_gold",
        "premium_gold_price",
        "gold_shop_enabled",
        "sort_order",
      ]) {
        if (body[key] !== undefined) {
          patch[key] = key === "gold_shop_enabled" ? Boolean(body[key]) : body[key];
        }
      }
      const { error } = await admin.from("seasons").update(patch).eq("id", id);
      if (error) {
        const missing =
          error.message.includes("gold_icon_url") || error.message.includes("claimed_check_image_url");
        if (missing) {
          delete patch.gold_icon_url;
          delete patch.claimed_check_image_url;
          const retry = await admin.from("seasons").update(patch).eq("id", id);
          if (retry.error) throw retry.error;
        } else {
          throw error;
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (entity === "item") {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.name !== undefined) patch.name = body.name;
      if (body.item_type !== undefined) patch.item_type = asItemType(body.item_type);
      if (body.image_url !== undefined) patch.image_url = body.image_url;
      if (body.metadata !== undefined) patch.metadata = body.metadata;
      if (body.is_active !== undefined) patch.is_active = body.is_active;
      if (body.sort_order !== undefined) patch.sort_order = body.sort_order;
      const { error } = await admin.from("reward_items").update(patch).eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (entity === "level") {
      const patch: Record<string, unknown> = {};
      if (body.level !== undefined) patch.level = Number(body.level);
      if (body.required_exp !== undefined) patch.required_exp = Number(body.required_exp);
      if (body.free_reward_item_id !== undefined) {
        patch.free_reward_item_id = String(body.free_reward_item_id || "").trim() || null;
      }
      if (body.premium_reward_item_id !== undefined) {
        patch.premium_reward_item_id = String(body.premium_reward_item_id || "").trim() || null;
      }
      const { error } = await admin.from("season_pass_levels").update(patch).eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (entity === "quest") {
      const patch: Record<string, unknown> = {};
      if (body.title !== undefined) patch.title = body.title;
      if (body.description !== undefined) patch.description = String(body.description ?? "").trim();
      if (body.quest_type !== undefined) patch.quest_type = asSeasonPassQuestType(body.quest_type);
      if (body.target_count !== undefined) patch.target_count = Number(body.target_count);
      if (body.reward_exp !== undefined) patch.reward_exp = Number(body.reward_exp);
      if (body.reward_gold !== undefined) patch.reward_gold = Number(body.reward_gold);
      if (body.is_active !== undefined) patch.is_active = body.is_active;
      const { error } = await admin.from("quests").update(patch).eq("id", id);
      if (error) {
        if (error.message.includes("description")) {
          delete patch.description;
          const retry = await admin.from("quests").update(patch).eq("id", id);
          if (retry.error) throw retry.error;
        } else {
          throw error;
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (entity === "shop_item") {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.name !== undefined) patch.name = String(body.name ?? "").trim() || "새 상품";
      if (body.reward_item_id !== undefined) {
        patch.reward_item_id = String(body.reward_item_id || "").trim() || null;
      }
      if (body.price_gold !== undefined) patch.price_gold = Math.max(0, Number(body.price_gold) || 0);
      if (body.original_price_gold !== undefined) {
        patch.original_price_gold = Math.max(0, Number(body.original_price_gold) || 0);
      }
      if (body.badge_label !== undefined) patch.badge_label = String(body.badge_label ?? "").trim();
      if (body.stock !== undefined) {
        patch.stock = body.stock === "" || body.stock == null ? null : Math.max(0, Number(body.stock) || 0);
      }
      if (body.per_user_limit !== undefined) patch.per_user_limit = Math.max(0, Number(body.per_user_limit) || 0);
      if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active);
      if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order) || 0;
      const { error } = await admin.from("gold_shop_items").update(patch).eq("id", id);
      if (error) {
        if (error.message.includes("original_price_gold") || error.message.includes("badge_label")) {
          delete patch.original_price_gold;
          delete patch.badge_label;
          const retry = await admin.from("gold_shop_items").update(patch).eq("id", id);
          if (retry.error) throw retry.error;
        } else {
          throw error;
        }
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "알 수 없는 entity 입니다." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "수정에 실패했습니다." },
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

  const entity = request.nextUrl.searchParams.get("entity")?.trim() || "";
  const id = request.nextUrl.searchParams.get("id")?.trim() || "";
  if (!entity || !id) {
    return NextResponse.json({ error: "entity, id가 필요합니다." }, { status: 400 });
  }

  const table =
    entity === "season"
      ? "seasons"
      : entity === "item"
        ? "reward_items"
        : entity === "level"
          ? "season_pass_levels"
          : entity === "quest"
            ? "quests"
            : entity === "shop_item"
              ? "gold_shop_items"
              : null;
  if (!table) {
    return NextResponse.json({ error: "알 수 없는 entity 입니다." }, { status: 400 });
  }

  const { error } = await admin.from(table).delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
