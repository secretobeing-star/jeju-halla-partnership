import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { creditStudentGold } from "@/lib/season-pass-server";
import { findPushSubscriptionsByKeys } from "@/lib/stamp-ready-push";
import { resolvePushSiteOrigin, resolvePushVisuals } from "@/lib/push-asset-url";
import { sendWebPushNotification } from "@/lib/web-push-server";
import {
  findCardFrameById,
  loadCardFrameCatalogFromDb,
} from "@/lib/student-card-frames";
import {
  DEFAULT_LOGIN_REWARD,
  getKstDateTime,
  hasLoginRewardGrant,
  isLoginRewardWindowOpen,
  mapLoginRewardSettings,
  serializeLoginRewardWeekdays,
  type LoginRewardSettings,
} from "@/lib/login-reward";

export async function loadLoginRewardSettings(): Promise<LoginRewardSettings> {
  const admin = createSupabaseAdmin();
  if (!admin) return DEFAULT_LOGIN_REWARD;
  const { data, error } = await admin.from("site_login_reward_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return DEFAULT_LOGIN_REWARD;
  return mapLoginRewardSettings(data as Record<string, unknown>);
}

async function resolveCostumeName(frameId: string) {
  if (!frameId) return "";
  const catalog = await loadCardFrameCatalogFromDb().catch(() => []);
  const frame = findCardFrameById(catalog, frameId);
  if (!frame) {
    throw new Error("코스튬을 찾을 수 없습니다.");
  }
  return frame.name?.trim() || frame.id;
}

async function sendLoginRewardPush(
  studentId: string,
  extraPushKeys: string[],
  settings: LoginRewardSettings,
  claimedOn: string,
  costumeName: string,
) {
  if (!settings.pushEnabled) return;
  const subscriptions = await findPushSubscriptionsByKeys([studentId, ...extraPushKeys]);
  if (subscriptions.length === 0) return;

  const admin = createSupabaseAdmin();
  if (!admin) return;
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
  const body = settings.pushBody
    .replace("{gold}", String(settings.goldAmount))
    .replace("{costume}", costumeName || settings.costumeFrameId)
    .replace("{coupon}", settings.couponCode);
  await sendWebPushNotification(subscriptions, {
    title: settings.pushTitle,
    body,
    url: "/",
    icon: visuals.icon,
    badge: visuals.badge,
    tag: `login-reward-${claimedOn}`,
  });
}

async function broadcastLoginRewardPush(settings: LoginRewardSettings, claimedOn: string, costumeName: string) {
  if (!settings.pushEnabled) return { sent: 0 };
  const admin = createSupabaseAdmin();
  if (!admin) return { sent: 0 };
  const { data } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth").limit(4000);
  const seen = new Set<string>();
  const subscriptions = (data ?? []).filter((row) => {
    if (!row.endpoint || seen.has(row.endpoint)) return false;
    seen.add(row.endpoint);
    return Boolean(row.p256dh && row.auth);
  });
  if (subscriptions.length === 0) return { sent: 0 };

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
  const body = settings.pushBody
    .replace("{gold}", String(settings.goldAmount))
    .replace("{costume}", costumeName || settings.costumeFrameId)
    .replace("{coupon}", settings.couponCode);
  const result = await sendWebPushNotification(subscriptions, {
    title: settings.pushTitle,
    body,
    url: "/",
    icon: visuals.icon,
    badge: visuals.badge,
    tag: `login-reward-${claimedOn}`,
  });
  return { sent: result.sent };
}

export async function claimDailyLoginReward(
  studentIdRaw: string,
  extraPushKeys: string[] = [],
  options: { sendPush?: boolean } = {},
) {
  const studentId = studentIdRaw.trim();
  if (!studentId) {
    return { claimed: false as const, reason: "no-student" };
  }
  const settings = await loadLoginRewardSettings();
  if (!settings.enabled || !hasLoginRewardGrant(settings)) {
    return { claimed: false as const, reason: "disabled" };
  }
  if (!isLoginRewardWindowOpen(settings)) {
    return { claimed: false as const, reason: "not-yet" };
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return { claimed: false as const, reason: "no-admin" };
  }

  let costumeName = "";
  try {
    costumeName = await resolveCostumeName(settings.costumeFrameId);
  } catch (error) {
    return { claimed: false as const, reason: error instanceof Error ? error.message : "코스튬을 찾을 수 없습니다." };
  }

  const claimedOn = getKstDateTime().ymd;
  const { error } = await admin.from("site_login_reward_claims").insert({
    student_id: studentId,
    claimed_on: claimedOn,
    gold_amount: settings.goldAmount,
    costume_frame_id: settings.costumeFrameId || null,
    coupon_code: settings.couponCode || null,
  });
  if (error) {
    if (error.code === "23505") {
      return {
        claimed: false as const,
        reason: "already",
        goldAmount: settings.goldAmount,
        costumeFrameId: settings.costumeFrameId || null,
        couponCode: settings.couponCode || null,
      };
    }
    return { claimed: false as const, reason: error.message };
  }

  const inboxRows: Array<Record<string, unknown>> = [];
  if (settings.costumeFrameId) {
    inboxRows.push({
      student_id: studentId,
      reward_type: "frame",
      frame_id: settings.costumeFrameId,
      coupon_code: null,
      gold_amount: null,
      title: `접속 보상 · ${costumeName}`,
      message: "오늘의 접속 보상으로 지급된 코스튬입니다.",
      status: "pending",
      created_by: "login-reward",
    });
  }
  if (settings.couponCode) {
    inboxRows.push({
      student_id: studentId,
      reward_type: "coupon",
      frame_id: null,
      coupon_code: settings.couponCode,
      gold_amount: null,
      title: "접속 보상 · 쿠폰",
      message: "오늘의 접속 보상으로 지급된 쿠폰입니다.",
      status: "pending",
      created_by: "login-reward",
    });
  }

  try {
    if (inboxRows.length > 0) {
      const { error: inboxError } = await admin.from("site_student_rewards").insert(inboxRows);
      if (inboxError) {
        throw new Error(
          inboxError.message.includes("site_student_rewards")
            ? "보상 테이블이 없습니다. supabase/site-student-rewards.sql 을 실행해 주세요."
            : inboxError.message,
        );
      }
    }
    if (settings.goldAmount >= 1) {
      await creditStudentGold(studentId, settings.goldAmount);
    }
  } catch (grantError) {
    await admin.from("site_login_reward_claims").delete().eq("student_id", studentId).eq("claimed_on", claimedOn);
    if (inboxRows.length > 0) {
      await admin
        .from("site_student_rewards")
        .delete()
        .eq("student_id", studentId)
        .eq("created_by", "login-reward")
        .eq("status", "pending")
        .gte("created_at", new Date(Date.now() - 60_000).toISOString());
    }
    return {
      claimed: false as const,
      reason: grantError instanceof Error ? grantError.message : "접속 보상 지급 실패",
    };
  }

  if (options.sendPush !== false) {
    await sendLoginRewardPush(studentId, extraPushKeys, settings, claimedOn, costumeName);
  }

  return {
    claimed: true as const,
    goldAmount: settings.goldAmount,
    costumeFrameId: settings.costumeFrameId || null,
    couponCode: settings.couponCode || null,
  };
}

async function listKnownStudentIds() {
  const admin = createSupabaseAdmin();
  if (!admin) return [];
  const ids = new Set<string>();
  const [{ data: wallets }, { data: progress }] = await Promise.all([
    admin.from("user_gold_wallet").select("user_id").limit(5000),
    admin.from("user_season_progress").select("user_id").limit(5000),
  ]);
  for (const row of wallets ?? []) {
    const id = String(row.user_id ?? "").trim();
    if (id) ids.add(id);
  }
  for (const row of progress ?? []) {
    const id = String(row.user_id ?? "").trim();
    if (id) ids.add(id);
  }
  return [...ids];
}

export async function dispatchScheduledLoginRewards() {
  const settings = await loadLoginRewardSettings();
  if (settings.scheduleMode !== "scheduled") {
    return { skipped: true as const, reason: "on-login" };
  }
  if (!isLoginRewardWindowOpen(settings)) {
    return { skipped: true as const, reason: "not-yet" };
  }

  const today = getKstDateTime().ymd;
  if (settings.lastDispatchedOn === today) {
    return { skipped: true as const, reason: "already-dispatched", date: today };
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return { skipped: true as const, reason: "no-admin" };
  }

  const { data: locked, error: lockError } = await admin
    .from("site_login_reward_settings")
    .update({ last_dispatched_on: today, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .or(`last_dispatched_on.is.null,last_dispatched_on.neq.${today}`)
    .select("id")
    .maybeSingle();
  if (lockError) {
    return { skipped: true as const, reason: lockError.message };
  }
  if (!locked) {
    return { skipped: true as const, reason: "already-dispatched", date: today };
  }

  let costumeName = "";
  try {
    costumeName = await resolveCostumeName(settings.costumeFrameId);
  } catch {
    costumeName = settings.costumeFrameId;
  }

  const studentIds = await listKnownStudentIds();
  let claimed = 0;
  let already = 0;
  for (const studentId of studentIds) {
    const result = await claimDailyLoginReward(studentId, [], { sendPush: false });
    if (result.claimed) claimed += 1;
    else if (result.reason === "already") already += 1;
  }

  const push = await broadcastLoginRewardPush(settings, today, costumeName);
  return {
    skipped: false as const,
    date: today,
    students: studentIds.length,
    claimed,
    already,
    pushSent: push.sent,
  };
}

export function loginRewardSettingsToRow(body: Partial<LoginRewardSettings>) {
  const weekdays = serializeLoginRewardWeekdays(body.weekdays ?? []);
  return {
    id: 1,
    enabled: Boolean(body.enabled),
    gold_amount: Math.max(0, Math.floor(Number(body.goldAmount) || 0)),
    costume_frame_id: String(body.costumeFrameId ?? "").trim() || null,
    coupon_code: String(body.couponCode ?? "").trim() || null,
    push_enabled: body.pushEnabled !== false,
    push_title: String(body.pushTitle ?? "").trim() || DEFAULT_LOGIN_REWARD.pushTitle,
    push_body: String(body.pushBody ?? "").trim() || DEFAULT_LOGIN_REWARD.pushBody,
    schedule_mode: body.scheduleMode === "scheduled" ? "scheduled" : "on_login",
    send_hour: Math.min(23, Math.max(0, Math.floor(Number(body.sendHour) || 0))),
    send_minute: Math.min(59, Math.max(0, Math.floor(Number(body.sendMinute) || 0))),
    start_date: String(body.startDate ?? "").trim() || null,
    end_date: String(body.endDate ?? "").trim() || null,
    weekdays: weekdays || null,
    updated_at: new Date().toISOString(),
  };
}
