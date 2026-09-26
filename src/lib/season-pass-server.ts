import {
  findCardFrameByRef,
  loadCardFrameCatalogFromDb,
} from "@/lib/student-card-frames";
import {
  asRewardMetadata,
  asSeasonPassQuestType,
  computeLevelFromExp,
  isSeasonLive,
  parseGoldShopFilterTabs,
  type RewardItem,
  type Season,
  type SeasonPassClaim,
  type SeasonPassLevel,
  type SeasonPassTrack,
  type SeasonPassWidgetState,
  type SeasonQuest,
  type GoldShopItem,
  type UserSeasonProgress,
} from "@/lib/season-pass";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { logGachaToSheets, logSeasonPassToSheets } from "@/lib/google-sheets-student";
import type { GoldLedgerSource } from "@/lib/gold-analytics";
import { encodeGiftCouponValue, encodeGiftGachaValue, parseGiftPayload } from "@/lib/map-events";
import {
  clampGachaPullCount,
  gachaRareRankById,
  isGachaBoxOnSale,
  mapGachaBox,
  mapGachaReward,
  pickGachaReward,
  type GoldShopGachaBox,
  type GoldShopGachaReward,
} from "@/lib/gold-shop-gacha";

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
    free_pass_image_url: (row.free_pass_image_url as string | null) ?? null,
    premium_pass_image_url: (row.premium_pass_image_url as string | null) ?? null,
    gold_icon_url: (row.gold_icon_url as string | null) ?? null,
    claimed_check_image_url: (row.claimed_check_image_url as string | null) ?? null,
    exp_per_level: Math.max(1, Number(row.exp_per_level) || 1000),
    visit_exp: Math.max(0, Number(row.visit_exp) || 0),
    visit_gold: Math.max(0, Number(row.visit_gold) || 0),
    attendance_exp: Math.max(0, Number(row.attendance_exp) || 0),
    attendance_gold: Math.max(0, Number(row.attendance_gold) || 0),
    premium_gold_price: Math.max(0, Number(row.premium_gold_price) || 0),
    premium_original_price_gold: Math.max(0, Number(row.premium_original_price_gold) || 0),
    premium_badge_label:
      row.premium_badge_label === undefined || row.premium_badge_label === null
        ? "인기"
        : String(row.premium_badge_label).trim(),
    gold_shop_enabled: row.gold_shop_enabled !== false,
    costume_preview_enabled: row.costume_preview_enabled !== false,
    shop_filter_tabs: parseGoldShopFilterTabs(row.shop_filter_tabs),
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
    return null;
  }

  const live = ((data ?? []) as Record<string, unknown>[]).map(mapSeason).find((season) => isSeasonLive(season));
  return live ?? null;
}

async function loadItemsMap(admin: AdminClient) {
  const { data } = await admin.from("reward_items").select("*").order("sort_order", { ascending: true });
  const catalog = await loadCardFrameCatalogFromDb().catch(() => []);
  const items = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const item = mapItem(row);
    if (item.item_type === "costume") {
      const ref =
        (typeof item.metadata.frame_id === "string" && item.metadata.frame_id) || item.name;
      const frame = findCardFrameByRef(catalog, ref);
      if (!frame) return item;
      const keepName = item.name.trim() && item.name.trim() !== "새 보상";
      return {
        ...item,
        image_url: item.image_url || frame.imageUrl || null,
        name: keepName ? item.name : frame.name,
      };
    }
    return item;
  });
  return new Map(items.map((item) => [item.id, item]));
}

async function listShopSeasons(admin: AdminClient): Promise<Season[]> {
  const { data, error } = await admin
    .from("seasons")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[])
    .map(mapSeason)
    .filter((season) => season.gold_shop_enabled !== false)
    .sort((a, b) => Number(b.is_active) - Number(a.is_active));
}

