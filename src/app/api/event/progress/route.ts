import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { asStringArray, emptyProgress } from "@/lib/map-events";
import { requireStudentSession } from "@/lib/student-session-server";

export async function GET(request: NextRequest) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase 서버 설정이 없습니다." }, { status: 503 });
  }

  const requestedUserId = request.nextUrl.searchParams.get("userId")?.trim() || "";
  const eventId = request.nextUrl.searchParams.get("eventId")?.trim() || "";
  const auth = await requireStudentSession(request, [requestedUserId]);
  if (!auth.ok) {
    return auth.response;
  }
  const userId = auth.studentId;
  if (!eventId) {
    return NextResponse.json({ error: "eventId가 필요합니다." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("user_event_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ progress: emptyProgress(userId, eventId) });
  }

  return NextResponse.json({
    progress: {
      id: data.id,
      user_id: data.user_id,
      event_id: data.event_id,
      current_stamps: Number(data.current_stamps) || 0,
      is_completed: Boolean(data.is_completed),
      stamped_places: asStringArray(data.stamped_places),
    },
  });
}
