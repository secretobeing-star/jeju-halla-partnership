import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type ClientDeviceBanState = {
  banned: boolean;
  reason: string | null;
};

export async function getClientDeviceBanStateForServer(
  admin: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  voterKey: string | null | undefined,
): Promise<ClientDeviceBanState> {
  const trimmedKey = voterKey?.trim();
  if (!trimmedKey || trimmedKey.length < 8) {
    return { banned: false, reason: null };
  }

  const { data, error } = await admin
    .from("banned_voter_keys")
    .select("reason")
    .eq("voter_key", trimmedKey)
    .maybeSingle();

  if (error || !data) {
    return { banned: false, reason: null };
  }

  return {
    banned: true,
    reason: typeof data.reason === "string" ? data.reason : null,
  };
}
