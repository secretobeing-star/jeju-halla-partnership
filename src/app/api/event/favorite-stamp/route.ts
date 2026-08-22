import { NextRequest, NextResponse } from "next/server";
import {
  asStringArray,
  isEventLive,
  parseStepProbabilities,
  resolveFrameValue,
  rollStepWin,
  type MapEvent,
  type MapEventReward,
  type MapEventRewardType,
} from "@/lib/map-events";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type FavoriteStampBody = {
  userId?: string;
  placeId?: string;
  eventId?: string;
  sessionToken?: string; // 🌟 추가: 클라이언트에서 전달받는 세션 토큰
};

async function pickReward(
  admin: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  eventId: string,
  rewardType: MapEventRewardType,
): Promise<MapEventReward | null> {
  const { data } = await admin
    .from("event_rewards")
    .select("*")
    .eq("event_id", eventId)
    .eq("reward_type", rewardType)
    .order("sort_order", { ascending: true });

  const pool = ((data ?? []) as MapEventReward[]).filter((item) => Number(item.stock) > 0);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

async function insertGift(
  admin: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  userId: string,
  eventId: string,
  reward: MapEventReward,
) {
  await admin
    .from("event_rewards")
    .update({
      stock: Math.max(0, Number(reward.stock) - 1),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reward.id);

  const { data, error } = await admin
    .from("user_gifts")
    .insert({
      user_id: userId,
      reward_id: reward.id,
      event_id: eventId,
      reward_name: reward.reward_name,
      reward_img: reward.reward_img,
      frame_css_value: resolveFrameValue(reward),
      is_claimed: false,
    })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || "선물함 지급에 실패했습니다.");
  }
  return data;
}

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  let body: FavoriteStampBody;
  try {
    body = (await request.json()) as FavoriteStampBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const userId = body.userId?.trim() || "";
  const placeId = body.placeId?.trim() || "";
  const eventId = body.eventId?.trim() || "";
  const sessionToken = body.sessionToken?.trim() || "";

  if (!userId || !placeId || !eventId) {
    return NextResponse.json(
      { error: "userId, placeId, eventId가 필요합니다." },
      { status: 400 },
    );
  }

  // 🌟 안전장치: 세션 토큰 유효성 검증 (다른 기기 로그인 또는 세션 만료 차단)
  if (userId) {
    const { data: sessionData } = await admin
      .from("site_user_sessions")
      .select("session_token")
      .eq("student_id", userId)
      .maybeSingle();

    if (!sessionData || (sessionToken && sessionData.session_token !== sessionToken)) {
      return NextResponse.json(
        { error: "다른 기기에서 로그인되었거나 세션이 만료되었습니다. 다시 로그인해 주세요." },
        { status: 401 }
      );
    }
  }

  const { data: eventRow, error: eventError } = await admin
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !eventRow) {
    return NextResponse.json({ error: "이벤트를 찾을 수 없습니다." }, { status: 404 });
  }

  const event = eventRow as MapEvent & Record<string, unknown>;
  if (
    !isEventLive({
      is_active: Boolean(event.is_active),
      start_at: (event.start_at as string | null) ?? null,
      end_at: (event.end_at as string | null) ?? null,
    })
  ) {
    return NextResponse.json(
      { stamped: false, progress: null, completed: false },
      { status: 200 },
    );
  }

  const { data: progressRow } = await admin
    .from("user_event_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  const stampedPlaces = asStringArray(progressRow?.stamped_places);
  if (stampedPlaces.includes(placeId)) {
    return NextResponse.json({
      stamped: false,
      progress: progressRow
        ? {
            user_id: userId,
            event_id: eventId,
            current_stamps: progressRow.current_stamps,
            is_completed: progressRow.is_completed,
            stamped_places: stampedPlaces,
            last_stamped_at: progressRow.last_stamped_at,
          }
        : null,
      completed: Boolean(progressRow?.is_completed),
    });
  }

  if (progressRow?.is_completed) {
    return NextResponse.json({
      stamped: false,
      progress: {
        user_id: userId,
        event_id: eventId,
        current_stamps: progressRow.current_stamps,
        is_completed: true,
        stamped_places: stampedPlaces,
        last_stamped_at: progressRow.last_stamped_at,
      },
      completed: true,
    });
  }

  const maxStamps = Math.max(1, Number(event.max_stamps) || 1);
  const nextStamps = (Number(progressRow?.current_stamps) || 0) + 1;
  const completed = nextStamps >= maxStamps;
  const nextPlaces = [...stampedPlaces, placeId];
  const probabilities = parseStepProbabilities(event.step_probabilities, maxStamps);
  const stepProbability = probabilities[nextStamps - 1] ?? 0;
  const stepWon = rollStepWin(stepProbability);

  const gifts: unknown[] = [];
  let completionReward: MapEventReward | null = null;
  try {
    const guaranteedReward = await pickReward(admin, eventId, "GUARANTEED");
    if (guaranteedReward) {
      gifts.push(await insertGift(admin, userId, eventId, guaranteedReward));
    }
    if (stepWon) {
      const stepReward = await pickReward(admin, eventId, "RANDOM_STEP");
      if (stepReward) {
        gifts.push(await insertGift(admin, userId, eventId, stepReward));
      }
    }
    if (completed) {
      completionReward = await pickReward(admin, eventId, "COMPLETION");
      if (completionReward) {
        gifts.push(await insertGift(admin, userId, eventId, completionReward));
      }
    }
  } catch {
    // gift insertion failure is non-fatal for favorite stamps
  }

  const nowIso = new Date().toISOString();
  const progressPayload = {
    user_id: userId,
    event_id: eventId,
    current_stamps: nextStamps,
    is_completed: completed,
    stamped_places: nextPlaces,
    last_stamped_at: nowIso,
    updated_at: nowIso,
  };

  const { data: savedProgress, error: saveError } = progressRow?.id
    ? await admin
        .from("user_event_progress")
        .update(progressPayload)
        .eq("id", progressRow.id)
        .select("*")
        .maybeSingle()
    : await admin.from("user_event_progress").insert(progressPayload).select("*").maybeSingle();

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  const progressResult = {
    user_id: userId,
    event_id: eventId,
    current_stamps: nextStamps,
    is_completed: completed,
    stamped_places: nextPlaces,
    last_stamped_at: nowIso,
    id: savedProgress?.id,
  };

  return NextResponse.json({
    stamped: true,
    progress: progressResult,
    completed,
  });
}