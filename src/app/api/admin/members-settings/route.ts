import { NextRequest, NextResponse } from "next/server";
import {
  adminAuthMiddleware,
} from "@/lib/admin-auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) {
    return auth.error;
  }

  const supabase = createSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 서버 설정이 없습니다." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { deletion_request_message, deletion_approve_message, deletion_reject_message } = body;

    // 메시지 저장/업데이트
    if (deletion_request_message) {
      await supabase
        .from("site_member_messages")
        .upsert({ key: "deletion_request_message", message: deletion_request_message }, { onConflict: "key" });
    }
    if (deletion_approve_message) {
      await supabase
        .from("site_member_messages")
        .upsert({ key: "deletion_approve_message", message: deletion_approve_message }, { onConflict: "key" });
    }
    if (deletion_reject_message) {
      await supabase
        .from("site_member_messages")
        .upsert({ key: "deletion_reject_message", message: deletion_reject_message }, { onConflict: "key" });
    }
    
    return NextResponse.json({ ok: true, message: "메시지가 저장되었습니다." });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "메시지 저장에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, "settings");
  if ("error" in auth) {
    return auth.error;
  }

  const supabase = createSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 서버 설정이 없습니다." },
      { status: 503 },
    );
  }

  try {
    // 저장된 메시지 반환
    const { data: messages } = await supabase
      .from("site_member_messages")
      .select("*");
    
    const messageMap: Record<string, string> = {};
    if (messages) {
      messages.forEach((msg: any) => {
        messageMap[msg.key] = msg.message;
      });
    }

    return NextResponse.json({
      deletion_request_message: messageMap.deletion_request_message || "탈퇴 신청이 접수되었습니다. 관리자 승인 후 탈퇴가 처리됩니다.",
      deletion_approve_message: messageMap.deletion_approve_message || "탈퇴가 승인되고 처리되었습니다.",
      deletion_reject_message: messageMap.deletion_reject_message || "탈퇴 신청이 거절되었습니다.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "메시지 불러오기에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
