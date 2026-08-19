import { resolveNaverMapClientId } from "@/lib/naver-map-config";
import { getServerSupabaseEnv, isPlaceholderSupabaseEnv, isSupabaseEnvConfigured } from "@/lib/supabase-env";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getServerSupabaseEnv();
  const url = env.url;
  const apiKey = env.anonKey;
  const configured = isSupabaseEnvConfigured(env);

  let urlHost = "not-set";

  try {
    if (url) {
      urlHost = new URL(url).hostname;
    }
  } catch {
    urlHost = "invalid-url";
  }

  const usingPlaceholder = isPlaceholderSupabaseEnv({ url, anonKey: apiKey });

  return NextResponse.json({
    supabaseConfigured: configured,
    urlHost,
    hasApiKey: apiKey.length > 0 && !isPlaceholderSupabaseEnv({ url: "https://example.com", anonKey: apiKey }),
    keyType: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? "publishable"
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? "anon"
        : "none",
    usingPlaceholder,
    hint: configured
      ? "Supabase environment variables are configured."
      : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to Vercel, then redeploy.",
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    boardUsesRpc: true,
    naverMapJsAvailable: Boolean(resolveNaverMapClientId()),
  });
}
