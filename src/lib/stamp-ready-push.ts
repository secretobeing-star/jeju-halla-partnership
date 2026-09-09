import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { resolvePushSiteOrigin, resolvePushVisuals } from "@/lib/push-asset-url";
import { sendWebPushNotification } from "@/lib/web-push-server";

type PushSubRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function uniqueKeys(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim() ?? "").filter((value) => value.length >= 8))];
}

export async function findPushSubscriptionsByKeys(keys: string[]): Promise<PushSubRow[]> {
  const admin = createSupabaseAdmin();
  if (!admin || keys.length === 0) {
    return [];
  }

  const { data, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("client_key", keys);

  if (error || !data) {
    console.error("스탬프 준비 푸시 구독 조회 실패:", error?.message);
    return [];
  }

  const seen = new Set<string>();
  return data.filter((row) => {
    if (!row.endpoint || seen.has(row.endpoint)) {
      return false;
    }
    seen.add(row.endpoint);
    return true;
  });
}

export async function sendStampReadyPush(options: {
  lookupKeys: Array<string | null | undefined>;
  partnerId: string;
  partnerName: string;
  eventTitle?: string | null;
}) {
  const keys = uniqueKeys(options.lookupKeys);
  const subscriptions = await findPushSubscriptionsByKeys(keys);
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, skipped: true as const, message: "푸시 구독 정보를 찾을 수 없습니다." };
  }

  const admin = createSupabaseAdmin();
  const { data: siteSettings } = admin
    ? await admin
        .from("site_settings")
        .select("main_domain, site_favicon_url, site_push_icon_url, site_pwa_icon_url")
        .eq("id", 1)
        .maybeSingle()
    : { data: null };

  const siteOrigin = resolvePushSiteOrigin(siteSettings?.main_domain);
  const visuals = resolvePushVisuals({
    siteOrigin,
    siteFaviconUrl: siteSettings?.site_favicon_url,
    sitePushIconUrl: siteSettings?.site_push_icon_url,
    sitePwaIconUrl: siteSettings?.site_pwa_icon_url,
  });

  const partnerName = options.partnerName.trim() || "제휴처";
  const eventTitle = options.eventTitle?.trim();

  return sendWebPushNotification(subscriptions, {
    title: "도장 찍기 가능!",
    body: eventTitle
      ? `${partnerName}에서 ${eventTitle} 도장을 찍어보세요!`
      : `${partnerName}에서 지금 바로 이벤트 도장을 찍어보세요!`,
    url: "/",
    icon: visuals.icon,
    badge: visuals.badge,
    tag: "stamp-ready",
  });
}

export async function scheduleStampReadyPush(options: {
  userId: string;
  eventId: string;
  clientKey?: string | null;
  partnerId: string;
  partnerName: string;
  cooldownEndTime: string;
}) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return;
  }

  const payload = {
    user_id: options.userId,
    event_id: options.eventId,
    cooldown_end_time: options.cooldownEndTime,
    partner_id: options.partnerId,
    partner_name: options.partnerName,
    client_key: options.clientKey?.trim() || null,
    ready_push_sent_at: null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("user_event_timer_state").upsert(payload, {
    onConflict: "user_id,event_id",
  });

  if (error) {
    await admin.from("user_event_timer_state").upsert(
      {
        user_id: options.userId,
        event_id: options.eventId,
        cooldown_end_time: options.cooldownEndTime,
        updated_at: payload.updated_at,
      },
      { onConflict: "user_id,event_id" },
    );
  }
}

export async function markStampReadyPushSent(userId: string, eventId: string) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return;
  }

  const { error } = await admin
    .from("user_event_timer_state")
    .update({ ready_push_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("event_id", eventId);

  if (error) {
    console.error("스탬프 준비 푸시 전송 시각 저장 실패:", error.message);
  }
}

export async function dispatchDueStampReadyPushes() {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return { scanned: 0, sent: 0, skipped: 0, errors: ["Supabase admin 없음"] };
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("user_event_timer_state")
    .select("user_id, event_id, partner_id, partner_name, client_key, cooldown_end_time, ready_push_sent_at")
    .lte("cooldown_end_time", nowIso)
    .not("cooldown_end_time", "is", null)
    .is("ready_push_sent_at", null)
    .limit(100);

  if (error) {
    return { scanned: 0, sent: 0, skipped: 0, errors: [error.message] };
  }

  const rows = data ?? [];
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const eventId = String(row.event_id ?? "");
    const userId = String(row.user_id ?? "");
    if (!userId || !eventId) {
      skipped += 1;
      continue;
    }

    const { data: eventRow } = await admin
      .from("events")
      .select("title")
      .eq("id", eventId)
      .maybeSingle();

    const result = await sendStampReadyPush({
      lookupKeys: [row.client_key, userId],
      partnerId: String(row.partner_id ?? ""),
      partnerName: String(row.partner_name ?? "제휴처"),
      eventTitle: eventRow?.title ?? null,
    });

    if (result.sent > 0) {
      sent += result.sent;
      await markStampReadyPushSent(userId, eventId);
    } else if (result.skipped) {
      skipped += 1;
      await markStampReadyPushSent(userId, eventId);
    } else {
      errors.push(result.message || `user=${userId} 전송 실패`);
    }
  }

  return { scanned: rows.length, sent, skipped, errors };
}
