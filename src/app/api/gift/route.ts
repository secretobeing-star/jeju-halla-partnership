import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const userId = request.nextUrl.searchParams.get("userId")?.trim() || "";
  if (!userId) {
    return NextResponse.json({ error: "userId가 필요합니다." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("user_gifts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({
      gifts: [] as unknown[],
      pendingCount: 0,
      error:
        error.message.includes("user_gifts")
          ? "user_gifts 테이블이 없습니다. supabase/map-events-gifts.sql 을 실행해 주세요."
          : error.message,
    });
  }

  const gifts = data ?? [];
  return NextResponse.json({
    gifts,
    pendingCount: gifts.filter((gift) => !gift.is_claimed).length,
  });
}

export async function DELETE(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const userId = request.nextUrl.searchParams.get("userId")?.trim() || "";
  const giftId = request.nextUrl.searchParams.get("giftId")?.trim() || "";
  
  if (!userId || !giftId) {
    return NextResponse.json({ error: "userId와 giftId가 필요합니다." }, { status: 400 });
  }

  const { error } = await admin
    .from("user_gifts")
    .delete()
    .eq("user_id", userId)
    .eq("id", giftId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

