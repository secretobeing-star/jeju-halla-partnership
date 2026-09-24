import { NextRequest, NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/student-session-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { normalizeUserCustomCategoryList } from "@/lib/user-custom-categories";

export async function GET(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const requestedUserId = request.nextUrl.searchParams.get("userId")?.trim() || "";
  const auth = await requireStudentSession(request, [requestedUserId]);
  if (!auth.ok) {
    return auth.response;
  }

  const { data, error } = await admin
    .from("user_custom_categories")
    .select("categories")
    .eq("user_id", auth.studentId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ categories: [] as const });
  }

  return NextResponse.json({
    categories: normalizeUserCustomCategoryList(data?.categories),
  });
}

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  let body: { userId?: string; categories?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const auth = await requireStudentSession(request, [body.userId]);
  if (!auth.ok) {
    return auth.response;
  }

  const categories = normalizeUserCustomCategoryList(body.categories);
  const { error } = await admin.from("user_custom_categories").upsert(
    {
      user_id: auth.studentId,
      categories,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ error: "내 카테고리를 저장하지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, categories });
}
