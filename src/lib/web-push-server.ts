import { createSupabaseAdmin } from "@/lib/supabase-admin";

const WEB_PUSH_DIAGNOSTIC_VERSION = "web-push-diagnostics-2026-08-22-v1";

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

type WebPushErrorDetail = {
  endpoint: string;
  endpointHost: string | null;
  stage: "request_generation" | "push_service_response" | "transport_error";
  statusCode: number | null;
  responseBody: string | null;
  responseHeaders: Record<string, unknown> | null;
  request: {
    endpoint: string;
    endpointHost: string | null;
    audience: string | null;
    method: string | null;
    bodyLength: number;
    hasAuthorizationHeader: boolean;
    authorizationScheme: string | null;
    hasCryptoKeyHeader: boolean;
    contentEncoding: string | null;
    ttl: number | string | null;
    vapidSubject: string | null;
  } | null;
  error: unknown;
};

export type WebPushSendResult = {
  sent: number;
  failed: number;
  skipped: boolean;
  message?: string;
  expiredEndpoints?: string[];
  errors?: string[];
  diagnosticVersion?: string;
  endpointHostCounts?: Record<string, number>;
  errorDetails?: WebPushErrorDetail[];
  errorDetailsTruncated?: boolean;
};

function getEndpointHost(endpoint: string) {
  try {
    return new URL(endpoint).host;
  } catch {
    return null;
  }
}

function toSerializable(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Buffer.isBuffer(value)) {
    return `[Buffer length=${value.length}]`;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => toSerializable(item, depth + 1));
  }
  if (value instanceof Error) {
    const out: Record<string, unknown> = {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
    for (const key of Object.getOwnPropertyNames(value).slice(0, 30)) {
      if (key in out) continue;
      try {
        out[key] = toSerializable((value as Record<string, unknown>)[key], depth + 1);
      } catch {
        out[key] = "[unreadable]";
      }
    }
    return out;
  }
  if (typeof value === "object") {
    if (depth >= 2) return "[object]";
    const out: Record<string, unknown> = {};
    for (const key of Object.getOwnPropertyNames(value).slice(0, 30)) {
      try {
        out[key] = toSerializable((value as Record<string, unknown>)[key], depth + 1);
      } catch {
        out[key] = "[unreadable]";
      }
    }
    return out;
  }
  return String(value);
}

function summarizeRequestDetails(requestDetails: any, vapidSubject: string) {
  const endpoint = typeof requestDetails?.endpoint === "string" ? requestDetails.endpoint : "";
  const headers = requestDetails?.headers ?? {};
  const authorization = typeof headers.Authorization === "string" ? headers.Authorization : null;

  return {
    endpoint,
    endpointHost: endpoint ? getEndpointHost(endpoint) : null,
    audience: endpoint ? new URL(endpoint).origin : null,
    method: typeof requestDetails?.method === "string" ? requestDetails.method : null,
    bodyLength: Buffer.isBuffer(requestDetails?.body) ? requestDetails.body.length : 0,
    hasAuthorizationHeader: Boolean(authorization),
    authorizationScheme: authorization ? authorization.split(" ", 1)[0] ?? null : null,
    hasCryptoKeyHeader: typeof headers["Crypto-Key"] === "string",
    contentEncoding: typeof headers["Content-Encoding"] === "string" ? headers["Content-Encoding"] : null,
    ttl: typeof headers.TTL === "number" || typeof headers.TTL === "string" ? headers.TTL : null,
    vapidSubject,
  };
}

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
  const errors: string[] = [];
  const errorDetails: WebPushErrorDetail[] = [];
  const endpointHostCounts: Record<string, number> = {};

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const host = getEndpointHost(subscription.endpoint) || "unknown";
      endpointHostCounts[host] = (endpointHostCounts[host] || 0) + 1;

      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      let requestDiagnostic = null;

      try {
        requestDiagnostic = summarizeRequestDetails(
          webpush.generateRequestDetails(pushSubscription, body),
          vapid.subject,
        );
      } catch (error) {
        failed += 1;
        const detail: WebPushErrorDetail = {
          endpoint: subscription.endpoint,
          endpointHost: getEndpointHost(subscription.endpoint),
          stage: "request_generation",
          statusCode: null,
          responseBody: null,
          responseHeaders: null,
          request: null,
          error: toSerializable(error),
        };

        errors.push(`[stage=request_generation] [status=unknown] ${String((detail.error as any)?.message ?? detail.error)}`);
        errorDetails.push(detail);
        return;
      }

      try {
        await webpush.sendNotification(pushSubscription, body);
        sent += 1;
      } catch (error: any) {
        failed += 1;

        const statusCode = typeof error?.statusCode === "number" ? error.statusCode : null;
        const detail: WebPushErrorDetail = {
          endpoint: subscription.endpoint,
          endpointHost: getEndpointHost(subscription.endpoint),
          stage: statusCode == null ? "transport_error" : "push_service_response",
          statusCode,
          responseBody:
            typeof error?.body === "string"
              ? error.body
              : error?.body
                ? JSON.stringify(error.body)
                : null,
          responseHeaders: error?.headers && typeof error.headers === "object" ? error.headers : null,
          request: requestDiagnostic,
          error: toSerializable(error),
        };

        errors.push(
          [
            `[stage=${detail.stage}]`,
            `[status=${detail.statusCode ?? "unknown"}]`,
            detail.endpointHost ? `[endpointHost=${detail.endpointHost}]` : null,
            error?.message ?? String(error),
            detail.responseBody ? `body=${detail.responseBody}` : null,
          ]
            .filter(Boolean)
            .join(" | "),
        );

        errorDetails.push(detail);

        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(subscription.endpoint);
        }
      }
    }),
  );

  if (admin && expiredEndpoints.length > 0) {
    try {
      await admin
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    } catch {}
  }

  return {
    sent,
    failed,
    skipped: false,
    expiredEndpoints,
    errors,
    diagnosticVersion: WEB_PUSH_DIAGNOSTIC_VERSION,
    endpointHostCounts,
    errorDetails,
    errorDetailsTruncated: failed > errorDetails.length,
  };
}