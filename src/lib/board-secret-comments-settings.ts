import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function isBoardSecretCommentsEnabled(): Promise<boolean> {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return false;
  }

  const { data } = await admin
    .from("site_settings")
    .select("board_secret_comments_enabled")
    .eq("id", 1)
    .maybeSingle();

  return data?.board_secret_comments_enabled ?? false;
}
