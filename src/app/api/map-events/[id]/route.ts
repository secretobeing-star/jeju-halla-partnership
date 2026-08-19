import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { asStringArray, DEFAULT_RADIUS_METERS, parseStepProbabilities } from "@/lib/map-events";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { adminAuthMiddleware } = await import("@/lib/admin-auth-guard");
  const auth = await adminAuthMiddleware(request, "partners");
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.tab_name === "string") patch.tab_name = body.tab_name.trim();
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.description === "string") patch.description = body.description.trim();
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (body.start_at !== undefined) patch.start_at = body.start_at ? String(body.start_at) : null;
  if (body.end_at !== undefined) patch.end_at = body.end_at ? String(body.end_at) : null;
  if (body.max_stamps !== undefined) {
    patch.max_stamps = Math.max(1, Math.floor(Number(body.max_stamps) || 1));
  }
  if (body.radius_meters !== undefined) {
    patch.radius_meters = Math.max(1, Number(body.radius_meters) || DEFAULT_RADIUS_METERS);
  }
  if (body.cooldown_minutes !== undefined) {
    patch.cooldown_minutes = Math.max(0, Number(body.cooldown_minutes) || 0);
  }
  if (typeof body.guide_text === "string") patch.guide_text = body.guide_text.trim() || null;
  if (typeof body.win_message === "string") patch.win_message = body.win_message.trim() || null;
  if (typeof body.lose_message === "string") patch.lose_message = body.lose_message.trim() || null;
  if (typeof body.completion_message === "string") {
    patch.completion_message = body.completion_message.trim() || null;
  }
  if (body.step_probabilities !== undefined || body.max_stamps !== undefined) {
    const maxStamps = Number(patch.max_stamps ?? body.max_stamps) || 1;
    patch.step_probabilities = parseStepProbabilities(body.step_probabilities, maxStamps);
  }
  if (body.stamp_active_img !== undefined) {
    patch.stamp_active_img = String(body.stamp_active_img ?? "").trim() || null;
  }
  if (body.stamp_inactive_img !== undefined) {
    patch.stamp_inactive_img = String(body.stamp_inactive_img ?? "").trim() || null;
  }
  if (body.marker_icon_img !== undefined) {
    patch.marker_icon_img = String(body.marker_icon_img ?? "").trim() || null;
  }
  if (body.banner_img !== undefined) {
    patch.banner_img = String(body.banner_img ?? "").trim() || null;
  }
  if (body.stamp_bar_bg_img !== undefined) {
    patch.stamp_bar_bg_img = String(body.stamp_bar_bg_img ?? "").trim() || null;
  }
  if (body.stamp_bar_bg_color !== undefined) {
    patch.stamp_bar_bg_color = String(body.stamp_bar_bg_color ?? "").trim() || null;
  }
  if (body.completion_badge_img !== undefined) {
    patch.completion_badge_img = String(body.completion_badge_img ?? "").trim() || null;
  }
  if (body.sort_order !== undefined) {
    patch.sort_order = Number(body.sort_order) || 0;
  }

  const { data, error } = await admin
    .from("events")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "이벤트를 수정하지 못했습니다." }, { status: 500 });
  }

  if (Array.isArray(body.partner_ids)) {
    const partnerIds = asStringArray(body.partner_ids);
    await admin.from("event_places").delete().eq("event_id", id);
    if (partnerIds.length > 0) {
      await admin.from("event_places").insert(
        partnerIds.map((partnerId, index) => ({
          event_id: id,
          partner_id: partnerId,
          sort_order: index,
        })),
      );
    }
  }

  return NextResponse.json({ ok: true, event: data });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { adminAuthMiddleware } = await import("@/lib/admin-auth-guard");
  const auth = await adminAuthMiddleware(request, "partners");
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const { error } = await admin.from("events").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
