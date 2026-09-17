import { NextRequest, NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/student-session-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const requestedUserId = request.nextUrl.searchParams.get("userId")?.trim() || "";
  const auth = await requireStudentSession(request, [requestedUserId]);
  if (!auth.ok) {
    return auth.response;
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const { data, error } = await admin
    .from("user_gifts")
    .select("*")
    .eq("user_id", auth.studentId)
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
  const requestedUserId = request.nextUrl.searchParams.get("userId")?.trim() || "";
  const giftId = request.nextUrl.searchParams.get("giftId")?.trim() || "";
  const auth = await requireStudentSession(request, [requestedUserId]);
  if (!auth.ok) {
    return auth.response;
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  if (!giftId) {
    return NextResponse.json({ error: "giftId가 필요합니다." }, { status: 400 });
  }

  const { error } = await admin
    .from("user_gifts")
    .delete()
    .eq("user_id", auth.studentId)
    .eq("id", giftId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
