import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const PUBLIC_RELOAD_CONFIG_KEY = "public_reload_at";

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
