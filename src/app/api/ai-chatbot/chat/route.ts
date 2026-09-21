import { NextRequest, NextResponse } from "next/server";
import {
  asAiChatbotProvider,
  buildChatbotReply,
  chatbotNeedsLiveEvents,
  mapAiChatbotSettings,
  type ChatbotIntent,
  type ChatbotLiveEventLine,
} from "@/lib/ai-chatbot";
import { isEventLive } from "@/lib/map-events";
import { isGoldShopCatalogSeason, isSeasonLive } from "@/lib/season-pass";
import { formatSiteEventDateRange, resolveSiteEventBoardFilter } from "@/lib/site-events";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type ChatMessage = { role: "user" | "assistant"; content: string };

const hits = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function allow(key: string) {
  const now = Date.now();
  const current = hits.get(key);
  if (!current || current.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (current.count >= 40) return false;
  current.count += 1;
  return true;
}

async function loadLiveEventLines(
  admin: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
): Promise<ChatbotLiveEventLine[]> {
  const [seasonsRes, mapRes, siteRes] = await Promise.all([
    admin.from("seasons").select("id, title, starts_at, ends_at, is_active, code, ui_image_url, bg_image_url").eq("is_active", true),
    admin.from("events").select("id, title, start_at, end_at, is_active, banner_img").eq("is_active", true),
    admin.from("site_events").select("id, title, starts_at, ends_at, is_active, list_type, thumbnail_url").eq("is_active", true),
  ]);

  const lines: ChatbotLiveEventLine[] = [];

  for (const row of (seasonsRes.data ?? []) as Array<{
    id?: string;
    title?: string;
    starts_at?: string | null;
    ends_at?: string | null;
    code?: string | null;
    ui_image_url?: string | null;
    bg_image_url?: string | null;
  }>) {
    if (isGoldShopCatalogSeason(row)) continue;
    if (!isSeasonLive({ starts_at: row.starts_at ?? null, ends_at: row.ends_at ?? null })) continue;
    const title = String(row.title ?? "").trim();
    if (!title) continue;
    lines.push({
      group: "시즌패스",
      title,
      period: formatSiteEventDateRange(row.starts_at, row.ends_at),
      id: String(row.id ?? title),
      openKind: "season",
      image_url: row.ui_image_url?.trim() || row.bg_image_url?.trim() || null,
    });
  }

  for (const row of (mapRes.data ?? []) as Array<{
    id?: string;
    title?: string;
    start_at?: string | null;
    end_at?: string | null;
    is_active?: boolean;
    banner_img?: string | null;
  }>) {
    if (
      !isEventLive({
        is_active: row.is_active !== false,
        start_at: row.start_at ?? null,
        end_at: row.end_at ?? null,
      })
    ) {
      continue;
    }
    const title = String(row.title ?? "").trim();
    if (!title) continue;
    lines.push({
      group: "지도 이벤트",
      title,
      period: formatSiteEventDateRange(row.start_at, row.end_at),
      id: String(row.id ?? title),
      openKind: "map",
      image_url: row.banner_img?.trim() || null,
    });
  }

  for (const row of (siteRes.data ?? []) as Array<{
    id?: string;
    title?: string;
    starts_at?: string | null;
    ends_at?: string | null;
    list_type?: string | null;
    thumbnail_url?: string | null;
  }>) {
    if (
      resolveSiteEventBoardFilter({
        list_type: row.list_type === "winners" ? "winners" : "event",
        starts_at: row.starts_at,
        ends_at: row.ends_at,
      }) !== "ongoing"
    ) {
      continue;
    }
    const title = String(row.title ?? "").trim();
    if (!title) continue;
    lines.push({
      group: "사이트 이벤트",
      title,
      period: formatSiteEventDateRange(row.starts_at, row.ends_at),
      id: String(row.id ?? title),
      openKind: "site",
      image_url: row.thumbnail_url?.trim() || null,
    });
  }

  return lines;
}

async function partnerContext(admin: NonNullable<ReturnType<typeof createSupabaseAdmin>>) {
  const { data } = await admin
    .from("partners")
    .select("name, category, region, benefit")
    .eq("is_active", true)
    .order("name")
    .limit(120);
  const rows = (data ?? []) as {
    name?: string;
    category?: string;
    region?: string;
    benefit?: string;
  }[];
  if (rows.length === 0) return "등록된 제휴 업체가 없습니다.";
  return rows
    .map((row) => {
      const benefit = String(row.benefit ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
      return `- ${row.name ?? ""} (${row.category ?? ""} / ${row.region ?? ""}): ${benefit}`;
    })
    .join("\n");
}

async function completeOpenAi(apiKey: string, system: string, messages: ChatMessage[]) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 500,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || "OpenAI 요청에 실패했습니다.");
  }
  return payload.choices?.[0]?.message?.content?.trim() || "답변을 만들지 못했습니다.";
}

