import { NextRequest, NextResponse } from "next/server";
import { rowToAdminAccess } from "@/lib/admin-permissions";
import { getRequestUser, resolveAdminAccess } from "@/lib/admin-permissions-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type RouteParams = { params: Promise<{ id: string }> };

function getAccessToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const user = await getRequestUser(getAccessToken(request));

  if (!user?.email) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const { row, error: accessError } = await resolveAdminAccess(user.id, user.email);
  if (accessError) {
    return NextResponse.json({ error: accessError }, { status: 500 });
  }

  const access = row ? rowToAdminAccess(row) : null;
  if (!access?.is_active || !access.permissions.posts) {
    return NextResponse.json({ error: "게시글 관리 권한이 없습니다." }, { status: 403 });
  }

  let body: { pinned?: boolean };
  try {
    body = (await request.json()) as { pinned?: boolean };
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const nextPinned = Boolean(body.pinned);
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const { data, error } = await admin
    .from("board_posts")
    .update({
      is_pinned: nextPinned,
      pinned_at: nextPinned ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("id, is_pinned, pinned_at")
    .maybeSingle();

  if (error) {
    const message =
      error.message.includes("is_pinned") || error.message.includes("pinned_at")
        ? "board_posts.is_pinned 컬럼이 없습니다. Supabase SQL Editor에서 supabase/fix-board-pinned-complete.sql을 실행해 주세요."
        : error.message;

    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ post: data });
}
