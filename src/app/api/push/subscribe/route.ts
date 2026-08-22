import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type SubscribeBody = {
  client_key?: string;
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
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

  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const clientKey = normalizeClientKey(body.client_key);
  const endpoint = body.endpoint?.trim() ?? "";
  const p256dh = body.keys?.p256dh?.trim() ?? "";
  const auth = body.keys?.auth?.trim() ?? "";

  if (!clientKey || !endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "구독 정보가 올바르지 않습니다." }, { status: 400 });
  }

  // 🌟 upsert 시 client_key 기준으로 저장
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      client_key: clientKey,
      endpoint,
      p256dh,
      auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    const hint = error.message.includes("push_subscriptions")
      ? "Supabase SQL Editor에서 supabase/site-member-features.sql을 실행해 주세요."
      : error.message;
    return NextResponse.json({ error: hint }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 503 });
  }

  let body: { endpoint?: string };
  try {
    body = (await request.json()) as { endpoint?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim() ?? "";
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint가 필요합니다." }, { status: 400 });
  }

  const { error } = await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}