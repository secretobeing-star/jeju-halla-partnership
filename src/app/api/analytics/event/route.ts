import { NextRequest, NextResponse } from "next/server";
import { SITE_ANALYTICS_TYPES } from "@/lib/site-analytics";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const TYPES = new Set<string>(SITE_ANALYTICS_TYPES);

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let body: { event_type?: string; path?: string };
  try {
    body = (await request.json()) as { event_type?: string; path?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = String(body.event_type ?? "").trim();
  if (!TYPES.has(eventType)) {
    return NextResponse.json({ error: "알 수 없는 이벤트입니다." }, { status: 400 });
  }

  const path = String(body.path ?? "").trim().slice(0, 200) || "/";
  if (path.startsWith("/admin")) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin.from("site_analytics_events").insert({
    event_type: eventType,
    path,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
