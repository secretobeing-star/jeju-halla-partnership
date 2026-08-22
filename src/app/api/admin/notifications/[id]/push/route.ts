import { NextRequest, NextResponse } from "next/server";
import { rowToAdminAccess } from "@/lib/admin-permissions";
import { getRequestUser, resolveAdminAccess } from "@/lib/admin-permissions-server";
import { resolvePushSiteOrigin, resolvePushVisuals } from "@/lib/push-asset-url";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { sendWebPushNotification } from "@/lib/web-push-server";

export const runtime = "nodejs";

const ADMIN_NOTIFICATION_PUSH_ROUTE_VERSION = "admin-notification-push-2026-08-22-v1";

type RouteParams = { params: Promise<{ id: string }> };

function getAccessToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
}

async function cleanExpiredSubscriptions(expiredEndpoints: string[]) {
  if (expiredEndpoints.length === 0) return;

  const admin = createSupabaseAdmin();
  if (!admin) {
    console.error("만료된 구독 정리 실패: Supabase admin 설정 없음");
    return;
  }

  try {
    console.log("만료된 구독 정보 정리 시작:", expiredEndpoints.length, "개");
    
    const { error } = await admin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);

    if (error) {
      console.error("만료된 구독 정보 정리 실패:", error.message);
    } else {
      console.log("만료된 구독 정보 정리 완료:", expiredEndpoints.length, "개 삭제됨");
    }
  } catch (error) {
    console.error("만료된 구독 정보 정리 중 오류:", error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const user = await getRequestUser(getAccessToken(request));

  console.log("관리자 푸시 알림 발송 요청:", { id, user: user?.email });

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
    console.error("알림 조회 실패:", fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!notification) {
    console.error("알림을 찾을 수 없음:", id);
    return NextResponse.json({ error: "알림을 찾을 수 없습니다." }, { status: 404 });
  }

  console.log("알림 조회 완료:", notification.title);

  const { data: subscriptions, error: subError } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (subError) {
    console.error("구독 정보 조회 실패:", subError.message);
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  console.log("구독 정보 조회 완료:", subscriptions?.length || 0, "개");

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

  console.log("푸시 발송 시작:", {
    title: notification.title,
    body: notification.body,
    subscriptionCount: subscriptions?.length || 0,
  });

  const result = await sendWebPushNotification(subscriptions ?? [], {
    title: notification.title,
    body: notification.body,
    url: notification.link_url,
    icon: visuals.icon,
    badge: visuals.badge,
    image: visuals.image,
  });

  console.log("푸시 발송 결과:", result);

  if (result.expiredEndpoints && result.expiredEndpoints.length > 0) {
    await cleanExpiredSubscriptions(result.expiredEndpoints);
  }

  if (!result.skipped && result.sent > 0) {
    await admin
      .from("site_notifications")
      .update({ push_sent_at: new Date().toISOString() })
      .eq("id", id);
    console.log("알림 발송 시간 업데이트 완료");
  }

  const response = {
    ...result,
    result: {
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      message: result.message ?? null,
      expiredEndpoints: result.expiredEndpoints ?? [],
      errors: result.errors ?? [],
      diagnosticVersion: result.diagnosticVersion ?? null,
      endpointHostCounts: result.endpointHostCounts ?? {},
      errorDetails: result.errorDetails ?? [],
      errorDetailsTruncated: result.errorDetailsTruncated ?? false,
    },
    notificationId: id,
    notificationTitle: notification.title,
    diagnostics: {
      routeVersion: ADMIN_NOTIFICATION_PUSH_ROUTE_VERSION,
      routeRuntime: runtime,
      subscriptionCount: subscriptions?.length ?? 0,
      siteOrigin,
      sendDiagnosticVersion: result.diagnosticVersion ?? null,
    },
  };

  console.log("푸시 발송 응답:", response);
  return NextResponse.json(response);
}
```[cite: 5]