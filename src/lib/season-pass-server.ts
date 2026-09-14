import { grantStudentCardFrameOnServer } from "@/lib/student-card-settings-server";
import {
  asRewardMetadata,
  asSeasonPassQuestType,
  computeLevelFromExp,
  isSeasonLive,
  type RewardItem,
  type Season,
  type SeasonPassClaim,
  type SeasonPassLevel,
  type SeasonPassTrack,
  type SeasonPassWidgetState,
  type SeasonQuest,
  type UserSeasonProgress,
} from "@/lib/season-pass";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdmin>>;

function mapSeason(row: Record<string, unknown>): Season {
  return {
    id: String(row.id),
    code: String(row.code ?? ""),
    title: String(row.title ?? ""),
    starts_at: (row.starts_at as string | null) ?? null,
    ends_at: (row.ends_at as string | null) ?? null,
    is_active: Boolean(row.is_active),
    bg_image_url: (row.bg_image_url as string | null) ?? null,
    ui_image_url: (row.ui_image_url as string | null) ?? null,
    track_image_url: (row.track_image_url as string | null) ?? null,
    premium_badge_url: (row.premium_badge_url as string | null) ?? null,
    exp_per_level: Math.max(1, Number(row.exp_per_level) || 1000),
    visit_exp: Math.max(0, Number(row.visit_exp) || 0),
    visit_gold: Math.max(0, Number(row.visit_gold) || 0),
    attendance_exp: Math.max(0, Number(row.attendance_exp) || 0),
    attendance_gold: Math.max(0, Number(row.attendance_gold) || 0),
    premium_gold_price: Math.max(0, Number(row.premium_gold_price) || 0),
    sort_order: Number(row.sort_order) || 0,
  };
}

function mapItem(row: Record<string, unknown>): RewardItem {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    item_type: row.item_type === "gold" || row.item_type === "coupon" ? row.item_type : "costume",
    image_url: (row.image_url as string | null) ?? null,
    metadata: asRewardMetadata(row.metadata),
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order) || 0,
  };
}

function mapLevel(row: Record<string, unknown>, itemsById: Map<string, RewardItem>): SeasonPassLevel {
  const freeId = (row.free_reward_item_id as string | null) ?? null;
  const premiumId = (row.premium_reward_item_id as string | null) ?? null;
  return {
    id: String(row.id),
    season_id: String(row.season_id),
    level: Math.max(1, Number(row.level) || 1),
    required_exp: Math.max(0, Number(row.required_exp) || 0),
    free_reward_item_id: freeId,
    premium_reward_item_id: premiumId,
    free_reward: freeId ? itemsById.get(freeId) ?? null : null,
    premium_reward: premiumId ? itemsById.get(premiumId) ?? null : null,
  };
}

export async function getActiveSeason(admin: AdminClient): Promise<Season | null> {
  const { data, error } = await admin
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const live = ((data ?? []) as Record<string, unknown>[]).map(mapSeason).find((season) => isSeasonLive(season));
  return live ?? null;
}

async function loadItemsMap(admin: AdminClient) {
  const { data } = await admin.from("reward_items").select("*").order("sort_order", { ascending: true });
  const items = ((data ?? []) as Record<string, unknown>[]).map(mapItem);
  return new Map(items.map((item) => [item.id, item]));
}

