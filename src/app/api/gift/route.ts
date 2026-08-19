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

