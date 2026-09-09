import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";

export function isSiteMemberWithdrawEnabled(
  settings?: { site_member_withdraw_enabled?: boolean | null } | null,
) {
  return settings?.site_member_withdraw_enabled !== false;
}

export async function loadSiteMemberWithdrawEnabled() {
  const db = createSupabaseAdmin() ?? createSupabaseServer();
  if (!db) {
    return true;
  }

  const { data } = await db
    .from("site_settings")
    .select("site_member_withdraw_enabled")
    .eq("id", 1)
    .maybeSingle();

  return isSiteMemberWithdrawEnabled(data);
}
