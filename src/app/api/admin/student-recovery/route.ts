import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/admin-auth-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  loadStudentCardFrameState,
  revokeStudentCardFrameOnServer,
} from "@/lib/student-card-settings-server";
import {
  findCardFrameByRef,
  loadCardFrameCatalogFromDb,
} from "@/lib/student-card-frames";
import { debitStudentGold, getSeasonPassState } from "@/lib/season-pass-server";
import { bumpPublicReloadAt } from "@/lib/public-reload-server";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdmin>>;

function maybeThrow(error: { message?: string } | null | undefined, hint: string) {
  if (error && !String(error.message).includes(hint)) {
    throw error;
  }
}

async function reclaimAllFrames(studentId: string) {
  const frameState = await loadStudentCardFrameState(studentId).catch(() => null);
  for (const id of frameState?.state.unlockedIds ?? []) {
    await revokeStudentCardFrameOnServer(studentId, id);
  }
}

async function reclaimAllGifts(admin: AdminClient, studentId: string) {
  const { data, error } = await admin.from("user_gifts").select("id, frame_css_value").eq("user_id", studentId);
  maybeThrow(error, "user_gifts");
  const { parseGiftPayload } = await import("@/lib/map-events");
  for (const gift of data ?? []) {
    const parsed = parseGiftPayload({
      frame_css_value: String(gift.frame_css_value ?? ""),
    });
    if (parsed.kind === "costume" && parsed.frameId) {
      await revokeStudentCardFrameOnServer(studentId, parsed.frameId);
    }
  }
  const deleted = await admin.from("user_gifts").delete().eq("user_id", studentId);
  maybeThrow(deleted.error, "user_gifts");
}

async function reclaimAllRewards(admin: AdminClient, studentId: string) {
  const deleted = await admin.from("site_student_rewards").delete().eq("student_id", studentId);
  maybeThrow(deleted.error, "site_student_rewards");
}

async function reclaimAllInventory(admin: AdminClient, studentId: string) {
  const deleted = await admin.from("user_inventory").delete().eq("user_id", studentId);
  maybeThrow(deleted.error, "user_inventory");
}

async function reclaimAllShop(admin: AdminClient, studentId: string) {
  const deleted = await admin.from("gold_shop_purchases").delete().eq("user_id", studentId);
  maybeThrow(deleted.error, "gold_shop_purchases");
}

async function reclaimAllLogin(admin: AdminClient, studentId: string) {
  const deleted = await admin.from("site_login_reward_claims").delete().eq("student_id", studentId);
  maybeThrow(deleted.error, "site_login_reward_claims");
}

