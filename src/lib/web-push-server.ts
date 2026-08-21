import { createSupabaseAdmin } from "@/lib/supabase-admin";

type PushPayload = {
  title: string;
  body: string;
  url?: string | null;
  icon?: string | null;
  badge?: string | null;
  image?: string | null;
};

type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type WebPushSendResult = {
  sent: number;
  failed: number;
  skipped: boolean;
  message?: string;
};

function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@chu.gg";

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

export async function sendWebPushNotification(
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload,
): Promise<WebPushSendResult> {
  const vapid = getVapidConfig();
  if (!vapid) {
    return {
      sent: 0,
      failed: 0,
      skipped: true,
      message: "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY 환경 변수가 설정되지 않았습니다.",
    };
  }

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, skipped: true, message: "푸시 구독자가 없습니다." };
  }

  let webpush: typeof import("web-push");
  try {
    webpush = await import("web-push");
  } catch {
    return {
      sent: 0,
      failed: 0,
      skipped: true,
      message: "web-push 패키지가 설치되지 않았습니다. npm install web-push 후 다시 시도해 주세요.",
    };
  }

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
    icon: payload.icon ?? null,
    badge: payload.badge ?? null,
    image: payload.image ?? null,
  });

  const admin = createSupabaseAdmin();
  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          body,
        );
        sent += 1;
      } catch (error: any) {
        failed += 1;
        console.error(`[WebPush] 전송 실패 (Endpoint: ${subscription.endpoint}):`, error?.message || error);

        if (error?.statusCode === 410 || error?.statusCode === 404) {
          expiredEndpoints.push(subscription.endpoint);
        }
      }
    }),
  );

  if (admin && expiredEndpoints.length > 0) {
    try {
      const { error: deleteError } = await admin
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);

      if (deleteError) {
        console.error("[WebPush] 만료된 구독 정보 정리 실패:", deleteError.message);
      } else {
        console.log(`[WebPush] 만료된 구독 정보 ${expiredEndpoints.length}건 자동 삭제 완료`);
      }
    } catch (dbErr) {
      console.error("[WebPush] DB 정리 중 예외 발생:", dbErr);
    }
  }

  return { sent, failed, skipped: false };
}