import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/admin-auth-guard";
import { mapLoginRewardSettings, type LoginRewardSettings } from "@/lib/login-reward";
import { loginRewardSettingsToRow } from "@/lib/login-reward-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) return auth.error;
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }
  const { data, error } = await admin.from("site_login_reward_settings").select("*").eq("id", 1).maybeSingle();
  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("site_login_reward_settings")
          ? "접속 보상 테이블이 없습니다. supabase/site-login-reward.sql 을 실행해 주세요."
          : error.message,
      },
      { status: 500 },
    );
  }
  return NextResponse.json({ settings: mapLoginRewardSettings((data as Record<string, unknown> | null) ?? null) });
}

export async function PATCH(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) return auth.error;
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  let body: Partial<LoginRewardSettings>;
  try {
    body = (await request.json()) as Partial<LoginRewardSettings>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("site_login_reward_settings")
    .upsert(loginRewardSettingsToRow(body), { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("site_login_reward_settings")
          ? "접속 보상 테이블이 없습니다. supabase/site-login-reward.sql 을 실행해 주세요."
          : error.message.includes("costume_frame_id") ||
              error.message.includes("coupon_code") ||
              error.message.includes("schedule_mode") ||
              error.message.includes("send_hour")
            ? "접속 보상 컬럼이 없습니다. supabase/site-login-reward.sql 을 다시 실행해 주세요."
            : error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ settings: mapLoginRewardSettings((data as Record<string, unknown> | null) ?? null) });
}
