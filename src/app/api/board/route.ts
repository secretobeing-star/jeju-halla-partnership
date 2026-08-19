import { NextResponse } from "next/server";
import { mapBoardPostCreateError } from "@/lib/board-ip-moderation";
import { mapDeviceBanCreateError } from "@/lib/board-device-moderation";
import { getClientDeviceBanStateForServer } from "@/lib/device-ban-server";
import { getClientIpBanStateForServer } from "@/lib/ip-ban-server";
import { getClientIp } from "@/lib/client-ip";
import { containsProfanity, profanityBlockedResponse } from "@/lib/profanity-filter";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type CreateBoardPostBody = {
  board_type?: string;
  title?: string;
  author_name?: string;
  content?: string;
  password?: string;
  is_secret?: boolean;
  voter_key?: string;
};

export async function POST(request: Request) {
  const admin = createSupabaseAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Server configuration missing SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  let body: CreateBoardPostBody;

  try {
    body = (await request.json()) as CreateBoardPostBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const boardType = body.board_type?.trim() ?? "";
  const title = body.title?.trim() ?? "";
  const authorName = body.author_name?.trim() ?? "";
  const content = body.content ?? "";
  const password = body.password ?? "";
  const isSecret = Boolean(body.is_secret);
  const voterKey = body.voter_key?.trim() ?? "";
  const clientIp = getClientIp(request);

  if (voterKey.length >= 8) {
    const deviceBanState = await getClientDeviceBanStateForServer(admin, voterKey);
    if (deviceBanState.banned) {
      return NextResponse.json(
        {
          error: mapDeviceBanCreateError("Voter key banned"),
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
        error: mapBoardPostCreateError("IP banned"),
        ban_reason: banState.reason,
        ban_type: "ip",
      },
      { status: 403 },
    );
  }

  if (!boardType || !title || !authorName || !content.trim() || !password) {
    return NextResponse.json(
      { error: "Title, author, content, and password are required." },
      { status: 400 },
    );
  }

  if (containsProfanity(title, authorName, content)) {
    return NextResponse.json(profanityBlockedResponse(), { status: 400 });
  }

  if (password.length < 4) {
    return NextResponse.json(
      { error: "Password must be at least 4 characters." },
      { status: 400 },
    );
  }

  const { data: postId, error } = await admin.rpc("create_user_board_post", {
    p_board_type: boardType,
    p_title: title,
    p_author_name: authorName,
    p_content: content,
    p_password: password,
    p_is_secret: isSecret,
    p_user_ip: clientIp,
    p_voter_key: voterKey.length >= 8 ? voterKey : null,
  });

  if (error) {
    const message = mapBoardPostCreateError(mapDeviceBanCreateError(error.message));
    const status = message.includes("Invalid board type") ? 400 : 403;

    if (error.message.includes("Voter key banned") && voterKey.length >= 8) {
      const rpcBanState = await getClientDeviceBanStateForServer(admin, voterKey);
      return NextResponse.json(
        { error: message, ban_reason: rpcBanState.reason, ban_type: "device" },
        { status },
      );
    }

    if (error.message.includes("IP banned") && clientIp) {
      const rpcBanState = await getClientIpBanStateForServer(admin, clientIp);
      return NextResponse.json({ error: message, ban_reason: rpcBanState.reason, ban_type: "ip" }, { status });
    }

    return NextResponse.json({ error: message }, { status });
  }

  const { data: post, error: fetchError } = await admin
    .from("board_posts")
    .select(
      "id, board_type, title, content, author_name, is_hidden, is_secret, status, user_ip, created_at",
    )
    .eq("id", postId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ id: postId });
  }

  return NextResponse.json({ post, id: postId });
}
