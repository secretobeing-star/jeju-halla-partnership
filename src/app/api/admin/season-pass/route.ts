import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { SEASON_PASS_ITEM_TYPES, asSeasonPassQuestType, type SeasonPassItemType } from "@/lib/season-pass";

function asItemType(value: unknown): SeasonPassItemType {
  return SEASON_PASS_ITEM_TYPES.includes(value as SeasonPassItemType)
    ? (value as SeasonPassItemType)
    : "costume";
}

export async function GET(request: NextRequest) {
  const { adminAuthMiddleware } = await import("@/lib/admin-auth-guard");
  const auth = await adminAuthMiddleware(request, "partners");
  if ("error" in auth) {
    return auth.error;
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  try {
    const [seasons, items, levels, quests] = await Promise.all([
      admin.from("seasons").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
      admin.from("reward_items").select("*").order("sort_order", { ascending: true }),
      admin.from("season_pass_levels").select("*").order("level", { ascending: true }),
      admin.from("quests").select("*").order("sort_order", { ascending: true }),
    ]);

    const firstError = seasons.error || items.error || levels.error || quests.error;
    if (firstError) {
      return NextResponse.json(
        {
          error: firstError.message.includes("does not exist")
            ? "시즌패스 테이블이 없습니다. supabase/season-pass.sql 을 실행해 주세요."
            : firstError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      seasons: seasons.data ?? [],
      items: items.data ?? [],
      levels: levels.data ?? [],
      quests: quests.data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "시즌패스를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const { adminAuthMiddleware } = await import("@/lib/admin-auth-guard");
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
          exp_per_level: Math.max(1, Number(body.exp_per_level) || 1000),
          visit_exp: Math.max(0, Number(body.visit_exp) || 0),
          visit_gold: Math.max(0, Number(body.visit_gold) || 0),
          attendance_exp: Math.max(0, Number(body.attendance_exp) || 50),
          attendance_gold: Math.max(0, Number(body.attendance_gold) || 5),
          premium_gold_price: Math.max(0, Number(body.premium_gold_price) || 0),
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
      const { data, error } = await admin
        .from("quests")
        .insert({
          season_id: String(body.season_id ?? ""),
          title: String(body.title ?? "").trim() || (asSeasonPassQuestType(body.quest_type) === "attendance" ? "출석 체크" : "제휴 방문"),
          quest_type: asSeasonPassQuestType(body.quest_type),
          target_count: Math.max(1, Number(body.target_count) || 1),
          reward_exp: Math.max(0, Number(body.reward_exp) || 0),
          reward_gold: Math.max(0, Number(body.reward_gold) || 0),
          is_active: body.is_active !== false,
          sort_order: Number(body.sort_order) || 0,
        })
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ quest: data });
    }

    if (entity === "premium") {
      const userId = String(body.userId ?? body.studentId ?? "").trim();
      const seasonId = String(body.season_id ?? "").trim();
      if (!userId || !seasonId) {
        return NextResponse.json({ error: "학번과 시즌이 필요합니다." }, { status: 400 });
      }
      const { error } = await admin.from("user_season_progress").upsert(
        {
          user_id: userId,
          season_id: seasonId,
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
  const { adminAuthMiddleware } = await import("@/lib/admin-auth-guard");
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
        "exp_per_level",
        "visit_exp",
        "visit_gold",
        "attendance_exp",
        "attendance_gold",
        "premium_gold_price",
        "sort_order",
      ]) {
        if (body[key] !== undefined) {
          patch[key] = body[key];
        }
      }
      const { error } = await admin.from("seasons").update(patch).eq("id", id);
      if (error) throw error;
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
      if (body.quest_type !== undefined) patch.quest_type = asSeasonPassQuestType(body.quest_type);
      if (body.target_count !== undefined) patch.target_count = Number(body.target_count);
      if (body.reward_exp !== undefined) patch.reward_exp = Number(body.reward_exp);
      if (body.reward_gold !== undefined) patch.reward_gold = Number(body.reward_gold);
      if (body.is_active !== undefined) patch.is_active = body.is_active;
      const { error } = await admin.from("quests").update(patch).eq("id", id);
      if (error) throw error;
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
  const { adminAuthMiddleware } = await import("@/lib/admin-auth-guard");
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
