import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type DismissBody = {
  client_key?: string;
  notification_ids?: string[];
};

function normalizeClientKey(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length >= 8 ? trimmed : null;
}

export async function POST(request: Request) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 503 });
  }

  let body: DismissBody;
  try {
    body = (await request.json()) as DismissBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const clientKey = normalizeClientKey(body.client_key);
  const notificationIds = Array.isArray(body.notification_ids)
    ? body.notification_ids.filter((id) => typeof id === "string" && id.trim())
    : [];

  if (!clientKey || notificationIds.length === 0) {
    return NextResponse.json(
      { error: "client_key와 notification_ids가 필요합니다." },
      { status: 400 },
    );
  }

  const rows = notificationIds.map((notification_id) => ({
    notification_id,
    client_key: clientKey,
  }));

  const { error } = await admin
    .from("site_notification_dismissals")
    .upsert(rows, { onConflict: "notification_id,client_key", ignoreDuplicates: true });

  if (error) {
    const hint = error.message.includes("site_notification_dismissals")
      ? "Supabase SQL Editor에서 supabase/site-notification-dismissals.sql을 실행해 주세요."
      : error.message;
    return NextResponse.json({ error: hint }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
