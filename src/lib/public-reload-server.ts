import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const PUBLIC_RELOAD_CONFIG_KEY = "public_reload_at";
export const PUBLIC_RELOAD_BUILD_KEY = "public_reload_build";

export function getPublicDeployBuildId() {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.VERCEL_DEPLOYMENT_ID?.trim() ||
    ""
  );
}

export async function bumpPublicReloadAt() {
  const admin = createSupabaseAdmin();
  if (!admin) return 0;
  const stamp = new Date().toISOString();
  const { error } = await admin.from("app_configs").upsert(
    { key: PUBLIC_RELOAD_CONFIG_KEY, value: stamp },
    { onConflict: "key" },
  );
  if (error) return 0;
  const at = Date.parse(stamp);
  return Number.isFinite(at) ? at : 0;
}

export async function readPublicReloadAt() {
  const admin = createSupabaseAdmin();
  if (!admin) return 0;
  const { data, error } = await admin
    .from("app_configs")
    .select("value")
    .eq("key", PUBLIC_RELOAD_CONFIG_KEY)
    .maybeSingle();
  if (error || !data?.value) return 0;
  const at = Date.parse(String(data.value));
  return Number.isFinite(at) ? at : 0;
}

/** 새 배포가 올라오면 본페이지 새로고침 시각을 올립니다. 이미 열린 화면도 몇 초 안에 갱신됩니다. */
export async function syncPublicReloadForDeploy() {
  const build = getPublicDeployBuildId();
  const at = await readPublicReloadAt();
  if (!build) return { at, build };

  const admin = createSupabaseAdmin();
  if (!admin) return { at, build };

  const { data } = await admin
    .from("app_configs")
    .select("value")
    .eq("key", PUBLIC_RELOAD_BUILD_KEY)
    .maybeSingle();
  const stored = String(data?.value ?? "").trim();
  if (stored === build) {
    return { at, build };
  }

  const nextAt = await bumpPublicReloadAt();
  await admin.from("app_configs").upsert(
    { key: PUBLIC_RELOAD_BUILD_KEY, value: build },
    { onConflict: "key" },
  );
  return { at: nextAt || at, build };
}
