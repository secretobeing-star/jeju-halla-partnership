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
    .from("user_favorites")
    .select("place_id")
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ placeIds: [] as string[] });
  }

  return NextResponse.json({
    placeIds: (data ?? []).map((row) => String(row.place_id)),
  });
}

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  let body: { userId?: string; placeId?: string; favorited?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const userId = body.userId?.trim() || "";
  const placeId = body.placeId?.trim() || "";
  if (!userId || !placeId) {
    return NextResponse.json({ error: "userId와 placeId가 필요합니다." }, { status: 400 });
  }

  if (body.favorited === false) {
    await admin.from("user_favorites").delete().eq("user_id", userId).eq("place_id", placeId);
  } else {
    await admin.from("user_favorites").upsert(
      { user_id: userId, place_id: placeId },
      { onConflict: "user_id,place_id" },
    );
  }

  return NextResponse.json({ ok: true, favorited: body.favorited !== false });
}
