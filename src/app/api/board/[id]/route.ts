import { NextResponse } from "next/server";
import { getBoardDefinitions, isUserPostableBoard } from "@/lib/board-definitions";
import { shouldStoreAdminVisiblePassword } from "@/lib/admin-password-settings";
import {
  hashBoardPassword,
  isHashedBoardPassword,
  legacyBoardPasswordHash,
  verifyBoardPassword,
} from "@/lib/board-auth";
import { containsProfanity, profanityBlockedResponse } from "@/lib/profanity-filter";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type UpdateBoardPostBody = {
  password?: string;
  title?: string;
  author_name?: string;
  content?: string;
};

function verifyStoredPassword(password: string, storedHash: string | null): boolean {
  if (!storedHash) {
    return false;
  }

  if (isHashedBoardPassword(storedHash)) {
    return verifyBoardPassword(password, storedHash);
  }

  return legacyBoardPasswordHash(password) === storedHash;
}

async function getWritableBoards(admin: NonNullable<ReturnType<typeof createSupabaseAdmin>>) {
  const { data: settings } = await admin
    .from("site_settings")
    .select("board_definitions, board_notice_label, board_free_label, board_inquiry_label, free_board_enabled, inquiry_board_enabled")
    .eq("id", 1)
    .maybeSingle();

  return getBoardDefinitions(settings);
}

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

  let body: UpdateBoardPostBody;

  try {
    body = (await request.json()) as UpdateBoardPostBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const password = body.password ?? "";
  const title = body.title?.trim() ?? "";
  const authorName = body.author_name?.trim() ?? "";
  const content = body.content?.trim() ?? "";

  if (!password || !title || !authorName || !content) {
    return NextResponse.json(
      { error: "Password, title, author, and content are required." },
      { status: 400 },
    );
  }

  if (containsProfanity(title, authorName, content)) {
    return NextResponse.json(profanityBlockedResponse(), { status: 400 });
  }

  const { data: existing, error: fetchError } = await admin
    .from("board_posts")
    .select("id, board_type, password_hash, is_hidden")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const boards = await getWritableBoards(admin);

  if (!isUserPostableBoard(boards, existing.board_type)) {
    return NextResponse.json({ error: "This post cannot be edited here." }, { status: 403 });
  }

  if (!verifyStoredPassword(password, existing.password_hash)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
  }

  const storeAdminPassword = await shouldStoreAdminVisiblePassword();

  const { data, error } = await admin
    .from("board_posts")
    .update({
      title,
      author_name: authorName,
      content,
      password_hash: hashBoardPassword(password),
      admin_visible_password: storeAdminPassword ? password : null,
    })
    .eq("id", id)
    .select("id, board_type, title, content, author_name, is_hidden, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: data });
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
    .from("board_posts")
    .select("id, board_type, password_hash")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const boards = await getWritableBoards(admin);

  if (!isUserPostableBoard(boards, existing.board_type)) {
    return NextResponse.json({ error: "This post cannot be deleted here." }, { status: 403 });
  }

  if (!verifyStoredPassword(password, existing.password_hash)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
  }

  const { error } = await admin.from("board_posts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
