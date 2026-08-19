import { NextResponse } from "next/server";
import { getClientDeviceBanStateForServer } from "@/lib/device-ban-server";
import { getClientIpBanStateForServer } from "@/lib/ip-ban-server";
import { getClientIp } from "@/lib/client-ip";
import { mapPartnerReviewRpcError } from "@/lib/partner-review";
import { containsProfanity, profanityBlockedResponse } from "@/lib/profanity-filter";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type CreatePartnerReviewBody = {  author_name?: string;
  content?: string;
  password?: string;
  voter_key?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = createSupabaseAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Server configuration missing SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  const { id: partnerId } = await context.params;

  let body: CreatePartnerReviewBody;

  try {
    body = (await request.json()) as CreatePartnerReviewBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const authorName = body.author_name?.trim() ?? "";
  const content = body.content?.trim() ?? "";
  const password = body.password ?? "";
  const voterKey = body.voter_key?.trim() ?? "";

  if (!authorName || !content || !password || voterKey.length < 8) {
    return NextResponse.json(
      { error: "Author, content, password, and voter key are required." },
      { status: 400 },
    );
  }

  if (containsProfanity(authorName, content)) {
    return NextResponse.json(profanityBlockedResponse(), { status: 400 });
  }

  if (password.length < 4) {
    return NextResponse.json(
      { error: "Password must be at least 4 characters." },
      { status: 400 },
    );
  }

  const clientIp = getClientIp(request);

  if (voterKey.length >= 8) {
    const deviceBanState = await getClientDeviceBanStateForServer(admin, voterKey);
    if (deviceBanState.banned) {
      return NextResponse.json(
        {
          error: mapPartnerReviewRpcError("Voter key banned"),
          ban_reason: deviceBanState.reason,
          ban_type: "device",
        },
        { status: 403 },
      );
    }
  }

  const banState = await getClientIpBanStateForServer(admin, clientIp);
  if (banState.banned) {
    return NextResponse.json(
      {
        error: "현재 IP에서는 후기를 작성할 수 없습니다.",
        ban_reason: banState.reason,
        ban_type: "ip",
      },
      { status: 403 },
    );
  }

  const { data, error } = await admin.rpc("create_partner_review", {
    p_partner_id: partnerId,
    p_author_name: authorName,
    p_content: content,
    p_password: password,
    p_voter_key: voterKey,
    p_user_ip: clientIp,
  });

  if (error) {
    const message = mapPartnerReviewRpcError(error.message);
    const status =
      error.message.includes("IP banned") || error.message.includes("Voter key banned")
        ? 403
        : 400;

    if (error.message.includes("Voter key banned") && voterKey.length >= 8) {
      const rpcBanState = await getClientDeviceBanStateForServer(admin, voterKey);
      return NextResponse.json(
        { error: message, ban_reason: rpcBanState.reason, ban_type: "device" },
        { status },
      );
    }

    if (error.message.includes("IP banned") && clientIp) {
      const rpcBanState = await getClientIpBanStateForServer(admin, clientIp);
      return NextResponse.json(
        { error: message, ban_reason: rpcBanState.reason, ban_type: "ip" },
        { status },
      );
    }

    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ result: data });
}
