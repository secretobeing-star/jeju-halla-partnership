import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type ReadBody = {
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

  let body: ReadBody;
  try {
    body = (await request.json()) as ReadBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const clientKey = normalizeClientKey(body.client_key);
  const notificationIds = Array.isArray(body.notification_ids)
    ? body.notification_ids.filter((id) => typeof id === "string" && id.trim())
    : [];

  if (!clientKey || notificationIds.length === 0) {
    return NextResponse.json({ error: "client_key와 notification_ids가 필요합니다." }, { status: 400 });
  }

  const rows = notificationIds.map((notification_id) => ({
    notification_id,
    client_key: clientKey,
  }));

  const { error } = await admin
    .from("site_notification_reads")
    .upsert(rows, { onConflict: "notification_id,client_key", ignoreDuplicates: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
