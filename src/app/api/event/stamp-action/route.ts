import { NextRequest, NextResponse } from "next/server";
import {
  postPlainJsonWebhook,
  type EventLogWebhookPayload,
} from "@/lib/google-sheets-student";
import {
  asStringArray,
  DEFAULT_RADIUS_METERS,
  haversineMeters,
  isEventLive,
  parseStepProbabilities,
  resolveFrameValue,
  rollStepWin,
  type MapEvent,
  type MapEventReward,
  type MapEventRewardType,
} from "@/lib/map-events";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type StampBody = {
  eventId?: string;
  placeId?: string;
  placeName?: string;
  userId?: string;
  studentId?: string;
  name?: string;
  department?: string;
  latitude?: number;
  longitude?: number;
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
  if (pool.length === 0) {
    return null;
  }
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
    throw new Error(
      error?.message?.includes("user_gifts")
        ? "user_gifts 테이블이 없습니다. supabase/map-events-gifts.sql 을 실행해 주세요."
        : error?.message || "선물함 지급에 실패했습니다.",
    );
  }
  return data;
}

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  let body: StampBody;
  try {
    body = (await request.json()) as StampBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const eventId = body.eventId?.trim() || "";
  const placeId = body.placeId?.trim() || "";
  const placeName = body.placeName?.trim() || placeId;
  const userId = body.userId?.trim() || body.studentId?.trim() || "";
  const studentId = body.studentId?.trim() || userId;
  const name = body.name?.trim() || "";
  const department = body.department?.trim() || "";
  const userLat = Number(body.latitude);
  const userLng = Number(body.longitude);

  if (!eventId || !placeId || !userId || !studentId || !name) {
    return NextResponse.json(
      { error: "로그인 세션(학번, 이름)과 eventId, placeId가 필요합니다." },
      { status: 401 },
    );
  }
  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
    return NextResponse.json({ error: "위치 정보가 필요합니다. GPS를 허용해 주세요." }, { status: 400 });
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
    return NextResponse.json({ error: "이벤트 기간이 아니거나 비활성화되었습니다." }, { status: 400 });
  }

  const { data: places } = await admin
    .from("event_places")
    .select("partner_id")
    .eq("event_id", eventId);
  const allowedPlaces = (places ?? []).map((row) => String(row.partner_id));
  if (allowedPlaces.length > 0 && !allowedPlaces.includes(placeId)) {
    return NextResponse.json({ error: "이 이벤트에서 도장을 찍을 수 없는 장소입니다." }, { status: 400 });
  }

  const { data: partner } = await admin
    .from("partners")
    .select("id, name, latitude, longitude")
    .eq("id", placeId)
    .maybeSingle();

  const placeLat = Number(partner?.latitude);
  const placeLng = Number(partner?.longitude);
  if (!Number.isFinite(placeLat) || !Number.isFinite(placeLng)) {
    return NextResponse.json({ error: "이 제휴처의 지도 좌표가 없습니다." }, { status: 400 });
  }

  const radius = Math.max(1, Number(event.radius_meters) || DEFAULT_RADIUS_METERS);
  const distance = haversineMeters(userLat, userLng, placeLat, placeLng);
  if (distance > radius) {
    const customMsg = typeof event.distance_error_message === "string" && event.distance_error_message.trim()
      ? event.distance_error_message.trim()
      : null;
    const distanceMsg = customMsg 
      ? customMsg.replace('{distance}', Math.round(distance).toString()).replace('{radius}', radius.toString())
      : `제휴처 ${Math.round(radius)}m 안에서만 도장을 찍을 수 있습니다. (현재 약 ${Math.round(distance)}m)`;
    return NextResponse.json(
      {
        error: distanceMsg,
        distanceMeters: Math.round(distance),
        radiusMeters: radius,
        distanceError: true,
      },
      { status: 403 },
    );
  }

  const { data: progressRow, error: progressError } = await admin
    .from("user_event_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (progressError) {
    return NextResponse.json(
      { error: `이벤트 진행 정보를 확인하지 못했습니다: ${progressError.message}` },
      { status: 500 },
    );
  }

  const stampedPlaces = asStringArray(progressRow?.stamped_places);
  if (stampedPlaces.includes(placeId)) {
    return NextResponse.json({ error: "이미 도장을 찍은 장소입니다." }, { status: 409 });
  }
  if (progressRow?.is_completed) {
    return NextResponse.json({ error: "이미 완주한 이벤트입니다." }, { status: 409 });
  }

  // 서버에서 실제 DB의 마지막 도장 시간을 기준으로 쿨다운을 강제합니다.
  // 이벤트 설정이 30이면 30분, 60이면 60분이 자동 적용됩니다.
  const cooldownMinutes = Math.max(0, Number(event.cooldown_minutes) || 0);
  const lastStampedMs = progressRow?.last_stamped_at
    ? Date.parse(String(progressRow.last_stamped_at))
    : NaN;

  if (cooldownMinutes > 0 && Number.isFinite(lastStampedMs)) {
    const cooldownMs = cooldownMinutes * 60_000;
    const remainMs = lastStampedMs + cooldownMs - Date.now();

    if (remainMs > 0) {
      const remainMin = Math.floor(remainMs / 60_000);
      const remainSec = Math.max(1, Math.ceil((remainMs % 60_000) / 1000));
      const timeText =
        remainMin > 0 ? `${remainMin}분 ${remainSec}초` : `${remainSec}초`;

      return NextResponse.json(
        {
          error: `${timeText} 후에 도장을 찍을 수 있습니다.`,
          cooldownError: true,
          cooldownMs: remainMs,
        },
        { status: 429 },
      );
    }
  }

  const maxStamps = Math.max(1, Number(event.max_stamps) || 1);
  const nextStamps = (Number(progressRow?.current_stamps) || 0) + 1;
  const stampIndex = nextStamps;
  const completed = nextStamps >= maxStamps;
  const nextPlaces = [...stampedPlaces, placeId];
  const probabilities = parseStepProbabilities(event.step_probabilities, maxStamps);
  const stepProbability = probabilities[stampIndex - 1] ?? 0;
  const stepWon = rollStepWin(stepProbability);

  const gifts: unknown[] = [];
  let guaranteedReward: MapEventReward | null = null;
  let stepReward: MapEventReward | null = null;
  let completionReward: MapEventReward | null = null;
  try {
    guaranteedReward = await pickReward(admin, eventId, "GUARANTEED");
    if (guaranteedReward) {
      gifts.push(await insertGift(admin, userId, eventId, guaranteedReward));
    }
    if (stepWon) {
      stepReward = await pickReward(admin, eventId, "RANDOM_STEP");
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
  } catch (giftError) {
    return NextResponse.json(
      { error: giftError instanceof Error ? giftError.message : "선물함 지급에 실패했습니다." },
      { status: 500 },
    );
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

  let savedProgress: Record<string, unknown> | null = null;
  let saveError: { message: string } | null = null;

  if (progressRow?.id) {
    // 이미 진행 행이 있다면, 처음 읽었던 last_stamped_at이 그대로일 때만
    // 저장합니다. 다른 요청이 먼저 저장했다면 이 UPDATE가 0행이 되어
    // 중복 도장을 막을 수 있습니다.
    let guardedUpdate = admin
      .from("user_event_progress")
      .update(progressPayload)
      .eq("id", progressRow.id);

    if (progressRow.last_stamped_at) {
      guardedUpdate = guardedUpdate.eq(
        "last_stamped_at",
        progressRow.last_stamped_at,
      );
    } else {
      guardedUpdate = guardedUpdate.is("last_stamped_at", null);
    }

    const result = await guardedUpdate
      .select("*")
      .maybeSingle();

    savedProgress = (result.data as Record<string, unknown> | null) ?? null;
    saveError = result.error
      ? { message: result.error.message }
      : null;

    if (!saveError && !savedProgress) {
      return NextResponse.json(
        {
          error: "도장이 이미 처리되었거나 쿨다운이 시작되었습니다. 잠시 후 다시 확인해 주세요.",
          cooldownError: true,
        },
        { status: 429 },
      );
    }
  } else {
    const result = await admin
      .from("user_event_progress")
      .insert(progressPayload)
      .select("*")
      .maybeSingle();

    savedProgress = (result.data as Record<string, unknown> | null) ?? null;
    saveError = result.error
      ? { message: result.error.message }
      : null;

    if (!saveError && !savedProgress) {
      return NextResponse.json(
        {
          error: "도장 저장에 실패했습니다.",
        },
        { status: 500 },
      );
    }
  }

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  const gifted = gifts.filter(Boolean);
  const webhookPayload: EventLogWebhookPayload = {
    type: "event_log",
    event_title: String(event.title ?? ""),
    department,
    student_id: studentId,
    name,
    place_name: partner?.name || placeName,
    stamp_index: stampIndex,
    is_won: gifted.length > 0,
    reward_name: [guaranteedReward?.reward_name, stepReward?.reward_name, completionReward?.reward_name]
      .filter(Boolean)
      .join(" / "),
  };
  void postPlainJsonWebhook({ ...webhookPayload });

  return NextResponse.json({
    ok: true,
    progress: {
      user_id: userId,
      event_id: eventId,
      current_stamps: nextStamps,
      is_completed: completed,
      stamped_places: nextPlaces,
      last_stamped_at: nowIso,
      id: savedProgress?.id,
    },
    stampIndex,
    distanceMeters: Math.round(distance),
    gifts: gifted,
    giftCount: gifted.length,
    guaranteed: {
      reward: guaranteedReward,
    },
    step: {
      probability: stepProbability,
      won: Boolean(stepReward),
      reward: stepReward,
    },
    completion: {
      reached: completed,
      reward: completionReward,
    },
    popup: completed
      ? "completion"
      : stepReward || guaranteedReward
        ? "win"
        : "lose",
    messages: {
      win: event.win_popup_message?.trim() || event.win_message || "선물함으로 보상이 지급되었습니다!",
      lose: event.lose_popup_message?.trim() || event.lose_message || "아쉽지만 이번엔 당첨되지 않았습니다.",
      completion: event.completion_popup_message?.trim() || event.completion_message || "완주 보상이 선물함으로 지급되었습니다!",
    },
  });
}