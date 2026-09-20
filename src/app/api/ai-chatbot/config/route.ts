import { NextResponse } from "next/server";
import {
  DEFAULT_PUBLIC_CHATBOT_CONFIG,
  mapAiChatbotSettings,
  toPublicAiChatbotConfig,
} from "@/lib/ai-chatbot";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ config: DEFAULT_PUBLIC_CHATBOT_CONFIG });
  }

  const { data, error } = await admin.from("ai_chatbot_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) {
    return NextResponse.json({ config: DEFAULT_PUBLIC_CHATBOT_CONFIG });
  }

  const config = toPublicAiChatbotConfig(mapAiChatbotSettings(data as Record<string, unknown>));
  return NextResponse.json({ config });
}
