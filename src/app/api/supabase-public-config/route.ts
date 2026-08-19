import {
  getServerSupabaseEnv,
  isSupabaseEnvConfigured,
} from "@/lib/supabase-env";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getServerSupabaseEnv();
  const configured = isSupabaseEnvConfigured(env);

  if (!configured) {
    return NextResponse.json(
      { configured: false },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      configured: true,
      url: env.url,
      anonKey: env.anonKey,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
