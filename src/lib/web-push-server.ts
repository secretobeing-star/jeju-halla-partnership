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
  errors?: Array<{ endpoint: string; error: string; statusCode?: number }>;
  expiredEndpoints?: string[];
};

function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@chu.gg";

  console.log("VAPID 환경 변수 검증:", {
    publicKey: publicKey ? "설정됨" : "설정되지 않음",
    privateKey: privateKey ? "설정됨" : "설정되지 않음",
    subject,
  });

  if (!publicKey || !privateKey) {
    console.error("VAPID 환경 변수 누락:", { publicKey: !!publicKey, privateKey: !!privateKey });
    return null;
  }

  return { publicKey, privateKey, subject };
}

export async function sendWebPushNotification(
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload,
): Promise<WebPushSendResult> {
  console.log("푸시 알림 발송 시작:", {
    subscriptionCount: subscriptions.length,
    payload: { title: payload.title, body: payload.body },
  });

  const vapid = getVapidConfig();
  if (!vapid) {
    const errorResult = {
      sent: 0,
      failed: 0,
      skipped: true,
      message: "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY 환경 변수가 설정되지 않았습니다.",
    };
    console.error("푸시 발송 실패:", errorResult);
    return errorResult;
  }

  if (subscriptions.length === 0) {
    const emptyResult = { sent: 0, failed: 0, skipped: true, message: "푸시 구독자가 없습니다." };
    console.warn("푸시 발송 스킵:", emptyResult);
    return emptyResult;
  }

  let webpush: typeof import("web-push");
  try {
    webpush = await import("web-push");
    console.log("web-push 패키지 로드 성공");
  } catch {
    const errorResult = {
      sent: 0,
      failed: 0,
      skipped: true,
      message: "web-push 패키지가 설치되지 않았습니다. npm install web-push 후 다시 시도해 주세요.",
    };
    console.error("푸시 발송 실패:", errorResult);
    return errorResult;
  }

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  console.log("VAPID 설정 완료:", { subject: vapid.subject });

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
    icon: payload.icon ?? null,
    badge: payload.badge ?? null,
    image: payload.image ?? null,
  });

  let sent = 0;
  let failed = 0;
  const errors: Array<{ endpoint: string; error: string; statusCode?: number }> = [];
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        console.log(`푸시 발송 시도: ${subscription.endpoint.substring(0, 50)}...`);
        
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
        console.log(`푸시 발송 성공: ${subscription.endpoint.substring(0, 50)}...`);
      } catch (error) {
        failed += 1;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const statusCode = (error as any)?.statusCode;
        
        console.error(`푸시 발송 실패: ${subscription.endpoint.substring(0, 50)}...`, {
          error: errorMessage,
          statusCode,
        });

        errors.push({
          endpoint: subscription.endpoint,
          error: errorMessage,
          statusCode,
        });

        // 만료된 구독 정보 처리 (410 Gone, 404 Not Found)
        if (statusCode === 410 || statusCode === 404) {
          console.warn(`만료된 구독 정보 발견: ${subscription.endpoint.substring(0, 50)}... (status: ${statusCode})`);
          expiredEndpoints.push(subscription.endpoint);
        }
      }
    }),
  );

  const result: WebPushSendResult = {
    sent,
    failed,
    skipped: false,
    message: `발송 완료: ${sent}성공, ${failed}실패`,
    errors: errors.length > 0 ? errors : undefined,
    expiredEndpoints: expiredEndpoints.length > 0 ? expiredEndpoints : undefined,
  };

  console.log("푸시 발송 결과:", result);
  return result;
}
