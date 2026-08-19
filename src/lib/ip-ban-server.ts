import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type ClientIpBanState = {
  banned: boolean;
  reason: string | null;
};

export async function getClientIpBanStateForServer(
  admin: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  ip: string | null | undefined,
): Promise<ClientIpBanState> {
  const trimmedIp = ip?.trim();
  if (!trimmedIp) {
    return { banned: false, reason: null };
  }

  const { data, error } = await admin
    .from("banned_ips")
    .select("reason")
    .eq("ip_address", trimmedIp)
    .maybeSingle();

  if (error || !data) {
    return { banned: false, reason: null };
  }

  return {
    banned: true,
    reason: typeof data.reason === "string" ? data.reason : null,
  };
}