async function loadGoldShopItems(
  admin: AdminClient,
  shopSeasons: Season[],
  passSeason: Season | null,
  userId: string,
  itemsById: Map<string, RewardItem>,
  isPremium: boolean,
): Promise<GoldShopItem[]> {
  const shopItems: GoldShopItem[] = [];
  const shopIds = new Set(shopSeasons.map((season) => season.id));
  if (passSeason && passSeason.gold_shop_enabled !== false && passSeason.premium_gold_price > 0) {
    shopItems.push({
      id: "premium",
      season_id: passSeason.id,
      reward_item_id: null,
      name: "프리미엄 패스",
      item_kind: "premium",
      price_gold: passSeason.premium_gold_price,
      original_price_gold: passSeason.premium_original_price_gold,
      badge_label: passSeason.premium_badge_label,
      stock: null,
      per_user_limit: 1,
      is_active: true,
      sort_order: -1,
      reward: null,
      purchased_count: isPremium ? 1 : 0,
    });
  }

  if (shopIds.size === 0) {
    return shopItems;
  }

  const { data, error } = await admin
    .from("gold_shop_items")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    return shopItems;
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const ids = rows.map((row) => String(row.id));
  const counts = new Map<string, number>();
  if (userId && ids.length > 0) {
    const { data: purchaseRows } = await admin
      .from("gold_shop_purchases")
      .select("shop_item_id")
      .eq("user_id", userId)
      .in("shop_item_id", ids);
    for (const row of purchaseRows ?? []) {
      const id = String((row as { shop_item_id: string }).shop_item_id);
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }

  for (const row of rows) {
    const seasonId = String(row.season_id ?? "");
    if (!shopIds.has(seasonId)) continue;
    const rewardId = (row.reward_item_id as string | null) ?? null;
    const stockRaw = row.stock;
    shopItems.push({
      id: String(row.id),
      season_id: String(row.season_id),
      reward_item_id: rewardId,
      name: String(row.name ?? "").trim() || itemsById.get(rewardId || "")?.name || "상점 상품",
      item_kind: "reward",
      price_gold: Math.max(0, Number(row.price_gold) || 0),
      original_price_gold: Math.max(0, Number(row.original_price_gold) || 0),
      badge_label: String(row.badge_label ?? "").trim(),
      stock: stockRaw == null || stockRaw === "" ? null : Math.max(0, Number(stockRaw) || 0),
      per_user_limit: Math.max(0, Number(row.per_user_limit) || 0),
      is_active: row.is_active !== false,
      sort_order: Number(row.sort_order) || 0,
      reward: rewardId ? itemsById.get(rewardId) ?? null : null,
      purchased_count: counts.get(String(row.id)) || 0,
    });
  }

  return shopItems;
}

async function loadGoldShopGachaBoxes(admin: AdminClient): Promise<GoldShopGachaBox[]> {
  const { data: boxRows, error } = await admin
    .from("gold_shop_gacha_boxes")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !boxRows) {
    return [];
  }
  const boxes = (boxRows as Record<string, unknown>[]).map((row) => mapGachaBox(row, []));
  if (boxes.length === 0) {
    return [];
  }
  const { data: rewardRows } = await admin
    .from("gold_shop_gacha_rewards")
    .select("*")
    .in(
      "box_id",
      boxes.map((box) => box.id),
    )
    .order("sort_order", { ascending: true });
  const byBox = new Map<string, GoldShopGachaBox["rewards"]>();
  for (const row of (rewardRows ?? []) as Record<string, unknown>[]) {
    const reward = mapGachaReward(row);
    const list = byBox.get(reward.box_id) ?? [];
    list.push(reward);
    byBox.set(reward.box_id, list);
  }
  return boxes
    .filter((box) => isGachaBoxOnSale(box))
    .map((box) => ({ ...box, rewards: byBox.get(box.id) ?? [] }));
}

