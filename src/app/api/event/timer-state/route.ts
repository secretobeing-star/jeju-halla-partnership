import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const userId = request.nextUrl.searchParams.get("userId")?.trim() || "";
  const eventId = request.nextUrl.searchParams.get("eventId")?.trim() || "";
  if (!userId || !eventId) {
    return NextResponse.json({ error: "userId와 eventId가 필요합니다." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("user_event_timer_state")
    .select("*")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ 
      cooldown_end_time: null,
      intro_confirmed: false 
    });
  }

  return NextResponse.json({
    cooldown_end_time: data.cooldown_end_time,
    intro_confirmed: Boolean(data.intro_confirmed),
  });
}

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const body = await request.json();
  const userId = body.userId?.trim() || "";
  const eventId = body.eventId?.trim() || "";
  const cooldownEndTime = body.cooldownEndTime || null;
  const introConfirmed = body.introConfirmed || false;

  if (!userId || !eventId) {
    return NextResponse.json({ error: "userId와 eventId가 필요합니다." }, { status: 400 });
  }

  const { error } = await admin
    .from("user_event_timer_state")
    .upsert({
      user_id: userId,
      event_id: eventId,
      cooldown_end_time: cooldownEndTime,
      intro_confirmed: introConfirmed,
    }, {
      onConflict: "user_id,event_id"
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const userId = request.nextUrl.searchParams.get("userId")?.trim() || "";
  const eventId = request.nextUrl.searchParams.get("eventId")?.trim() || "";
  if (!userId || !eventId) {
    return NextResponse.json({ error: "userId와 eventId가 필요합니다." }, { status: 400 });
  }

  const { error } = await admin
    .from("user_event_timer_state")
    .delete()
    .eq("user_id", userId)
    .eq("event_id", eventId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}