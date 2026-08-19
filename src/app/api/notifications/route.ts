import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { deleteExpiredSiteNotifications } from "@/lib/site-notifications-expiry";
import type { SiteNotificationItem } from "@/lib/site-notifications-types";

function normalizeClientKey(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length >= 8 ? trimmed : null;
}

export async function GET(request: Request) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 503 });
  }

  await deleteExpiredSiteNotifications(admin);

  const clientKey = normalizeClientKey(new URL(request.url).searchParams.get("client_key"));
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("site_notifications")
    .select("id, title, body, link_url, icon_url, image_url, published_at")
    .eq("is_active", true)
    .lte("published_at", now)
    .or(`expires_at.is.null,expires_at.gt."${now}"`)
    .order("published_at", { ascending: false })
    .limit(30);

  if (error) {
    const hint = error.message.includes("site_notifications")
      ? "Supabase SQL Editor에서 supabase/site-member-features.sql을 실행해 주세요."
      : error.message;
    return NextResponse.json({ error: hint }, { status: 500 });
  }

  let readIds = new Set<string>();
  let dismissedIds = new Set<string>();
  if (clientKey && data && data.length > 0) {
    const ids = data.map((row) => row.id);
    const [{ data: reads }, { data: dismissals, error: dismissalsError }] = await Promise.all([
      admin
        .from("site_notification_reads")
        .select("notification_id")
        .eq("client_key", clientKey)
        .in("notification_id", ids),
      admin
        .from("site_notification_dismissals")
        .select("notification_id")
        .eq("client_key", clientKey)
        .in("notification_id", ids),
    ]);

    if (dismissalsError && !dismissalsError.message.includes("site_notification_dismissals")) {
      return NextResponse.json({ error: dismissalsError.message }, { status: 500 });
    }

    readIds = new Set((reads ?? []).map((row) => row.notification_id));
    dismissedIds = new Set((dismissals ?? []).map((row) => row.notification_id));
  }

  const notifications: SiteNotificationItem[] = (data ?? [])
    .filter((row) => !dismissedIds.has(row.id))
    .map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      link_url: row.link_url,
      icon_url: row.icon_url,
      image_url: row.image_url,
      published_at: row.published_at,
      read: readIds.has(row.id),
    }));

  const unreadCount = notifications.filter((item) => !item.read).length;

  return NextResponse.json({ notifications, unreadCount });
}