async function reclaimAllStamps(admin: AdminClient, studentId: string) {
  const updated = await admin
    .from("user_event_progress")
    .update({
      current_stamps: 0,
      stamped_places: [],
      is_completed: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", studentId);
  maybeThrow(updated.error, "user_event_progress");
}

async function reclaimSeason(admin: AdminClient, studentId: string) {
  const claimError = (await admin.from("reward_claims").delete().eq("user_id", studentId)).error;
  maybeThrow(claimError, "reward_claims");
  const questError = (await admin.from("user_quest_logs").delete().eq("user_id", studentId)).error;
  maybeThrow(questError, "user_quest_logs");
  const attendError = (await admin.from("season_attendance_logs").delete().eq("user_id", studentId)).error;
  maybeThrow(attendError, "season_attendance_logs");
  const progressError = (
    await admin
      .from("user_season_progress")
      .update({
        exp: 0,
        level: 1,
        is_premium: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", studentId)
  ).error;
  maybeThrow(progressError, "user_season_progress");
}

async function reclaimAllGold(studentId: string) {
  const passState = await getSeasonPassState(studentId).catch(() => null);
  const gold = Math.floor(Number(passState?.progress?.gold ?? 0) || 0);
  if (gold > 0) {
    await debitStudentGold(studentId, gold);
  }
}

async function reclaimEverything(admin: AdminClient, studentId: string) {
  await reclaimAllFrames(studentId);
  await reclaimAllGifts(admin, studentId);
  await reclaimAllRewards(admin, studentId);
  await reclaimAllInventory(admin, studentId);
  await reclaimAllShop(admin, studentId);
  await reclaimAllLogin(admin, studentId);
  await reclaimAllStamps(admin, studentId);
  await reclaimSeason(admin, studentId);
  await reclaimAllGold(studentId);
}

export async function GET(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) return auth.error;

  const studentId = new URL(request.url).searchParams.get("studentId")?.trim() ?? "";
  if (!studentId) {
    return NextResponse.json({ error: "학번을 입력해 주세요." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const catalog = await loadCardFrameCatalogFromDb().catch(() => []);
  const frameState = await loadStudentCardFrameState(studentId).catch(() => null);
  const unlockedIds = frameState?.state.unlockedIds ?? [];
  const frames = unlockedIds.map((id) => {
    const frame = findCardFrameByRef(catalog, id);
    return {
      id,
      name: frame?.name ?? id,
      imageUrl: frame?.imageUrl ?? null,
      source: frameState?.state.sources[id] ?? null,
    };
  });

  const [giftsRes, rewardsRes, inventoryRes, progressRes, passState, shopRes, loginRes, claimRes] =
    await Promise.all([
    admin.from("user_gifts").select("*").eq("user_id", studentId).order("created_at", { ascending: false }).limit(80),
    admin
      .from("site_student_rewards")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(80),
    admin.from("user_inventory").select("*").eq("user_id", studentId).order("created_at", { ascending: false }).limit(80),
    admin.from("user_event_progress").select("*").eq("user_id", studentId).order("updated_at", { ascending: false }).limit(40),
    getSeasonPassState(studentId).catch(() => null),
    admin
      .from("gold_shop_purchases")
      .select("id, shop_item_id, gold_spent, created_at")
      .eq("user_id", studentId)
      .order("created_at", { ascending: false })
      .limit(80),
    admin
      .from("site_login_reward_claims")
      .select("claimed_on, gold_amount, costume_frame_id, coupon_code, created_at")
      .eq("student_id", studentId)
      .order("claimed_on", { ascending: false })
      .limit(80),
    admin
      .from("reward_claims")
      .select("id, level, track, claimed_at")
      .eq("user_id", studentId)
      .order("claimed_at", { ascending: false })
      .limit(80),
  ]);

  const eventIds = [...new Set((progressRes.data ?? []).map((row) => String(row.event_id ?? "")).filter(Boolean))];
  const eventsById = new Map<string, { title: string; tab_name: string }>();
  if (eventIds.length > 0) {
    const { data: eventRows } = await admin.from("events").select("id, title, tab_name").in("id", eventIds);
    for (const row of eventRows ?? []) {
      eventsById.set(String(row.id), {
        title: String(row.title ?? ""),
        tab_name: String(row.tab_name ?? ""),
      });
    }
  }

  const events = (progressRes.data ?? []).map((row) => {
    const event = eventsById.get(String(row.event_id));
    return {
      eventId: row.event_id,
      title: event?.title || "이벤트",
      tabName: event?.tab_name || "",
      currentStamps: Number(row.current_stamps) || 0,
      isCompleted: Boolean(row.is_completed),
      stampedPlaces: Array.isArray(row.stamped_places) ? row.stamped_places : [],
      updatedAt: row.updated_at,
    };
  });

  const shopItemIds = [...new Set((shopRes.data ?? []).map((row) => String(row.shop_item_id ?? "")).filter(Boolean))];
  const shopNames = new Map<string, string>();
  if (shopItemIds.length > 0) {
    const { data: shopItems } = await admin.from("gold_shop_items").select("id, name").in("id", shopItemIds);
    for (const row of shopItems ?? []) {
      shopNames.set(String(row.id), String(row.name ?? "상점 상품"));
    }
  }

  return NextResponse.json({
    studentId,
    frames: {
      activeFrameId: frameState?.state.activeFrameId ?? null,
      unlockedCount: frames.length,
      items: frames,
    },
    gifts: giftsRes.data ?? [],
    giftsError: giftsRes.error?.message ?? null,
    rewards: rewardsRes.data ?? [],
    rewardsError: rewardsRes.error?.message ?? null,
    inventory: inventoryRes.data ?? [],
    inventoryError: inventoryRes.error?.message ?? null,
    events,
    eventsError: progressRes.error?.message ?? null,
    shopPurchases: (shopRes.data ?? []).map((row) => ({
      id: String(row.id),
      name: shopNames.get(String(row.shop_item_id)) || "상점 상품",
      goldSpent: Number(row.gold_spent) || 0,
      createdAt: row.created_at,
    })),
    loginClaims: (loginRes.data ?? []).map((row) => ({
      claimedOn: String(row.claimed_on ?? ""),
      goldAmount: Number(row.gold_amount) || 0,
      costumeFrameId: row.costume_frame_id ?? null,
      couponCode: row.coupon_code ?? null,
      createdAt: row.created_at,
    })),
    seasonPass: passState
      ? {
          seasonId: passState.season?.id ?? null,
          seasonTitle: passState.season?.title ?? null,
          passEnabled: passState.passEnabled,
          level: passState.currentLevel,
          exp: passState.currentExp,
          gold: passState.progress?.gold ?? 0,
          isPremium: passState.isPremium,
          claims: (claimRes.data ?? []).map((row) => ({
            id: String(row.id),
            level: Number(row.level) || 0,
            track: row.track === "premium" ? "premium" : "free",
            claimedAt: row.claimed_at,
          })),
          quests: passState.quests.map((quest) => ({
            title: quest.title,
            progress: quest.progress,
            target: quest.target_count,
            completed: quest.is_completed,
          })),
        }
      : null,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) return auth.error;

  let body: { studentId?: string; kind?: string; id?: string; amount?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const studentId = String(body.studentId ?? "").trim();
  const kind = String(body.kind ?? "").trim();
  const id = String(body.id ?? "").trim();
  if (!studentId) {
    return NextResponse.json({ error: "학번을 입력해 주세요." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  try {
    if (kind === "gold") {
      const amount = Math.floor(Number(body.amount) || 0);
      await debitStudentGold(studentId, amount);
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }

    if (kind === "frame") {
      if (!id) return NextResponse.json({ error: "코스튬을 선택해 주세요." }, { status: 400 });
      await revokeStudentCardFrameOnServer(studentId, id);
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }

    if (kind === "gift") {
      if (!id) return NextResponse.json({ error: "선물을 선택해 주세요." }, { status: 400 });
      const { data: gift } = await admin
        .from("user_gifts")
        .select("id, frame_css_value")
        .eq("id", id)
        .eq("user_id", studentId)
        .maybeSingle();
      const { parseGiftPayload } = await import("@/lib/map-events");
      const parsed = parseGiftPayload({
        frame_css_value: String(gift?.frame_css_value ?? ""),
      });
      const { error } = await admin.from("user_gifts").delete().eq("id", id).eq("user_id", studentId);
      if (error) throw error;
      if (parsed.kind === "costume" && parsed.frameId) {
        await revokeStudentCardFrameOnServer(studentId, parsed.frameId);
      }
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }

    if (kind === "inventory") {
      if (!id) return NextResponse.json({ error: "아이템을 선택해 주세요." }, { status: 400 });
      const { error } = await admin.from("user_inventory").delete().eq("id", id).eq("user_id", studentId);
      if (error) throw error;
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }

    if (kind === "reward") {
      if (!id) return NextResponse.json({ error: "보상을 선택해 주세요." }, { status: 400 });
      const { error } = await admin.from("site_student_rewards").delete().eq("id", id).eq("student_id", studentId);
      if (error) throw error;
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }

    if (kind === "event" || kind === "stamp") {
      if (!id) return NextResponse.json({ error: "이벤트를 선택해 주세요." }, { status: 400 });
      const { error } = await admin
        .from("user_event_progress")
        .update({
          current_stamps: 0,
          stamped_places: [],
          is_completed: false,
          updated_at: new Date().toISOString(),
        })
        .eq("event_id", id)
        .eq("user_id", studentId);
      if (error) throw error;
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }

    if (kind === "event-delete") {
      if (!id) return NextResponse.json({ error: "이벤트를 선택해 주세요." }, { status: 400 });
      const { error } = await admin
        .from("user_event_progress")
        .delete()
        .eq("event_id", id)
        .eq("user_id", studentId);
      if (error) throw error;
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }

    if (kind === "stamp-all") {
      const { error } = await admin
        .from("user_event_progress")
        .update({
          current_stamps: 0,
          stamped_places: [],
          is_completed: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", studentId);
      if (error) throw error;
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }

    if (kind === "claim") {
      if (!id) return NextResponse.json({ error: "시즌패스 보상을 선택해 주세요." }, { status: 400 });
      const { error } = await admin.from("reward_claims").delete().eq("id", id).eq("user_id", studentId);
      if (error) throw error;
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }

    if (kind === "season") {
      const { error: claimError } = await admin.from("reward_claims").delete().eq("user_id", studentId);
      if (claimError) throw claimError;
      const { error: questError } = await admin.from("user_quest_logs").delete().eq("user_id", studentId);
      if (questError && !questError.message.includes("user_quest_logs")) throw questError;
      const { error: attendError } = await admin.from("season_attendance_logs").delete().eq("user_id", studentId);
      if (attendError && !attendError.message.includes("season_attendance_logs")) throw attendError;
      const { error } = await admin
        .from("user_season_progress")
        .update({
          exp: 0,
          level: 1,
          is_premium: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", studentId);
      if (error) throw error;
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }

    if (kind === "shop") {
      if (!id) return NextResponse.json({ error: "상점 구매 내역을 선택해 주세요." }, { status: 400 });
      const { error } = await admin.from("gold_shop_purchases").delete().eq("id", id).eq("user_id", studentId);
      if (error) throw error;
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }

    if (kind === "login") {
      if (!id) return NextResponse.json({ error: "접속 보상 날짜를 선택해 주세요." }, { status: 400 });
      const { error } = await admin
        .from("site_login_reward_claims")
        .delete()
        .eq("student_id", studentId)
        .eq("claimed_on", id);
      if (error) throw error;
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }

    if (kind === "premium") {
      const { error } = await admin
        .from("user_season_progress")
        .update({ is_premium: false })
        .eq("user_id", studentId);
      if (error) throw error;
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }

    if (kind === "frame-all") {
      await reclaimAllFrames(studentId);
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }
    if (kind === "gift-all") {
      await reclaimAllGifts(admin, studentId);
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }
    if (kind === "reward-all") {
      await reclaimAllRewards(admin, studentId);
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }
    if (kind === "inventory-all") {
      await reclaimAllInventory(admin, studentId);
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }
    if (kind === "shop-all") {
      await reclaimAllShop(admin, studentId);
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }
    if (kind === "login-all") {
      await reclaimAllLogin(admin, studentId);
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }
    if (kind === "gold-all") {
      await reclaimAllGold(studentId);
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }
    if (kind === "all") {
      await reclaimEverything(admin, studentId);
      await bumpPublicReloadAt();
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "회수에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ error: "회수할 항목을 확인해 주세요." }, { status: 400 });
}
