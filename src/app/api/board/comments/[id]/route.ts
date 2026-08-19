import { NextResponse } from "next/server";
import { isAdminManagedComment } from "@/lib/board-comments";
import { shouldStoreAdminVisiblePassword } from "@/lib/admin-password-settings";
import { containsProfanity, profanityBlockedResponse } from "@/lib/profanity-filter";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type UpdateCommentBody = {
  password?: string;
  author_name?: string;
  content?: string;
};

export async function PATCH(
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

  const { id } = await context.params;

  let body: UpdateCommentBody;

  try {
    body = (await request.json()) as UpdateCommentBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const password = body.password ?? "";
  const authorName = body.author_name?.trim() ?? "";
  const content = body.content?.trim() ?? "";

  if (!password || !authorName || !content) {
    return NextResponse.json(
      { error: "Password, author, and content are required." },
      { status: 400 },
    );
  }

  if (containsProfanity(authorName, content)) {
    return NextResponse.json(profanityBlockedResponse(), { status: 400 });
  }

  const { data: existing, error: fetchError } = await admin
    .from("board_comments")
    .select("id, is_hidden, is_admin_managed, password_hash")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing || existing.is_hidden) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  if (isAdminManagedComment(existing)) {
    return NextResponse.json({ error: "Cannot update admin comment." }, { status: 403 });
  }

  const { error: rpcError } = await admin.rpc("update_user_board_comment", {
    p_id: id,
    p_password: password,
    p_author_name: authorName,
    p_content: content,
  });

  if (rpcError) {
    const status = rpcError.message.includes("Incorrect password") ? 403 : 500;
    return NextResponse.json({ error: rpcError.message }, { status });
  }

  const storeAdminPassword = await shouldStoreAdminVisiblePassword();

  const { data, error } = await admin
    .from("board_comments")
    .select("id, post_id, author_name, content, is_hidden, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ success: true });
  }

  if (storeAdminPassword) {
    await admin
      .from("board_comments")
      .update({ admin_visible_password: password })
      .eq("id", id);
  }

  return NextResponse.json({ comment: data });
}

export async function DELETE(
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

  const { id } = await context.params;

  let body: { password?: string };

  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const password = body.password ?? "";

  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await admin
    .from("board_comments")
    .select("id, is_hidden, is_admin_managed, password_hash")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing || existing.is_hidden) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  if (isAdminManagedComment(existing)) {
    return NextResponse.json({ error: "Cannot delete admin comment." }, { status: 403 });
  }

  const { error: rpcError } = await admin.rpc("delete_user_board_comment", {
    p_id: id,
    p_password: password,
  });

  if (rpcError) {
    const status = rpcError.message.includes("Incorrect password") ? 403 : 500;
    return NextResponse.json({ error: rpcError.message }, { status });
  }

  return NextResponse.json({ success: true });
}
