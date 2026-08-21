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

        // 만료되었거나 유효하지 않은 구독 정보(410 Gone, 404 Not Found)는 자동 삭제 대상로 지정
        if (error?.statusCode === 410 || error?.statusCode === 404) {
          expiredEndpoints.push(subscription.endpoint);
        }
      }
    }),
  );

  // 만료된 구독 정보가 있다면 DB(push_subscriptions)에서 자동 정리
  if (admin && expiredEndpoints.length > 0) {
    try {
      const { error: deleteError } = await admin
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);

      if (deleteError) {
        console.error("[WebPush] 만료된 구독 정보 정리 실패:", deleteError.message);
      } else {
        console.log(`[WebPush] 만료된 구독 정보 ${expiredEndpoints.length건} 자동 삭제 완료`);
      }
    } catch (dbErr) {
      console.error("[WebPush] DB 정리 중 예외 발생:", dbErr);
    }
  }

  return { sent, failed, skipped: false };
}
```[cite: 4]

### ✨ 무엇이 개선되었나요?
1. **상세 에러 로깅**: 전송이 실패할 경우 어떤 `endpoint`에서 어떤 에러가 발생했는지 서버 콘솔에 명확하게 찍힙니다.
2. **만료된 구독 자동 청소**: 구글 푸시 서버에서 `410 Gone` 이나 `404 Not Found`를 뱉어내는 **만료된 구독 정보는 Supabase의 `push_subscriptions` 테이블에서 자동으로 삭제**되므로, 찌꺼기 데이터 때문에 에러가 누적되는 현상을 방지합니다[cite: 6].