async function completeGemini(apiKey: string, system: string, messages: ChatMessage[]) {
  const contents = messages.map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.content }],
  }));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
      }),
    },
  );
  const payload = (await response.json()) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || "Gemini 요청에 실패했습니다.");
  }
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() ||
    "답변을 만들지 못했습니다.";
}

export async function POST(request: NextRequest) {
  if (!allow(clientKey(request))) {
    return NextResponse.json({ error: "잠시 후 다시 질문해 주세요." }, { status: 429 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  let body: { messages?: ChatMessage[]; intent?: ChatbotIntent | null };
  try {
    body = (await request.json()) as { messages?: ChatMessage[]; intent?: ChatbotIntent | null };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter(
      (item) =>
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim(),
    )
    .slice(-8)
    .map((item) => ({ role: item.role, content: item.content.trim().slice(0, 800) }));

  if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
    return NextResponse.json({ error: "질문을 입력해 주세요." }, { status: 400 });
  }

  const { data, error } = await admin.from("ai_chatbot_settings").select("*").eq("id", 1).maybeSingle();
  const settings = mapAiChatbotSettings((data as Record<string, unknown> | null) ?? { enabled: true });
  if (error && !String(error.message).includes("ai_chatbot_settings") && !data) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!settings.enabled && data) {
    return NextResponse.json({ error: "챗봇이 꺼져 있습니다." }, { status: 403 });
  }

  const question = messages[messages.length - 1]?.content ?? "";
  const intent =
    body.intent &&
    (body.intent.type === "partner_list" ||
      body.intent.type === "partner_search" ||
      body.intent.type === "meal_recommend")
      ? {
          type: body.intent.type,
          query: typeof body.intent.query === "string" ? body.intent.query.slice(0, 80) : undefined,
          offset: Math.max(0, Math.min(400, Number(body.intent.offset) || 0)),
          seed: Math.max(0, Math.floor(Number(body.intent.seed) || 0)) || undefined,
          region: typeof body.intent.region === "string" ? body.intent.region.slice(0, 40) : undefined,
        }
      : null;

  const partners =
    (
      await admin
        .from("partners")
        .select("id, name, category, region, benefit, address, image_url")
        .eq("is_active", true)
        .order("name")
        .limit(400)
    ).data ?? [];

  const liveEvents = chatbotNeedsLiveEvents(question, settings.lessons, intent)
    ? await loadLiveEventLines(admin)
    : [];
  const structured = buildChatbotReply(question, partners, intent, settings.lessons, liveEvents);
  let reply = structured.text;

  const apiKey =
    settings.api_key.trim() ||
    (settings.provider === "gemini"
      ? process.env.GEMINI_API_KEY?.trim() || ""
      : process.env.OPENAI_API_KEY?.trim() || "");

  const hasStructured = Boolean(
    structured.choices?.length || structured.cards?.length || structured.moreIntent,
  );

  if (apiKey && !hasStructured && !intent && !structured.taught) {
    const context = await partnerContext(admin);
    const system = `당신은 제주한라대학교 제휴 사이트 안내 봇입니다. 한국어로 짧고 친절하게 답하세요.
제휴 업체, 혜택, 위치, 시즌패스, 골드상점, 도장 이벤트, 게시판(글쓰기·댓글·신고), 학생증 로그인 안내만 합니다.
모르는 내용은 추측하지 말고, 사이트에서 확인하라고 안내하세요.
아래는 현재 제휴 목록입니다.
${context}`;
    try {
      const provider = asAiChatbotProvider(settings.provider);
      reply =
        provider === "gemini"
          ? await completeGemini(apiKey, system, messages)
          : await completeOpenAi(apiKey, system, messages);
    } catch {
      // 외부 API가 실패하면 사이트 안내로 답합니다.
    }
  }

  const missedQuery = structured.missedPartnerQuery?.trim();
  void admin.from("site_analytics_events").insert({
    event_type: "chatbot_message",
    path: `q:${(missedQuery || question).slice(0, 180)}`,
  });

  return NextResponse.json({
    reply,
    choices: structured.choices ?? [],
    hasMore: Boolean(structured.hasMore),
    moreIntent: structured.moreIntent ?? null,
    cards: structured.cards ?? [],
  });
}
