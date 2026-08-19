import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv, isPlaceholderSupabaseEnv } from "@/lib/supabase-env";

export function createSupabaseServer() {
  const { url, anonKey } = getServerSupabaseEnv();

  if (!url || !anonKey || isPlaceholderSupabaseEnv({ url, anonKey })) {
    return null;
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
