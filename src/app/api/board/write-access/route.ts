import { NextResponse } from "next/server";
import { getClientDeviceBanStateForServer } from "@/lib/device-ban-server";
import { getClientIpBanStateForServer } from "@/lib/ip-ban-server";
import { getClientIp } from "@/lib/client-ip";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const admin = createSupabaseAdmin();

  if (!admin) {
    return NextResponse.json({ allowed: true, reason: null, ban_type: null });
  }

  const url = new URL(request.url);
  const voterKey = url.searchParams.get("voter_key")?.trim() ?? "";

  if (voterKey.length >= 8) {
    const deviceBanState = await getClientDeviceBanStateForServer(admin, voterKey);
    if (deviceBanState.banned) {
      return NextResponse.json({
        allowed: false,
        reason: deviceBanState.reason,
        ban_type: "device",
      });
    }
  }

  const clientIp = getClientIp(request);
  if (!clientIp) {
    return NextResponse.json({ allowed: true, reason: null, ban_type: null });
  }

  const ipBanState = await getClientIpBanStateForServer(admin, clientIp);

  if (!ipBanState.banned) {
    return NextResponse.json({ allowed: true, reason: null, ban_type: null });
  }

  return NextResponse.json({
    allowed: false,
    reason: ipBanState.reason,
    ban_type: "ip",
  });
}
