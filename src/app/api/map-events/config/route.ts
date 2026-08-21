import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  configFromRows,
  DEFAULT_BENEFIT_BTN_LABEL,
  DEFAULT_BENEFIT_BTN_LABEL_KEY,
  DEFAULT_MAP_MARKER_IMG_KEY,
  DEFAULT_MAP_TAB_NAME,
  DEFAULT_MAP_TAB_NAME_KEY,
  DEFAULT_MARKER_IMG_KEY,
  DEFAULT_STAMP_BTN_LABEL,
  DEFAULT_TAB_NAME_KEY,
  EVENT_STAMP_BTN_LABEL_KEY,
  STAMP_BUTTON_LABEL_KEY,
  type MapAppConfig,
} from "@/lib/map-events";

export async function GET() {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase 서버 설정이 없습니다." },
      { status: 503 },
    );
  }

  const { data: appConfigs, error: appConfigError } = await admin.from("app_configs").select("key, value");
  if (appConfigError) {
    return NextResponse.json(
      {
        error:
          appConfigError.message.includes("app_configs")
            ? "app_configs 테이블이 없습니다. supabase/map-events.sql 을 실행해 주세요."
            : appConfigError.message,
      },
      { status: 500 },
    );
  }

  // site_settings에서 stamp_button_label 가져오기
  const { data: siteSettings, error: siteSettingsError } = await admin
    .from("site_settings")
    .select("stamp_button_label")
    .eq("id", 1)
    .maybeSingle();

  if (siteSettingsError) {
    // site_settings 에러는 무시하고 기본값 사용
    console.warn("site_settings 조회 실패:", siteSettingsError.message);
  }

  const config = configFromRows(appConfigs ?? [], siteSettings?.stamp_button_label);

  return NextResponse.json({ config });
}

export async function PUT(request: NextRequest) {
  const { adminAuthMiddleware } = await import("@/lib/admin-auth-guard");
  const auth = await adminAuthMiddleware(request, "partners");
  if ("error" in auth) {
    return auth.error;
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase 서버 설정이 없습니다." },
      { status: 503 },
    );
  }

  let body: Partial<MapAppConfig & { stamp_button_label?: string }>;
  try {
    body = (await request.json()) as Partial<MapAppConfig & { stamp_button_label?: string }>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const tab = body.default_map_tab_name?.trim() || DEFAULT_MAP_TAB_NAME;
  const marker = body.default_map_marker_img?.trim() || "";
  const benefit = body.default_benefit_btn_label?.trim() || DEFAULT_BENEFIT_BTN_LABEL;
  const stamp = body.event_stamp_btn_label?.trim() || DEFAULT_STAMP_BTN_LABEL;
  const customStampLabel = body.stamp_button_label?.trim() || DEFAULT_STAMP_BTN_LABEL;
  const now = new Date().toISOString();
  
  const appConfigRows = [
    { key: DEFAULT_MAP_TAB_NAME_KEY, value: tab, updated_at: now },
    { key: DEFAULT_TAB_NAME_KEY, value: tab, updated_at: now },
    { key: DEFAULT_MAP_MARKER_IMG_KEY, value: marker, updated_at: now },
    { key: DEFAULT_MARKER_IMG_KEY, value: marker, updated_at: now },
    { key: DEFAULT_BENEFIT_BTN_LABEL_KEY, value: benefit, updated_at: now },
    { key: EVENT_STAMP_BTN_LABEL_KEY, value: stamp, updated_at: now },
  ];

  const { error: appConfigError } = await admin.from("app_configs").upsert(appConfigRows, { onConflict: "key" });
  if (appConfigError) {
    return NextResponse.json({ error: appConfigError.message }, { status: 500 });
  }

  // site_settings에 stamp_button_label 업데이트
  const { error: siteSettingsError } = await admin
    .from("site_settings")
    .update({ stamp_button_label: customStampLabel })
    .eq("id", 1);

  if (siteSettingsError) {
    return NextResponse.json({ error: siteSettingsError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    config: {
      default_map_tab_name: tab,
      default_map_marker_img: marker,
      default_benefit_btn_label: benefit,
      event_stamp_btn_label: stamp,
      stamp_button_label: customStampLabel,
    } satisfies MapAppConfig & { stamp_button_label?: string },
  });
}
