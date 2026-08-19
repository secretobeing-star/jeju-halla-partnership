import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { isRewardCategory, isRewardType } from "@/lib/map-events";

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
  if (isRewardType(body.reward_type)) patch.reward_type = body.reward_type;
  if (isRewardCategory(body.category)) patch.category = body.category;
  if (typeof body.reward_name === "string") patch.reward_name = body.reward_name.trim();
  if (body.reward_img !== undefined) patch.reward_img = String(body.reward_img ?? "").trim() || null;
  if (body.item_value !== undefined) patch.item_value = String(body.item_value ?? "").trim() || null;
  if (body.frame_css_value !== undefined) {
    const frame = String(body.frame_css_value ?? "").trim() || null;
    patch.frame_css_value = frame;
    patch.item_value = frame;
  }
  if (body.stock !== undefined) patch.stock = Math.max(0, Math.floor(Number(body.stock) || 0));
  if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order) || 0;

  const { data, error } = await admin
    .from("event_rewards")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "보상을 수정하지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reward: data });
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

  const { error } = await admin.from("event_rewards").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