async function loadGoldShopGachaBoxById(admin: AdminClient, boxId: string): Promise<GoldShopGachaBox | null> {
  const { data: boxRow } = await admin.from("gold_shop_gacha_boxes").select("*").eq("id", boxId).maybeSingle();
  if (!boxRow) return null;
  const { data: rewardRows } = await admin
    .from("gold_shop_gacha_rewards")
    .select("*")
    .eq("box_id", boxId)
    .order("sort_order", { ascending: true });
  return mapGachaBox(
    boxRow as Record<string, unknown>,
    ((rewardRows ?? []) as Record<string, unknown>[]).map((row) => mapGachaReward(row)),
  );
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
    passEnabled: false,
    goldShopEnabled: false,
    shopItems: [],
    gachaBoxes: [],
  };

  const admin = createSupabaseAdmin();
  if (!admin) {
    return empty;
  }

  try {
    const passSeason = await getActiveSeason(admin);
    const shopSeasons = await listShopSeasons(admin);
    const goldShopEnabled = shopSeasons.length > 0;
    const shopSeason =
      passSeason && passSeason.gold_shop_enabled !== false
        ? passSeason
        : shopSeasons[0] ?? null;
    const season = passSeason ?? shopSeason;
    if (!season) {
      return { ...empty, goldShopEnabled };
    }

    const seasonOnly: SeasonPassWidgetState = {
      ...empty,
      season,
      passEnabled: Boolean(passSeason),
      goldShopEnabled,
      nextLevelExp: season.exp_per_level,
      expForLevel: season.exp_per_level,
    };

    try {
      const itemsById = await loadItemsMap(admin);
      if (!passSeason) {
        const walletGold = userId ? await loadWalletGold(admin, userId) : 0;
        const gold = walletGold ?? 0;
        return {
          ...seasonOnly,
          progress: userId
            ? {
                user_id: userId,
                season_id: season.id,
                level: 1,
                exp: 0,
                gold,
                is_premium: false,
              }
            : null,
          shopItems: await loadGoldShopItems(admin, shopSeasons, null, userId, itemsById, false),
          gachaBoxes: await loadGoldShopGachaBoxes(admin),
        };
      }
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
    const walletGold = userId ? await loadWalletGold(admin, userId) : 0;
    const seasonGold = Number((progressRow as { gold?: number } | null)?.gold) || 0;
    const gold = walletGold ?? seasonGold;
    const progress = progressRow
      ? ({
          id: String((progressRow as { id: string }).id),
          user_id: userId,
          season_id: season.id,
          level: Number((progressRow as { level: number }).level) || 1,
          exp: Number((progressRow as { exp: number }).exp) || 0,
          gold,
          is_premium: Boolean((progressRow as { is_premium?: boolean }).is_premium),
        } satisfies UserSeasonProgress)
      : userId
        ? ({
            user_id: userId,
            season_id: season.id,
            level: 1,
            exp: 0,
            gold,
            is_premium: false,
          } satisfies UserSeasonProgress)
        : null;

    const exp = progress?.exp ?? 0;
    const computed = computeLevelFromExp(exp, levels, season.exp_per_level);
    const quests = ((questRows ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      season_id: String(row.season_id),
      title: String(row.title ?? ""),
      description: String(row.description ?? ""),
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
      passEnabled: true,
      goldShopEnabled,
      shopItems: await loadGoldShopItems(
        admin,
        shopSeasons.length > 0 ? shopSeasons : passSeason.gold_shop_enabled !== false ? [passSeason] : [],
        passSeason,
        userId,
        itemsById,
        Boolean(progress?.is_premium),
      ),
      gachaBoxes: await loadGoldShopGachaBoxes(admin),
    };
    } catch {
      return seasonOnly;
    }
  } catch {
    return empty;
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

function isMissingGoldWallet(message: string) {
  return (
    message.includes("user_gold_wallet") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

async function loadWalletGold(admin: AdminClient, userId: string): Promise<number | null> {
  if (!userId) return 0;
  const { data, error } = await admin
    .from("user_gold_wallet")
    .select("gold")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingGoldWallet(error.message)) return null;
    throw error;
  }

  if (data) {
    return Math.max(0, Number((data as { gold?: number }).gold) || 0);
  }

  const { data: seasonRows } = await admin.from("user_season_progress").select("gold").eq("user_id", userId);
  const migrated = ((seasonRows ?? []) as { gold?: number }[]).reduce(
    (sum, row) => sum + (Number(row.gold) || 0),
    0,
  );
  const { error: insertError } = await admin.from("user_gold_wallet").upsert(
    {
      user_id: userId,
      gold: migrated,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (insertError) {
    if (isMissingGoldWallet(insertError.message)) return null;
    if (insertError.code !== "23505") throw insertError;
  }
  return migrated;
}

async function writeGoldLedger(
  admin: AdminClient,
  userId: string,
  seasonId: string,
  amount: number,
  source: GoldLedgerSource,
) {
  const payload = {
    user_id: userId,
    season_id: seasonId,
    amount,
    source,
  };
  const { error } = await admin.from("gold_ledger").insert(payload);
  if (error && source === "gacha") {
    await admin.from("gold_ledger").insert({ ...payload, source: "shop_reward" });
  }
}

async function adjustGold(
  admin: AdminClient,
  userId: string,
  season: Season,
  delta: number,
  source: GoldLedgerSource,
) {
  const wallet = await loadWalletGold(admin, userId);
  let next = 0;
  if (wallet != null) {
    next = Math.max(0, wallet + delta);
    const { error } = await admin.from("user_gold_wallet").upsert(
      {
        user_id: userId,
        gold: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
  } else {
    const { data: existing } = await admin
      .from("user_season_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("season_id", season.id)
      .maybeSingle();
    next = Math.max(0, Number(existing?.gold || 0) + delta);
    await upsertProgress(admin, userId, season, { gold: next });
  }

  if (delta !== 0) {
    void writeGoldLedger(admin, userId, season.id, delta, source);
  }
  return next;
}

export async function creditStudentGold(userIdRaw: string, amountRaw: number) {
  const userId = userIdRaw.trim();
  const amount = Math.floor(Number(amountRaw) || 0);
  if (!userId || amount <= 0) {
    throw new Error("지급할 골드를 확인해 주세요.");
  }
  const admin = createSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase 서버 설정이 없습니다.");
  }
  const season = await getActiveSeason(admin);
  if (season) {
    await adjustGold(admin, userId, season, amount, "admin");
    return;
  }
  const wallet = await loadWalletGold(admin, userId);
  const next = Math.max(0, (wallet ?? 0) + amount);
  const { error } = await admin.from("user_gold_wallet").upsert(
    {
      user_id: userId,
      gold: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    throw new Error(
      error.message.includes("user_gold_wallet")
        ? "골드 지갑이 없습니다. 시즌패스를 활성화하거나 supabase/season-pass.sql 을 실행해 주세요."
        : error.message,
    );
  }
  void admin.from("gold_ledger").insert({
    user_id: userId,
    season_id: null,
    amount,
    source: "admin",
  });
}

export async function debitStudentGold(userIdRaw: string, amountRaw: number) {
  const userId = userIdRaw.trim();
  const amount = Math.floor(Number(amountRaw) || 0);
  if (!userId || amount <= 0) {
    throw new Error("회수할 골드를 확인해 주세요.");
  }
  const admin = createSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase 서버 설정이 없습니다.");
  }
  const season = await getActiveSeason(admin);
  if (season) {
    await adjustGold(admin, userId, season, -amount, "admin");
    return;
  }
  const wallet = await loadWalletGold(admin, userId);
  const next = Math.max(0, (wallet ?? 0) - amount);
  const { error } = await admin.from("user_gold_wallet").upsert(
    {
      user_id: userId,
      gold: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    throw new Error(
      error.message.includes("user_gold_wallet")
        ? "골드 지갑이 없습니다. 시즌패스를 활성화하거나 supabase/season-pass.sql 을 실행해 주세요."
        : error.message,
    );
  }
  void admin.from("gold_ledger").insert({
    user_id: userId,
    season_id: null,
    amount: -amount,
    source: "admin",
  });
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
      const rewardExp = Number((quest as { reward_exp: number }).reward_exp) || 0;
      const rewardGold = Number((quest as { reward_gold: number }).reward_gold) || 0;
      await upsertProgress(admin, userId, season, {
        exp: Number(afterQuest?.exp || 0) + rewardExp,
      });
      await adjustGold(admin, userId, season, rewardGold, "quest");
      const questTitle = String((quest as { title?: string }).title ?? "").trim() || "퀘스트";
      logSeasonPassToSheets({
        studentId: userId,
        action: "quest",
        seasonTitle: season.title,
        detail: `${questTitle} (EXP ${rewardExp} / 골드 ${rewardGold})`,
      });
    }
  }
}

export async function completeVisit(input: {
  userId: string;
  partnerId: string;
  partnerName?: string;
  studentName?: string;
  department?: string;
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
    });
    await adjustGold(admin, userId, season, season.visit_gold, "visit");

    await bumpQuestsByType(admin, userId, season, "partner_visit");

    let partnerName = input.partnerName?.trim() || "";
    if (!partnerName) {
      const { data: partner } = await admin.from("partners").select("name").eq("id", partnerId).maybeSingle();
      partnerName = String(partner?.name ?? "").trim();
    }
    logSeasonPassToSheets({
      studentId: userId,
      action: "visit",
      seasonTitle: season.title,
      detail: partnerName || partnerId,
      name: input.studentName,
      department: input.department,
    });

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
    });
    await adjustGold(admin, userId, season, season.attendance_gold, "attendance");

    await bumpQuestsByType(admin, userId, season, "attendance");

    logSeasonPassToSheets({
      studentId: userId,
      action: "attendance",
      seasonTitle: season.title,
      detail: `출석일 ${attendedOn} (EXP ${season.attendance_exp} / 골드 ${season.attendance_gold})`,
    });

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

async function resolveCostumeFrameId(
  item: RewardItem,
  catalog: Awaited<ReturnType<typeof loadCardFrameCatalogFromDb>>,
): Promise<string> {
  const meta = item.metadata;
  const candidates = [
    typeof meta.frame_id === "string" ? meta.frame_id : "",
    typeof meta.costume_id === "string" ? meta.costume_id : "",
    typeof meta.item_value === "string" ? meta.item_value : "",
    item.name,
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  if (candidates.length === 0) {
    throw new Error("코스튬 ID가 없습니다. 보상 아이템을 저장한 뒤 다시 수령해 주세요.");
  }

  for (const value of candidates) {
    const matched = findCardFrameByRef(catalog, value);
    if (matched?.id) {
      return matched.id;
    }
  }

  const fallback = candidates[0];
  if (catalog.length > 0 && !findCardFrameByRef(catalog, fallback)) {
    throw new Error(
      "코스튬을 찾을 수 없습니다. 학생증 코스튬 목록의 ID 또는 정확한 이름을 입력해 주세요.",
    );
  }
  return fallback;
}

async function sendSeasonPassInboxGift(
  admin: AdminClient,
  userId: string,
  sourceLabel: string,
  item: RewardItem,
  catalog?: Awaited<ReturnType<typeof loadCardFrameCatalogFromDb>>,
) {
  let giftValue = "";
  let displayName = item.name.trim() && item.name.trim() !== "새 보상" ? item.name.trim() : "";
  let imageUrl = item.image_url;

  if (item.item_type === "coupon") {
    const code = String(item.metadata.coupon_code ?? item.metadata.code ?? "").trim();
    if (!code) {
      throw new Error("쿠폰 코드가 없습니다. 보상 아이템에 코드를 입력해 주세요.");
    }
    giftValue = encodeGiftCouponValue(code);
    displayName = displayName || (sourceLabel.trim() === "상점 구매" ? "상점 쿠폰" : "시즌패스 쿠폰");
  } else {
    const frames = catalog ?? (await loadCardFrameCatalogFromDb().catch(() => []));
    const frameId = await resolveCostumeFrameId(item, frames);
    const frame = findCardFrameByRef(frames, frameId);
    giftValue = frameId;
    displayName =
      displayName ||
      frame?.name?.trim() ||
      (sourceLabel.trim() === "상점 구매" ? "상점 코스튬" : "시즌패스 코스튬");
    imageUrl = item.image_url || frame?.imageUrl || null;
  }

  const rewardName = sourceLabel.trim() ? `${sourceLabel.trim()} · ${displayName}` : displayName;

  const { data: pending } = await admin
    .from("user_gifts")
    .select("id")
    .eq("user_id", userId)
    .eq("frame_css_value", giftValue)
    .eq("is_claimed", false)
    .limit(1);
  if ((pending ?? []).length > 0) {
    return item.item_type === "costume" ? giftValue : null;
  }

  const { error } = await admin.from("user_gifts").insert({
    user_id: userId,
    reward_id: null,
    event_id: null,
    reward_name: rewardName,
    reward_img: imageUrl,
    frame_css_value: giftValue,
    is_claimed: false,
  });
  if (error) {
    throw new Error(
      error.message.includes("user_gifts")
        ? "선물함 테이블이 없습니다. supabase/map-events-gifts.sql 을 실행해 주세요."
        : error.message || "보상을 선물함으로 보내지 못했습니다.",
    );
  }
  return item.item_type === "costume" ? giftValue : null;
}

async function grantRewardItem(
  admin: AdminClient,
  userId: string,
  seasonId: string,
  seasonTitle: string,
  item: RewardItem,
) {
  const meta = item.metadata;
  let grantedFrameId: string | null = null;

  if (item.item_type === "gold") {
    const amount = Math.max(0, Number(meta.gold_amount ?? meta.amount ?? 0));
    const seasonRow = await admin.from("seasons").select("*").eq("id", seasonId).maybeSingle();
    if (seasonRow.data) {
      await adjustGold(admin, userId, mapSeason(seasonRow.data as Record<string, unknown>), amount, "claim");
    }
  }

  if (item.item_type === "costume" || item.item_type === "coupon") {
    grantedFrameId = await sendSeasonPassInboxGift(admin, userId, seasonTitle, item);
    return grantedFrameId;
  }

  const inventoryPayload = {
    user_id: userId,
    category: item.item_type.toUpperCase(),
    reward_name: item.name,
    reward_img: item.image_url,
    item_value: typeof meta.coupon_code === "string" ? meta.coupon_code : null,
    source: "SEASON_PASS",
    reward_item_id: item.id,
    season_id: seasonId,
    is_equipped: false,
  };
  const inserted = await admin.from("user_inventory").insert(inventoryPayload);
  if (inserted.error) {
    await admin.from("user_inventory").insert({
      user_id: userId,
      category: inventoryPayload.category,
      reward_name: item.name,
      reward_img: item.image_url,
      item_value: inventoryPayload.item_value,
      source: "SEASON_PASS",
    });
  }

  return grantedFrameId;
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

  const row = state.levels.find((item) => item.level === level);
  if (!row) {
    throw new Error("레벨 보상이 없습니다.");
  }

  const item = track === "premium" ? row.premium_reward : row.free_reward;
  if (!item) {
    throw new Error("지급할 보상이 없습니다.");
  }

  const already = state.claims.some((claim) => claim.level === level && claim.track === track);
  if (already) {
    if (item.item_type === "costume" || item.item_type === "coupon") {
      await sendSeasonPassInboxGift(admin, userId, state.season.title, item);
      return { state: await getSeasonPassState(userId), frameId: null, gifted: true };
    }
    throw new Error("이미 수령한 보상입니다.");
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
      if (item.item_type === "costume" || item.item_type === "coupon") {
        await sendSeasonPassInboxGift(admin, userId, state.season.title, item);
        return { state: await getSeasonPassState(userId), frameId: null, gifted: true };
      }
      throw new Error("이미 수령한 보상입니다.");
    }
    throw error;
  }

  const frameId = await grantRewardItem(admin, userId, state.season.id, state.season.title, item);
  const gifted = item.item_type === "costume" || item.item_type === "coupon";
  const trackLabel = track === "premium" ? "프리미엄" : "무료";
  logSeasonPassToSheets({
    studentId: userId,
    action: "claim",
    seasonTitle: state.season.title,
    detail: gifted
      ? `LV ${level} ${trackLabel} · ${item.name} (선물함)`
      : `LV ${level} ${trackLabel} · ${item.name}`,
  });
  return {
    state: await getSeasonPassState(userId),
    frameId: gifted ? null : frameId,
    gifted,
  };
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
  if (!state.passEnabled || !state.season) {
    throw new Error("진행 중인 시즌이 없습니다.");
  }
  if (state.season.gold_shop_enabled === false && !state.goldShopEnabled) {
    throw new Error("골드 상점이 비활성화되어 있습니다.");
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

  await adjustGold(admin, userId, state.season, -price, "premium");
  await upsertProgress(admin, userId, state.season, {
    exp: Number(state.progress?.exp ?? 0),
    is_premium: true,
  });

  logSeasonPassToSheets({
    studentId: userId,
    action: "premium",
    seasonTitle: state.season.title,
    detail: `골드 ${price} 사용`,
  });

  return getSeasonPassState(userId);
}

export async function purchaseGoldShopItem(userIdRaw: string, shopItemIdRaw: string) {
  const userId = userIdRaw.trim();
  const shopItemId = shopItemIdRaw.trim();
  if (!userId) {
    throw new Error("로그인이 필요합니다.");
  }
  if (!shopItemId) {
    throw new Error("상품이 필요합니다.");
  }

  if (shopItemId === "premium") {
    const state = await purchasePremiumPass(userId);
    return { state, gifted: false, name: "프리미엄 패스" };
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase 서버 설정이 없습니다.");
  }

  const state = await getSeasonPassState(userId);
  if (!state.goldShopEnabled || !state.season) {
    throw new Error("골드 상점이 비활성화되어 있습니다.");
  }

  const shopItem = state.shopItems.find((item) => item.id === shopItemId);
  if (!shopItem || !shopItem.is_active) {
    throw new Error("판매 중인 상품이 아닙니다.");
  }
  if (shopItem.item_kind === "premium") {
    const next = await purchasePremiumPass(userId);
    return { state: next, gifted: false, name: shopItem.name };
  }
  if (shopItem.price_gold <= 0) {
    throw new Error("판매가가 아직 없습니다.");
  }
  if (shopItem.stock != null && shopItem.stock <= 0) {
    throw new Error("재고가 없습니다.");
  }
  if (shopItem.per_user_limit > 0 && shopItem.purchased_count >= shopItem.per_user_limit) {
    throw new Error("이미 구매한 상품입니다.");
  }
  const gold = Number(state.progress?.gold ?? 0);
  if (gold < shopItem.price_gold) {
    throw new Error("골드가 부족합니다.");
  }

  const reward = shopItem.reward;
  if (!reward) {
    throw new Error("지급할 상품이 없습니다. 관리자에서 보상 아이템을 연결해 주세요.");
  }

  const purchaseSeasonId = shopItem.season_id || state.season.id;
  const purchaseSeason =
    shopItem.season_id && shopItem.season_id !== state.season.id
      ? { ...state.season, id: shopItem.season_id }
      : state.season;

  await adjustGold(admin, userId, purchaseSeason, -shopItem.price_gold, "shop_spend");

  let gifted = false;
  if (reward.item_type === "costume" || reward.item_type === "coupon") {
    await sendSeasonPassInboxGift(admin, userId, "상점 구매", reward);
    gifted = true;
  } else if (reward.item_type === "gold") {
    const amount = Math.max(0, Number(reward.metadata.gold_amount ?? reward.metadata.amount ?? 0));
    await adjustGold(admin, userId, state.season, amount, "shop_reward");
  }

  const { error: purchaseError } = await admin.from("gold_shop_purchases").insert({
    user_id: userId,
    shop_item_id: shopItem.id,
    season_id: purchaseSeasonId,
    gold_spent: shopItem.price_gold,
  });
  if (purchaseError) {
    throw new Error(
      purchaseError.message.includes("gold_shop_purchases")
        ? "상점 구매 테이블이 없습니다. supabase/season-pass.sql 을 실행해 주세요."
        : purchaseError.message,
    );
  }

  if (shopItem.stock != null) {
    await admin
      .from("gold_shop_items")
      .update({
        stock: Math.max(0, shopItem.stock - 1),
        updated_at: new Date().toISOString(),
      })
      .eq("id", shopItem.id);
  }

  logSeasonPassToSheets({
    studentId: userId,
    action: "shop",
    seasonTitle: state.season.title,
    detail: `${shopItem.name} · 골드 ${shopItem.price_gold}`,
  });

  return {
    state: await getSeasonPassState(userId),
    gifted,
    name: shopItem.name,
  };
}

export async function pullGoldShopGacha(
  userIdRaw: string,
  boxIdRaw: string,
  options?: { giftId?: string; count?: number; hold?: boolean },
) {
  const userId = userIdRaw.trim();
  const giftId = options?.giftId?.trim() || "";
  let boxId = boxIdRaw.trim();
  if (!userId) {
    throw new Error("로그인이 필요합니다.");
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase 서버 설정이 없습니다.");
  }

  const [passSeason, shopSeasons] = await Promise.all([getActiveSeason(admin), listShopSeasons(admin)]);
  const goldShopEnabled = shopSeasons.length > 0;
  const season = passSeason ?? shopSeasons[0] ?? null;
  if (!goldShopEnabled || !season) {
    throw new Error("골드 상점이 비활성화되어 있습니다.");
  }

  if (giftId) {
    const { data: gift, error } = await admin
      .from("user_gifts")
      .select("*")
      .eq("id", giftId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !gift) {
      throw new Error("보관함에서 상자를 찾지 못했습니다.");
    }
    if (gift.is_claimed) {
      throw new Error("이미 연 상자입니다.");
    }
    const parsed = parseGiftPayload({
      frame_css_value: String(gift.frame_css_value ?? ""),
    });
    if (parsed.kind !== "gacha" || !parsed.gachaBoxId) {
      throw new Error("확률 상자가 아닙니다.");
    }
    boxId = parsed.gachaBoxId;
  }

  if (!boxId) {
    throw new Error("상품이 필요합니다.");
  }

  const box = await loadGoldShopGachaBoxById(admin, boxId);
  if (!box) {
    throw new Error("판매 중인 확률 상자가 아닙니다.");
  }
  if (!giftId && !isGachaBoxOnSale(box)) {
    throw new Error("판매 기간이 아니거나 판매 중이 아닌 확률 상자입니다.");
  }

  let count = clampGachaPullCount(options?.count, box.layout_count || 1);
  let giftIdsToClaim: string[] = giftId ? [giftId] : [];
  if (giftId) {
    const { data: siblingRows } = await admin
      .from("user_gifts")
      .select("id")
      .eq("user_id", userId)
      .eq("is_claimed", false)
      .eq("frame_css_value", encodeGiftGachaValue(boxId))
      .order("created_at", { ascending: true });
    const ids = ((siblingRows ?? []) as Array<{ id?: string }>)
      .map((row) => String(row.id ?? "").trim())
      .filter(Boolean);
    const ordered = [giftId, ...ids.filter((id) => id !== giftId)];
    count = Math.min(count, Math.max(1, ordered.length));
    giftIdsToClaim = ordered.slice(0, count);
  }
  const spend = giftId ? 0 : box.price_gold * count;
  let gold = (await loadWalletGold(admin, userId)) ?? 0;

  if (!giftId) {
    if (box.price_gold <= 0) {
      throw new Error("판매가가 아직 없습니다.");
    }
    if (gold < spend) {
      throw new Error("골드가 부족합니다.");
    }
    gold = await adjustGold(admin, userId, season, -spend, "shop_spend");

    const holdToInbox =
      box.open_place === "inventory" || (box.open_place === "choice" && Boolean(options?.hold));
    if (holdToInbox) {
      const rows = Array.from({ length: count }, () => ({
        user_id: userId,
        reward_id: null,
        event_id: null,
        reward_name: box.name,
        reward_img: box.idle_image_url,
        frame_css_value: encodeGiftGachaValue(box.id),
        is_claimed: false,
      }));
      const { error: holdError } = await admin.from("user_gifts").insert(rows);
      if (holdError) {
        throw new Error(
          holdError.message.includes("user_gifts")
            ? "선물함 테이블이 없습니다. supabase/map-events-gifts.sql 을 실행해 주세요."
            : holdError.message,
        );
      }
      logGachaToSheets({
        studentId: userId,
        seasonTitle: season.title,
        detail: `${box.name} 보관함 지급 ${count}개 · 골드 ${spend}`,
        held: true,
      });
      return {
        gold,
        held: true,
        count,
        gifted: true,
        name: box.name,
        imageUrl: box.idle_image_url,
        kind: "gacha",
        goldAmount: 0,
        fxEnabled: box.fx_enabled,
        idleImageUrl: box.idle_image_url,
        burstImageUrl: box.burst_image_url,
        layoutCount: box.layout_count,
        prizes: [],
      };
    }
  }

  const db = admin;
  const target = box;
  const costumeCatalog = await loadCardFrameCatalogFromDb().catch(() => []);
  const rareRanks = gachaRareRankById(target.rewards);

  const prizes: Array<{
    name: string;
    imageUrl: string | null;
    kind: string;
    goldAmount: number;
    gifted: boolean;
    rareRank: number;
  }> = [];
  const pullRows: Array<{
    user_id: string;
    box_id: string;
    reward_id: string;
    gold_spent: number;
  }> = [];

  async function grantPrize(prize: GoldShopGachaReward) {
    let gifted = false;
    if (prize.kind === "gold") {
      const amount = Math.max(0, prize.gold_amount);
      if (amount > 0) {
        gold = await adjustGold(db, userId, season, amount, "gacha");
      }
    } else {
      const synthetic: RewardItem = {
        id: prize.id,
        name: prize.name || (prize.kind === "coupon" ? "쿠폰" : "코스튬"),
        item_type: prize.kind,
        image_url: prize.image_url,
        metadata:
          prize.kind === "coupon"
            ? { coupon_code: prize.coupon_code || "", code: prize.coupon_code || "" }
            : { frame_id: prize.frame_id || "" },
        is_active: true,
        sort_order: prize.sort_order,
      };
      await sendSeasonPassInboxGift(db, userId, "확률 상자", synthetic, costumeCatalog);
      gifted = true;
    }
    prizes.push({
      name: prize.name || target.name,
      imageUrl: prize.image_url,
      kind: prize.kind,
      goldAmount: prize.gold_amount,
      gifted,
      rareRank: rareRanks.get(prize.id) ?? 0,
    });
    pullRows.push({
      user_id: userId,
      box_id: target.id,
      reward_id: prize.id,
      gold_spent: giftId ? 0 : target.price_gold,
    });
  }

  for (let index = 0; index < count; index += 1) {
    const prize = pickGachaReward(target.rewards);
    if (!prize) {
      throw new Error("지급할 확률이 없습니다. 관리자에서 보상 확률을 확인해 주세요.");
    }
    await grantPrize(prize);
  }

  if (pullRows.length > 0) {
    const { error: pullLogError } = await db.from("gold_shop_gacha_pulls").insert(pullRows);
    if (pullLogError && !pullLogError.message.includes("gold_shop_gacha_pulls")) {
      throw pullLogError;
    }
  }

  if (giftIdsToClaim.length > 0) {
    await db
      .from("user_gifts")
      .update({ is_claimed: true, claimed_at: new Date().toISOString() })
      .in("id", giftIdsToClaim)
      .eq("user_id", userId)
      .eq("is_claimed", false);
  }

  const first = prizes[0];
  const prizeNames = prizes.map((item) => item.name).filter(Boolean).join(", ");
  logGachaToSheets({
    studentId: userId,
    seasonTitle: season.title,
    detail: `${target.name} 뽑기 ${count}회 · 골드 ${spend}${prizeNames ? ` · ${prizeNames}` : ""}`,
    held: false,
  });

  return {
    gold,
    held: false,
    count,
    gifted: prizes.some((item) => item.gifted),
    name: first?.name || target.name,
    imageUrl: first?.imageUrl ?? null,
    kind: first?.kind || "",
    goldAmount: first?.goldAmount || 0,
    fxEnabled: target.fx_enabled,
    idleImageUrl: target.idle_image_url,
    burstImageUrl: target.burst_image_url,
    rare1FxUrl: target.rare1_fx_url,
    rare2FxUrl: target.rare2_fx_url,
    layoutCount: target.layout_count,
    prizes,
  };
}