export async function getSeasonPassState(userId: string): Promise<SeasonPassWidgetState> {
  const empty: SeasonPassWidgetState = {
    season: null,
    progress: null,
    levels: [],
    claims: [],
    quests: [],
    attendedToday: false,
    currentLevel: 1,
    currentExp: 0,
    nextLevelExp: 1000,
    expIntoLevel: 0,
    expForLevel: 1000,
    isPremium: false,
  };

  const admin = createSupabaseAdmin();
  if (!admin) {
    return empty;
  }

  try {
    const season = await getActiveSeason(admin);
    if (!season) {
      return empty;
    }

    const itemsById = await loadItemsMap(admin);
    const [{ data: levelRows }, { data: progressRow }, { data: claimRows }, { data: questRows }] =
      await Promise.all([
        admin.from("season_pass_levels").select("*").eq("season_id", season.id).order("level", { ascending: true }),
        userId
          ? admin
              .from("user_season_progress")
              .select("*")
              .eq("user_id", userId)
              .eq("season_id", season.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        userId
          ? admin.from("reward_claims").select("*").eq("user_id", userId).eq("season_id", season.id)
          : Promise.resolve({ data: [] }),
        admin.from("quests").select("*").eq("season_id", season.id).eq("is_active", true).order("sort_order"),
      ]);

    const levels = ((levelRows ?? []) as Record<string, unknown>[]).map((row) => mapLevel(row, itemsById));
    const progress = progressRow
      ? ({
          id: String((progressRow as { id: string }).id),
          user_id: userId,
          season_id: season.id,
          level: Number((progressRow as { level: number }).level) || 1,
          exp: Number((progressRow as { exp: number }).exp) || 0,
          gold: Number((progressRow as { gold: number }).gold) || 0,
          is_premium: Boolean((progressRow as { is_premium?: boolean }).is_premium),
        } satisfies UserSeasonProgress)
      : null;

    const exp = progress?.exp ?? 0;
    const computed = computeLevelFromExp(exp, levels, season.exp_per_level);
    const quests = ((questRows ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      season_id: String(row.season_id),
      title: String(row.title ?? ""),
      quest_type: asSeasonPassQuestType(row.quest_type),
      target_count: Math.max(1, Number(row.target_count) || 1),
      reward_exp: Number(row.reward_exp) || 0,
      reward_gold: Number(row.reward_gold) || 0,
      is_active: row.is_active !== false,
      sort_order: Number(row.sort_order) || 0,
    })) satisfies SeasonQuest[];

    let questLogs: Record<string, { progress: number; is_completed: boolean }> = {};
    if (userId && quests.length > 0) {
      const { data: logs } = await admin
        .from("user_quest_logs")
        .select("*")
        .eq("user_id", userId)
        .in(
          "quest_id",
          quests.map((quest) => quest.id),
        );
      for (const log of logs ?? []) {
        questLogs[String((log as { quest_id: string }).quest_id)] = {
          progress: Number((log as { progress: number }).progress) || 0,
          is_completed: Boolean((log as { is_completed?: boolean }).is_completed),
        };
      }
    }

    let attendedToday = false;
    if (userId) {
      const { data: attendanceRow, error: attendanceError } = await admin
        .from("season_attendance_logs")
        .select("id")
        .eq("user_id", userId)
        .eq("season_id", season.id)
        .eq("attended_on", kstDateString())
        .maybeSingle();
      if (!attendanceError) {
        attendedToday = Boolean(attendanceRow);
      }
    }

    return {
      season,
      progress,
      levels,
      claims: ((claimRows ?? []) as Record<string, unknown>[]).map((row) => ({
        level: Number(row.level) || 0,
        track: row.track === "premium" ? "premium" : "free",
        reward_item_id: (row.reward_item_id as string | null) ?? null,
        claimed_at: String(row.claimed_at ?? ""),
      })) satisfies SeasonPassClaim[],
      quests: quests.map((quest) => ({
        ...quest,
        progress: questLogs[quest.id]?.progress ?? 0,
        is_completed: Boolean(questLogs[quest.id]?.is_completed),
      })),
      attendedToday,
      currentLevel: computed.level,
      currentExp: exp,
      nextLevelExp: computed.nextLevelExp,
      expIntoLevel: computed.expIntoLevel,
      expForLevel: computed.expForLevel,
      isPremium: Boolean(progress?.is_premium),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("seasons") || message.includes("schema cache") || message.includes("does not exist")) {
      return empty;
    }
    throw error;
  }
}

