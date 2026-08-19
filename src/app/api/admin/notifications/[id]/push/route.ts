import { NextRequest, NextResponse } from "next/server";
import { rowToAdminAccess } from "@/lib/admin-permissions";
import { getRequestUser, resolveAdminAccess } from "@/lib/admin-permissions-server";
import { resolvePushSiteOrigin, resolvePushVisuals } from "@/lib/push-asset-url";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { sendWebPushNotification } from "@/lib/web-push-server";

type RouteParams = { params: Promise<{ id: string }> };

function getAccessToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

  const { data: notification, error: fetchError } = await admin
    .from("site_notifications")
    .select("id, title, body, link_url, icon_url, image_url")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!notification) {
    return NextResponse.json({ error: "알림을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: subscriptions, error: subError } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  const { data: siteSettings } = await admin
    .from("site_settings")
    .select("main_domain, site_favicon_url, site_push_icon_url, site_pwa_icon_url")
    .eq("id", 1)
    .maybeSingle();

  const siteOrigin = resolvePushSiteOrigin(siteSettings?.main_domain);
  const visuals = resolvePushVisuals({
    siteOrigin,
    siteFaviconUrl: siteSettings?.site_favicon_url,
    sitePushIconUrl: siteSettings?.site_push_icon_url,
    sitePwaIconUrl: siteSettings?.site_pwa_icon_url,
    notificationIconUrl: notification.icon_url,
    notificationImageUrl: notification.image_url,
  });

  const result = await sendWebPushNotification(subscriptions ?? [], {
    title: notification.title,
    body: notification.body,
    url: notification.link_url,
    icon: visuals.icon,
    badge: visuals.badge,
    image: visuals.image,
  });

  if (!result.skipped && result.sent > 0) {
    await admin
      .from("site_notifications")
      .update({ push_sent_at: new Date().toISOString() })
      .eq("id", id);
  }

  return NextResponse.json({ result });
}
