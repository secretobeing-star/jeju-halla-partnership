import { NextRequest, NextResponse } from "next/server";
import { resolvePushSiteOrigin, resolvePushVisuals } from "@/lib/push-asset-url";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { sendWebPushNotification } from "@/lib/web-push-server";

type PartnerEventPushBody = {
  userId?: string;
  partnerId: string;
  partnerName: string;
  type: "arrival" | "ready_stamp"; // arrival: 도착 안내 / ready_stamp: 도장 찍기 가능
};

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

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  // 1. 해당 유저의 Web Push 구독 정보 조회
  let query = admin.from("push_subscriptions").select("endpoint, p256dh, auth");

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: subscriptions, error: subError } = await query;

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ message: "푸시 구독 정보를 찾을 수 없습니다." }, { status: 200 });
  }

  // 2. 사이트 기본 에셋 및 비주얼 로드
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

  // 3. 상황별 푸시 문구 세팅 ('처' 제외)
  const title =
    type === "ready_stamp"
      ? `도장 찍기 가능!`
      : `${partnerName} 도착!`;

  const pushBody =
    type === "ready_stamp"
      ? `${partnerName}에서 지금 바로 이벤트 도장을 찍어보세요!`
      : `관심 등록한 ${partnerName} 근처에 도착했습니다. 스탬프를 확인해 보세요!`;

  // 4. Web Push 발송
  const result = await sendWebPushNotification(subscriptions, {
    title,
    body: pushBody,
    url: `/map?partner=${partnerId}`,
    icon: visuals.icon,
    badge: visuals.badge,
  });

  return NextResponse.json({ success: true, result });
}