async function upsertProgress(
  admin: AdminClient,
  userId: string,
  season: Season,
  patch: Partial<Pick<UserSeasonProgress, "exp" | "gold" | "level" | "is_premium">>,
) {
  const { data: existing } = await admin
    .from("user_season_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("season_id", season.id)
    .maybeSingle();

  const nextExp = Math.max(0, Number(patch.exp ?? existing?.exp ?? 0));
  const { data: levelRows } = await admin
    .from("season_pass_levels")
    .select("level, required_exp")
    .eq("season_id", season.id)
    .order("level", { ascending: true });
  const computed = computeLevelFromExp(
    nextExp,
    ((levelRows ?? []) as { level: number; required_exp: number }[]).map((row) => ({
      level: Number(row.level) || 1,
      required_exp: Number(row.required_exp) || 0,
    })),
    season.exp_per_level,
  );

  const payload = {
    user_id: userId,
    season_id: season.id,
    exp: nextExp,
    gold: Math.max(0, Number(patch.gold ?? existing?.gold ?? 0)),
    level: patch.level ?? computed.level,
    is_premium: patch.is_premium ?? Boolean(existing?.is_premium),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("user_season_progress")
    .upsert(payload, { onConflict: "user_id,season_id" })
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

function kstDateString(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

async function bumpQuestsByType(
  admin: AdminClient,
  userId: string,
  season: Season,
  questType: "partner_visit" | "attendance",
) {
  const { data: quests } = await admin
    .from("quests")
    .select("*")
    .eq("season_id", season.id)
    .eq("is_active", true)
    .eq("quest_type", questType);

  for (const quest of quests ?? []) {
    const questId = String((quest as { id: string }).id);
    const target = Math.max(1, Number((quest as { target_count: number }).target_count) || 1);
    const { data: log } = await admin
      .from("user_quest_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("quest_id", questId)
      .maybeSingle();

    if (log?.is_completed) {
      continue;
    }

    const nextProgress = Math.min(target, (Number(log?.progress) || 0) + 1);
    const completed = nextProgress >= target;
    await admin.from("user_quest_logs").upsert(
      {
        user_id: userId,
        quest_id: questId,
        progress: nextProgress,
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,quest_id" },
    );

    if (completed && !log?.is_completed) {
      const { data: afterQuest } = await admin
        .from("user_season_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("season_id", season.id)
        .maybeSingle();
      await upsertProgress(admin, userId, season, {
        exp: Number(afterQuest?.exp || 0) + (Number((quest as { reward_exp: number }).reward_exp) || 0),
        gold: Number(afterQuest?.gold || 0) + (Number((quest as { reward_gold: number }).reward_gold) || 0),
      });
    }
  }
}

export async function completeVisit(input: {
  userId: string;
  partnerId: string;
}): Promise<{ applied: boolean; reason?: string; state?: SeasonPassWidgetState }> {
  const userId = input.userId.trim();
  const partnerId = String(input.partnerId ?? "").trim();
  if (!userId || !partnerId) {
    return { applied: false, reason: "userId, partnerId가 필요합니다." };
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return { applied: false, reason: "no-admin" };
  }

  try {
    const season = await getActiveSeason(admin);
    if (!season) {
      return { applied: false, reason: "no-season" };
    }

    const { data: visit, error: visitError } = await admin
      .from("season_visit_logs")
      .insert({
        user_id: userId,
        season_id: season.id,
        partner_id: partnerId,
      })
      .select("id")
      .maybeSingle();

    if (visitError) {
      if (visitError.code === "23505") {
        return { applied: false, reason: "already-visited" };
      }
      throw visitError;
    }
    if (!visit) {
      return { applied: false, reason: "already-visited" };
    }

    const { data: existing } = await admin
      .from("user_season_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("season_id", season.id)
      .maybeSingle();

    await upsertProgress(admin, userId, season, {
      exp: Number(existing?.exp || 0) + season.visit_exp,
      gold: Number(existing?.gold || 0) + season.visit_gold,
    });

    await bumpQuestsByType(admin, userId, season, "partner_visit");

    return { applied: true, state: await getSeasonPassState(userId) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("does not exist") || message.includes("schema cache") || message.includes("seasons")) {
      return { applied: false, reason: "schema-missing" };
    }
    console.error("completeVisit failed:", error);
    return { applied: false, reason: message || "visit-failed" };
  }
}

export async function completeAttendance(userIdRaw: string): Promise<{
  applied: boolean;
  reason?: string;
  state?: SeasonPassWidgetState;
}> {
  const userId = userIdRaw.trim();
  if (!userId) {
    return { applied: false, reason: "로그인이 필요합니다." };
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return { applied: false, reason: "no-admin" };
  }

  try {
    const season = await getActiveSeason(admin);
    if (!season) {
      return { applied: false, reason: "no-season" };
    }

    const attendedOn = kstDateString();
    const { data: attendance, error: attendanceError } = await admin
      .from("season_attendance_logs")
      .insert({
        user_id: userId,
        season_id: season.id,
        attended_on: attendedOn,
      })
      .select("id")
      .maybeSingle();

    if (attendanceError) {
      if (attendanceError.code === "23505") {
        return { applied: false, reason: "already-attended", state: await getSeasonPassState(userId) };
      }
      throw attendanceError;
    }
    if (!attendance) {
      return { applied: false, reason: "already-attended", state: await getSeasonPassState(userId) };
    }

    const { data: existing } = await admin
      .from("user_season_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("season_id", season.id)
      .maybeSingle();

    await upsertProgress(admin, userId, season, {
      exp: Number(existing?.exp || 0) + season.attendance_exp,
      gold: Number(existing?.gold || 0) + season.attendance_gold,
    });

    await bumpQuestsByType(admin, userId, season, "attendance");

    return { applied: true, state: await getSeasonPassState(userId) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("does not exist") || message.includes("schema cache") || message.includes("attendance")) {
      return { applied: false, reason: "schema-missing" };
    }
    console.error("completeAttendance failed:", error);
    return { applied: false, reason: message || "attendance-failed" };
  }
}

async function grantRewardItem(admin: AdminClient, userId: string, seasonId: string, item: RewardItem) {
  const meta = item.metadata;
  if (item.item_type === "gold") {
    const amount = Math.max(0, Number(meta.gold_amount ?? meta.amount ?? 0));
    const { data: progress } = await admin
      .from("user_season_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("season_id", seasonId)
      .maybeSingle();
    const seasonRow = await admin.from("seasons").select("*").eq("id", seasonId).maybeSingle();
    if (seasonRow.data) {
      await upsertProgress(admin, userId, mapSeason(seasonRow.data as Record<string, unknown>), {
        gold: Number(progress?.gold || 0) + amount,
      });
    }
  }

  await admin.from("user_inventory").insert({
    user_id: userId,
    category: item.item_type.toUpperCase(),
    reward_name: item.name,
    reward_img: item.image_url,
    item_value:
      typeof meta.frame_id === "string"
        ? meta.frame_id
        : typeof meta.coupon_code === "string"
          ? meta.coupon_code
          : null,
    source: "SEASON_PASS",
    reward_item_id: item.id,
    season_id: seasonId,
    is_equipped: false,
  });

  if (item.item_type === "costume") {
    const frameId = typeof meta.frame_id === "string" ? meta.frame_id.trim() : "";
    if (frameId) {
      await grantStudentCardFrameOnServer(userId, frameId, "season", { activate: false });
    }
  }
}

export async function claimSeasonReward(input: {
  userId: string;
  level: number;
  track: SeasonPassTrack;
}) {
  const userId = input.userId.trim();
  const level = Math.max(1, Math.floor(input.level) || 1);
  const track = input.track === "premium" ? "premium" : "free";
  if (!userId) {
    throw new Error("로그인이 필요합니다.");
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase 서버 설정이 없습니다.");
  }

  const state = await getSeasonPassState(userId);
  if (!state.season) {
    throw new Error("진행 중인 시즌이 없습니다.");
  }
  if (state.currentLevel < level) {
    throw new Error("아직 해당 레벨에 도달하지 않았습니다.");
  }
  if (track === "premium" && !state.isPremium) {
    throw new Error("프리미엄 패스가 필요합니다.");
  }

  const already = state.claims.some((claim) => claim.level === level && claim.track === track);
  if (already) {
    throw new Error("이미 수령한 보상입니다.");
  }

  const row = state.levels.find((item) => item.level === level);
  if (!row) {
    throw new Error("레벨 보상이 없습니다.");
  }

  const item = track === "premium" ? row.premium_reward : row.free_reward;
  if (!item) {
    throw new Error("지급할 보상이 없습니다.");
  }

  const { error } = await admin.from("reward_claims").insert({
    user_id: userId,
    season_id: state.season.id,
    level,
    track,
    reward_item_id: item.id,
  });
  if (error) {
    if (error.code === "23505") {
      throw new Error("이미 수령한 보상입니다.");
    }
    throw error;
  }

  await grantRewardItem(admin, userId, state.season.id, item);
  return getSeasonPassState(userId);
}

export async function purchasePremiumPass(userIdRaw: string) {
  const userId = userIdRaw.trim();
  if (!userId) {
    throw new Error("로그인이 필요합니다.");
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase 서버 설정이 없습니다.");
  }

  const state = await getSeasonPassState(userId);
  if (!state.season) {
    throw new Error("진행 중인 시즌이 없습니다.");
  }
  if (state.isPremium) {
    throw new Error("이미 프리미엄 패스를 보유 중입니다.");
  }

  const price = Math.max(0, state.season.premium_gold_price);
  if (price <= 0) {
    throw new Error("판매가가 아직 없습니다.");
  }

  const gold = Number(state.progress?.gold ?? 0);
  if (gold < price) {
    throw new Error("골드가 부족합니다.");
  }

  await upsertProgress(admin, userId, state.season, {
    exp: Number(state.progress?.exp ?? 0),
    gold: gold - price,
    is_premium: true,
  });

  return getSeasonPassState(userId);
}
