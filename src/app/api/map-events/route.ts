import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  asStringArray,
  DEFAULT_RADIUS_METERS,
  isEventLive,
  parseStepProbabilities,
  type MapEvent,
  type MapEventReward,
} from "@/lib/map-events";

type EventRow = {
  id: string;
  tab_name: string;
  title: string;
  description: string | null;
  is_active: boolean;
  start_at?: string | null;
  end_at?: string | null;
  max_stamps: number;
  step_probabilities: unknown;
  radius_meters?: number | null;
  cooldown_minutes?: number | null;
  stamp_active_img: string | null;
  stamp_inactive_img: string | null;
  marker_icon_img: string | null;
  banner_img: string | null;
  stamp_bar_bg_img?: string | null;
  stamp_bar_bg_color?: string | null;
  completion_badge_img?: string | null;
  guide_text?: string | null;
  win_message?: string | null;
  lose_message?: string | null;
  completion_message?: string | null;
  sort_order: number;
};

function mapEventRow(row: EventRow, extras?: Partial<MapEvent>): MapEvent {
  return {
    id: row.id,
    tab_name: row.tab_name ?? "",
    title: row.title ?? "",
    description: row.description ?? "",
    is_active: Boolean(row.is_active),
    start_at: row.start_at ?? null,
    end_at: row.end_at ?? null,
    max_stamps: Math.max(1, Number(row.max_stamps) || 1),
    step_probabilities: parseStepProbabilities(row.step_probabilities, row.max_stamps),
    radius_meters: Math.max(1, Number(row.radius_meters) || DEFAULT_RADIUS_METERS),
    cooldown_minutes: Math.max(0, Number(row.cooldown_minutes) || 0),
    stamp_active_img: row.stamp_active_img,
    stamp_inactive_img: row.stamp_inactive_img,
    marker_icon_img: row.marker_icon_img,
    banner_img: row.banner_img,
    stamp_bar_bg_img: row.stamp_bar_bg_img ?? null,
    stamp_bar_bg_color: row.stamp_bar_bg_color ?? null,
    completion_badge_img: row.completion_badge_img ?? null,
    guide_text: row.guide_text ?? null,
    win_message: row.win_message ?? null,
    lose_message: row.lose_message ?? null,
    completion_message: row.completion_message ?? null,
    sort_order: Number(row.sort_order) || 0,
    ...extras,
  };
}

export async function GET(request: NextRequest) {
  const includeInactive = request.nextUrl.searchParams.get("all") === "1";
  if (includeInactive) {
    const { adminAuthMiddleware } = await import("@/lib/admin-auth-guard");
    const auth = await adminAuthMiddleware(request, "partners");
    if ("error" in auth) {
      return auth.error;
    }
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  let query = admin
    .from("events")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data: eventRows, error } = await query;
  if (error) {
    return NextResponse.json(
      {
        error:
          error.message.includes("events")
            ? "events 테이블이 없습니다. supabase/map-events.sql 을 실행해 주세요."
            : error.message,
      },
      { status: 500 },
    );
  }

  const events = (eventRows ?? []) as EventRow[];
  const ids = events.map((row) => row.id);
  if (ids.length === 0) {
    return NextResponse.json({ events: [] as MapEvent[] });
  }

  const [{ data: placeRows }, { data: rewardRows }] = await Promise.all([
    admin.from("event_places").select("event_id, partner_id, sort_order").in("event_id", ids),
    admin.from("event_rewards").select("*").in("event_id", ids).order("sort_order", { ascending: true }),
  ]);

  const placesByEvent = new Map<string, string[]>();
  for (const place of placeRows ?? []) {
    const list = placesByEvent.get(place.event_id) ?? [];
    list.push(place.partner_id);
    placesByEvent.set(place.event_id, list);
  }

  const rewardsByEvent = new Map<string, MapEventReward[]>();
  for (const reward of (rewardRows ?? []) as MapEventReward[]) {
    const list = rewardsByEvent.get(reward.event_id) ?? [];
    list.push(reward);
    rewardsByEvent.set(reward.event_id, list);
  }

  const mapped = events.map((row) =>
    mapEventRow(row, {
      partner_ids: placesByEvent.get(row.id) ?? [],
      rewards: rewardsByEvent.get(row.id) ?? [],
    }),
  );

  return NextResponse.json({
    events: includeInactive ? mapped : mapped.filter((event) => isEventLive(event)),
  });
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

  let body: Partial<MapEvent> & { partner_ids?: string[] };
  try {
    body = (await request.json()) as Partial<MapEvent> & { partner_ids?: string[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const tabName = body.tab_name?.trim() || "";
  const title = body.title?.trim() || "";
  if (!tabName || !title) {
    return NextResponse.json({ error: "탭 이름과 이벤트 타이틀이 필요합니다." }, { status: 400 });
  }

  const maxStamps = Math.max(1, Math.floor(Number(body.max_stamps) || 1));
  const payload = {
    tab_name: tabName,
    title,
    description: body.description?.trim() || "",
    is_active: Boolean(body.is_active),
    start_at: body.start_at || null,
    end_at: body.end_at || null,
    max_stamps: maxStamps,
    step_probabilities: parseStepProbabilities(body.step_probabilities, maxStamps),
    radius_meters: Math.max(1, Number(body.radius_meters) || DEFAULT_RADIUS_METERS),
    cooldown_minutes: Math.max(0, Number(body.cooldown_minutes) || 0),
    stamp_active_img: body.stamp_active_img?.trim() || null,
    stamp_inactive_img: body.stamp_inactive_img?.trim() || null,
    marker_icon_img: body.marker_icon_img?.trim() || null,
    banner_img: body.banner_img?.trim() || null,
    stamp_bar_bg_img: body.stamp_bar_bg_img?.trim() || null,
    stamp_bar_bg_color: body.stamp_bar_bg_color?.trim() || null,
    completion_badge_img: body.completion_badge_img?.trim() || null,
    guide_text: body.guide_text?.trim() || null,
    win_message: body.win_message?.trim() || null,
    lose_message: body.lose_message?.trim() || null,
    completion_message: body.completion_message?.trim() || null,
    sort_order: Number(body.sort_order) || 0,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin.from("events").insert(payload).select("*").maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: error?.message || "이벤트 생성에 실패했습니다." }, { status: 500 });
  }

  const partnerIds = asStringArray(body.partner_ids);
  if (partnerIds.length > 0) {
    await admin.from("event_places").insert(
      partnerIds.map((partnerId, index) => ({
        event_id: data.id,
        partner_id: partnerId,
        sort_order: index,
      })),
    );
  }

  return NextResponse.json({ ok: true, event: mapEventRow(data as EventRow, { partner_ids: partnerIds }) });
}
