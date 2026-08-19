import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type DeleteBody = {
  password?: string;
};

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

  let body: DeleteBody;
  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const password = body.password ?? "";
  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const { error } = await admin.rpc("delete_user_event_comment", {
    p_id: id,
    p_password: password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
