import { NextRequest, NextResponse } from "next/server";
import { rowToAdminAccess } from "@/lib/admin-permissions";
import { getRequestUser, resolveAdminAccess } from "@/lib/admin-permissions-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  expiresAtFromAutoDeleteDays,
  parseAutoDeleteDays,
} from "@/lib/site-notifications-expiry";

type RouteParams = { params: Promise<{ id: string }> };

function getAccessToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
}

type PatchBody = {
  is_active?: boolean;
  title?: string;
  body?: string;
  link_url?: string | null;
  icon_url?: string | null;
  image_url?: string | null;
  expires_at?: string | null;
  auto_delete_days?: number | string | null;
};

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
  if (!access?.is_active || !access.permissions.settings) {
    return NextResponse.json({ error: "사이트 설정 권한이 없습니다." }, { status: 403 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.is_active === "boolean") {
    updates.is_active = body.is_active;
  }
  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "제목을 입력해 주세요." }, { status: 400 });
    }
    updates.title = title;
  }
  if (typeof body.body === "string") {
    const content = body.body.trim();
    if (!content) {
      return NextResponse.json({ error: "내용을 입력해 주세요." }, { status: 400 });
    }
    updates.body = content;
  }
  if (body.link_url !== undefined) {
    updates.link_url = body.link_url?.trim() || null;
  }
  if (body.icon_url !== undefined) {
    updates.icon_url = body.icon_url?.trim() || null;
  }
  if (body.image_url !== undefined) {
    updates.image_url = body.image_url?.trim() || null;
  }
  if (body.expires_at !== undefined) {
    updates.expires_at = body.expires_at;
  } else if (body.auto_delete_days !== undefined) {
    const adminForLookup = createSupabaseAdmin();
    if (!adminForLookup) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." }, { status: 503 });
    }

    const { data: existing, error: existingError } = await adminForLookup
      .from("site_notifications")
      .select("published_at")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    if (!existing?.published_at) {
      return NextResponse.json({ error: "알림을 찾을 수 없습니다." }, { status: 404 });
    }

    updates.expires_at = expiresAtFromAutoDeleteDays(
      existing.published_at,
      parseAutoDeleteDays(body.auto_delete_days),
    );
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." }, { status: 503 });
  }

  const { data, error } = await admin
    .from("site_notifications")
    .update(updates)
    .eq("id", id)
    .select(
      "id, title, body, link_url, icon_url, image_url, is_active, published_at, expires_at, push_sent_at",
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notification: data });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
  if (!access?.is_active || !access.permissions.settings) {
    return NextResponse.json({ error: "사이트 설정 권한이 없습니다." }, { status: 403 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." }, { status: 503 });
  }

  const { error } = await admin.from("site_notifications").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
