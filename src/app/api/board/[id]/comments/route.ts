import { NextResponse } from "next/server";
import { mapBoardPostCreateError } from "@/lib/board-ip-moderation";
import { mapDeviceBanCreateError } from "@/lib/board-device-moderation";
import { getClientDeviceBanStateForServer } from "@/lib/device-ban-server";
import { getClientIpBanStateForServer } from "@/lib/ip-ban-server";
import { getClientIp } from "@/lib/client-ip";
import { containsProfanity, profanityBlockedResponse } from "@/lib/profanity-filter";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type CreateCommentBody = {
  author_name?: string;
  content?: string;
  password?: string;
  parent_id?: string | null;
  is_secret?: boolean;
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

  const { id: postId } = await context.params;

  let body: CreateCommentBody;

  try {
    body = (await request.json()) as CreateCommentBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const authorName = body.author_name?.trim() ?? "";
  const content = body.content?.trim() ?? "";
  const password = body.password ?? "";
  const parentId = body.parent_id?.trim() || null;
  const voterKey = body.voter_key?.trim() ?? "";
  const requestedSecret = body.is_secret === true;

  if (!authorName || !content || !password) {
    return NextResponse.json(
      { error: "Author, content, and password are required." },
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

  const clientIp = getClientIp(request);
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

  const { data: commentId, error } = await admin.rpc("create_user_board_comment", {
    p_post_id: postId,
    p_author_name: authorName,
    p_content: content,
    p_password: password,
    p_parent_id: parentId,
    p_is_secret: requestedSecret,
    p_user_ip: clientIp,
    p_voter_key: voterKey.length >= 8 ? voterKey : null,
  });

  if (error) {
    if (
      error.message.includes("board_comments") &&
      (error.message.includes("does not exist") ||
        error.message.toLowerCase().includes("could not find the function"))
    ) {
      return NextResponse.json(
        {
          error:
            "board_comments table or RPC missing. Run supabase/device-voter-key-ban.sql in Supabase SQL Editor.",
        },
        { status: 503 },
      );
    }

    const message = mapBoardPostCreateError(mapDeviceBanCreateError(error.message));
    const status = error.message.includes("Post not found") ? 404 : 403;

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

  const { data, error: fetchError } = await admin
    .from("board_comments")
    .select("id, post_id, parent_id, author_name, content, is_hidden, is_secret, created_at")
    .eq("id", commentId)
    .maybeSingle();

  if (fetchError || !data) {
    return NextResponse.json({ id: commentId });
  }

  return NextResponse.json({ comment: data });
}
