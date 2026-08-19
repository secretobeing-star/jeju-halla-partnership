import { NextRequest, NextResponse } from "next/server";
import { rowToAdminAccess } from "@/lib/admin-permissions";
import { getRequestUser, resolveAdminAccess } from "@/lib/admin-permissions-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  deleteExpiredSiteNotifications,
  expiresAtFromAutoDeleteDays,
  parseAutoDeleteDays,
} from "@/lib/site-notifications-expiry";

function getAccessToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
}

async function requireSiteBasicAdmin(request: NextRequest) {
  const user = await getRequestUser(getAccessToken(request));
  if (!user?.email) {
    return { error: NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 }) };
  }

  const { row, error: accessError } = await resolveAdminAccess(user.id, user.email);
  if (accessError) {
    return { error: NextResponse.json({ error: accessError }, { status: 500 }) };
  }

  const access = row ? rowToAdminAccess(row) : null;
  if (!access?.is_active || !access.permissions.settings) {
    return { error: NextResponse.json({ error: "사이트 설정 권한이 없습니다." }, { status: 403 }) };
  }

  return { user };
}

export async function GET(request: NextRequest) {
  const auth = await requireSiteBasicAdmin(request);
  if ("error" in auth) {
    return auth.error;
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." }, { status: 503 });
  }

  await deleteExpiredSiteNotifications(admin);

  const { data, error } = await admin
    .from("site_notifications")
    .select(
      "id, title, body, link_url, icon_url, image_url, is_active, published_at, expires_at, push_sent_at, created_at",
    )
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notifications: data ?? [] });
}

type CreateBody = {
  title?: string;
  body?: string;
  link_url?: string | null;
  icon_url?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  published_at?: string | null;
  expires_at?: string | null;
  auto_delete_days?: number | string | null;
};

export async function POST(request: NextRequest) {
  const auth = await requireSiteBasicAdmin(request);
  if ("error" in auth) {
    return auth.error;
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const title = body.title?.trim() ?? "";
  const content = body.body?.trim() ?? "";
  if (!title || !content) {
    return NextResponse.json({ error: "제목과 내용을 입력해 주세요." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." }, { status: 503 });
  }

  const publishedAt = body.published_at ?? new Date().toISOString();
  const autoDeleteDays = parseAutoDeleteDays(body.auto_delete_days);
  const expiresAt =
    body.expires_at !== undefined
      ? body.expires_at
      : expiresAtFromAutoDeleteDays(publishedAt, autoDeleteDays);

  const { data, error } = await admin
    .from("site_notifications")
    .insert({
      title,
      body: content,
      link_url: body.link_url?.trim() || null,
      icon_url: body.icon_url?.trim() || null,
      image_url: body.image_url?.trim() || null,
      is_active: body.is_active ?? true,
      published_at: publishedAt,
      expires_at: expiresAt,
    })
    .select(
      "id, title, body, link_url, icon_url, image_url, is_active, published_at, expires_at, push_sent_at, created_at",
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notification: data });
}
