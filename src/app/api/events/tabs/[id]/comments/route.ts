import { NextResponse } from "next/server";
import { getClientDeviceBanStateForServer } from "@/lib/device-ban-server";
import { getClientIpBanStateForServer } from "@/lib/ip-ban-server";
import { getClientIp } from "@/lib/client-ip";
import { mapEventCommentRpcError } from "@/lib/site-event-comments";
import { containsProfanity, profanityBlockedResponse } from "@/lib/profanity-filter";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type CreateBody = {
  author_name?: string;
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

  const { id: tabId } = await context.params;

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const authorName = body.author_name?.trim() ?? "";
  const content = body.content?.trim() ?? "";
  const password = body.password ?? "";
  const voterKey = body.voter_key?.trim() ?? "";

  if (!authorName || !content || !password || voterKey.length < 8) {
    return NextResponse.json(
      { error: "닉네임, 내용, 비밀번호를 입력해 주세요." },
      { status: 400 },
    );
  }

  if (containsProfanity(authorName, content)) {
    return NextResponse.json(profanityBlockedResponse(), { status: 400 });
  }

  if (password.length < 4) {
    return NextResponse.json(
      { error: "비밀번호는 4자 이상이어야 합니다." },
      { status: 400 },
    );
  }

  const clientIp = getClientIp(request);

  if (voterKey.length >= 8) {
    const deviceBanState = await getClientDeviceBanStateForServer(admin, voterKey);
    if (deviceBanState.banned) {
      return NextResponse.json(
        {
          error: mapEventCommentRpcError("Voter key banned"),
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
        error: "현재 IP에서는 댓글을 작성할 수 없습니다.",
        ban_reason: banState.reason,
        ban_type: "ip",
      },
      { status: 403 },
    );
  }

  const { data: commentId, error } = await admin.rpc("create_user_event_comment", {
    p_tab_id: tabId,
    p_author_name: authorName,
    p_content: content,
    p_password: password,
    p_voter_key: voterKey,
    p_user_ip: clientIp,
  });

  if (error) {
    const message = mapEventCommentRpcError(error.message);
    const status =
      error.message.includes("IP banned") || error.message.includes("Voter key banned")
        ? 403
        : 400;

    if (error.message.includes("could not find the function") || error.message.includes("PGRST202")) {
      return NextResponse.json(
        {
          error:
            "이벤트 댓글 SQL이 필요합니다. Supabase에서 site-event-comments-parity.sql을 실행해 주세요.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message }, { status });
  }

  const { data } = await admin
    .from("site_event_comments")
    .select("id, tab_id, author_name, content, is_hidden, created_at")
    .eq("id", commentId)
    .maybeSingle();

  return NextResponse.json({ comment: data ?? { id: commentId } });
}
