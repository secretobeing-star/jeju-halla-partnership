import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/admin-auth-guard";
import { asAiChatbotProvider, mapAiChatbotSettings, parseChatbotLessons } from "@/lib/ai-chatbot";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

function hideKey(settings: ReturnType<typeof mapAiChatbotSettings>) {
  return {
    ...settings,
    api_key: settings.has_api_key ? "********" : "",
  };
}

export async function GET(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) return auth.error;

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const { data, error } = await admin.from("ai_chatbot_settings").select("*").eq("id", 1).maybeSingle();
  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("ai_chatbot_settings")
          ? "AI 챗봇 테이블이 없습니다. Supabase SQL Editor에서 supabase/ai-chatbot.sql 을 실행해 주세요."
          : error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ settings: hideKey(mapAiChatbotSettings((data as Record<string, unknown> | null) ?? null)) });
}

export async function PATCH(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) return auth.error;

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.enabled !== undefined) patch.enabled = Boolean(body.enabled);
  if (body.name !== undefined) patch.name = String(body.name).trim() || "안내 봇";
  if (body.welcome_message !== undefined) {
    patch.welcome_message =
      String(body.welcome_message).trim() || "안녕하세요. 제휴·혜택·이벤트에 대해 물어보세요.";
  }
  if (body.login_greeting !== undefined) {
    patch.login_greeting = String(body.login_greeting).trim() || "{name}님 안녕하세요";
  }
  if (body.profile_bio !== undefined) {
    patch.profile_bio = String(body.profile_bio).trim() || "제휴·혜택을 안내합니다.";
  }
  if (body.icon_url !== undefined) {
    const icon = String(body.icon_url ?? "").trim();
    patch.icon_url = icon || null;
  }
  if (body.provider !== undefined) patch.provider = asAiChatbotProvider(body.provider);
  if (typeof body.api_key === "string") {
    const key = body.api_key.trim();
    if (key && key !== "********") {
      patch.api_key = key;
    }
    if (!key) {
      patch.api_key = null;
    }
  }
  if (body.lessons !== undefined) {
    patch.lessons = parseChatbotLessons(body.lessons);
  }

  const { data, error } = await admin
    .from("ai_chatbot_settings")
    .upsert({ id: 1, ...patch }, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (error) {
    const missingProfile = error.message.includes("profile_bio");
    const missingLessons = error.message.includes("lessons");
    const missingGreeting = error.message.includes("login_greeting");
    if (
      (missingProfile && "profile_bio" in patch) ||
      (missingLessons && "lessons" in patch) ||
      (missingGreeting && "login_greeting" in patch)
    ) {
      if (missingProfile) delete patch.profile_bio;
      if (missingLessons) delete patch.lessons;
      if (missingGreeting) delete patch.login_greeting;
      const retry = await admin
        .from("ai_chatbot_settings")
        .upsert({ id: 1, ...patch }, { onConflict: "id" })
        .select("*")
        .maybeSingle();
      if (!retry.error) {
        if (missingLessons) {
          return NextResponse.json(
            { error: "학습 문장 칼럼이 없습니다. supabase/ai-chatbot.sql 을 다시 실행해 주세요." },
            { status: 500 },
          );
        }
        if (missingGreeting) {
          return NextResponse.json(
            { error: "로그인 인사 칼럼이 없습니다. supabase/ai-chatbot.sql 을 다시 실행해 주세요." },
            { status: 500 },
          );
        }
        return NextResponse.json({
          settings: hideKey(mapAiChatbotSettings((retry.data as Record<string, unknown> | null) ?? null)),
        });
      }
    }
    return NextResponse.json(
      {
        error: error.message.includes("ai_chatbot_settings")
          ? "AI 챗봇 테이블이 없습니다. Supabase SQL Editor에서 supabase/ai-chatbot.sql 을 실행해 주세요."
          : missingLessons
            ? "학습 문장 칼럼이 없습니다. supabase/ai-chatbot.sql 을 다시 실행해 주세요."
            : missingProfile
              ? "프로필 소개 칼럼이 없습니다. supabase/ai-chatbot.sql 을 다시 실행해 주세요."
              : error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    settings: hideKey(mapAiChatbotSettings((data as Record<string, unknown> | null) ?? null)),
  });
}
