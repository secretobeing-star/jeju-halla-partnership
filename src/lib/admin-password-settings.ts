import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function shouldStoreAdminVisiblePassword(): Promise<boolean> {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return false;
  }

  const { data } = await admin
    .from("site_settings")
    .select("admin_user_password_visible")
    .eq("id", 1)
    .maybeSingle();

  return data?.admin_user_password_visible ?? false;
}
