import { NextRequest, NextResponse } from "next/server";
import { resolvePushSiteOrigin, resolvePushVisuals } from "@/lib/push-asset-url";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { sendWebPushNotification } from "@/lib/web-push-server";

type PartnerEventPushBody = {
  userId?: string; // clientKey 또는 userId
  partnerId: string;
  partnerName: string;
  type: "arrival" | "ready_stamp";
};

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

export async function POST(request: NextRequest) {
  let body: PartnerEventPushBody;

  try {
    body = (await request.json()) as PartnerEventPushBody;
  } catch {
    return NextResponse.json({ error: "유효하지 않은 요청 본문입니다." }, { status: 400 });
  }

  const { userId, partnerId, partnerName, type } = body;

  if (!partnerId || !partnerName || !type) {
    return NextResponse.json(
      { error: "partnerId, partnerName, type은 필수 항목입니다." },
      { status: 400 }
    );
  }

  console.log("파트너 이벤트 푸시 요청:", { userId, partnerId, partnerName, type });

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  // client_key 컬럼 기준으로 구독 정보 조회
  let query = admin.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (userId) {
    query = query.eq("client_key", userId);
  }

  const { data: subscriptions, error: subError } = await query;

  if (subError) {
    console.error("구독 정보 조회 실패:", subError.message);
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log("푸시 구독 정보를 찾을 수 없음:", userId);
    return NextResponse.json({ message: "푸시 구독 정보를 찾을 수 없습니다." }, { status: 200 });
  }

  console.log("구독 정보 조회 완료:", subscriptions.length, "개");

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
  });

  const title = type === "ready_stamp" ? "도장 찍기 가능!" : `${partnerName} 도착!`;
  const pushBody =
    type === "ready_stamp"
      ? `${partnerName}에서 지금 바로 이벤트 도장을 찍어보세요!`
      : `관심 등록한 ${partnerName} 근처에 도착했습니다. 스탬프를 확인해 보세요!`;

  const result = await sendWebPushNotification(subscriptions, {
    title,
    body: pushBody,
    url: `/map?partner=${partnerId}`,
    icon: visuals.icon,
    badge: visuals.badge,
  });

  // 만료된 구독 정보 정리
  if (result.expiredEndpoints && result.expiredEndpoints.length > 0) {
    await cleanExpiredSubscriptions(result.expiredEndpoints);
  }

  const response = {
    success: true,
    result: {
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      message: result.message,
      errors: result.errors,
    },
  };

  console.log("푸시 발송 응답:", response);
  return NextResponse.json(response);
}