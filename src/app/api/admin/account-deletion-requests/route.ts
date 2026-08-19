import { NextRequest, NextResponse } from "next/server";
import {
  adminAuthMiddleware,
} from "@/lib/admin-auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";
import { deleteStudentFromSheets, resolveStudentSheetsConfig } from "@/lib/google-sheets-student";

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

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";

  console.log("Fetching deletion requests with status:", status);

  try {
    // 탈퇴 신청 목록 조회
    const { data: requests, error } = await supabase
      .from("site_account_deletion_requests")
      .select("*")
      .eq("status", status)
      .order("requested_at", { ascending: false });

    console.log("Deletion requests query result:", { error, count: requests?.length });

    if (error) {
      console.error("Deletion requests query error:", error);
      return NextResponse.json(
        { error: "탈퇴 신청 목록을 불러오지 못했습니다.", debug: error },
        { status: 500 },
      );
    }

    // 저장된 메시지도 함께 반환
    const { data: messages } = await supabase
      .from("site_member_messages")
      .select("*");

    const messageMap: Record<string, string> = {};
    if (messages) {
      messages.forEach((msg: any) => {
        messageMap[msg.key] = msg.message;
      });
    }

    console.log("Returning requests:", requests?.length, "and messages:", Object.keys(messageMap).length);

    return NextResponse.json({ 
      requests: requests ?? [],
      messages: messageMap
    });
  } catch (error) {
    console.error("Unexpected error in GET:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "탈퇴 신청 목록 조회에 실패했습니다.",
        debug: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    );
  }
}

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

  const body = await request.json();
  const { requestId, action } = body;

  if (!requestId || !action) {
    return NextResponse.json(
      { error: "요청 ID와 작업 유형이 필요합니다." },
      { status: 400 },
    );
  }

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "유효하지 않은 작업 유형입니다." },
      { status: 400 },
    );
  }

  try {
    // 신청 정보 조회
    const { data: request, error: fetchError } = await supabase
      .from("site_account_deletion_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      return NextResponse.json(
        { error: "탈퇴 신청을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 신청입니다." },
        { status: 400 },
      );
    }

    if (action === "reject") {
      // 거절 처리
      await supabase
        .from("site_account_deletion_requests")
        .update({
          status: "rejected",
          processed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      // 저장된 메시지 가져오기
      let message = "탈퇴 신청이 거절되었습니다.";
      try {
        const { data: messages } = await supabase
          .from("site_member_messages")
          .select("message")
          .eq("key", "deletion_reject_message")
          .single();
        
        if (messages?.message) {
          message = messages.message;
        }
      } catch (error) {
        console.log("Failed to load custom message:", error);
      }

      return NextResponse.json({ ok: true, message });
    }

    // 승인 처리 - 데이터 삭제
    const studentId = request.student_id?.trim() || "";
    const userEmail = request.user_email;

    // 학생 관련 데이터 삭제
    if (studentId) {
      try {
        await supabase
          .from("site_student_rewards")
          .delete()
          .eq("student_id", studentId);
      } catch (error) {
        console.log("Student rewards deletion failed:", error);
      }

      try {
        await supabase
          .from("site_student_auth_logs")
          .delete()
          .eq("student_id", studentId);
      } catch (error) {
        console.log("Student auth logs deletion failed:", error);
      }

      try {
        await supabase
          .from("site_student_application_logs")
          .delete()
          .eq("student_id", studentId);
      } catch (error) {
        console.log("Student application logs deletion failed:", error);
      }

      try {
        await supabase
          .from("site_student_profiles")
          .delete()
          .eq("student_id", studentId);
      } catch (error) {
        console.log("Student profiles deletion failed:", error);
      }

      try {
        await supabase
          .from("site_student_card_frames")
          .delete()
          .eq("student_id", studentId);
      } catch (error) {
        console.log("Student card frames deletion failed:", error);
      }
    }

    // 게시판 댓글 삭제
    if (userEmail) {
      try {
        await supabase
          .from("site_board_comments")
          .delete()
          .eq("author_email", userEmail);
      } catch (error) {
        console.log("Board comments deletion failed:", error);
      }

      try {
        await supabase
          .from("site_board_posts")
          .delete()
          .eq("author_email", userEmail);
      } catch (error) {
        console.log("Board posts deletion failed:", error);
      }

      try {
        await supabase
          .from("site_event_comments")
          .delete()
          .eq("author_email", userEmail);
      } catch (error) {
        console.log("Event comments deletion failed:", error);
      }

      try {
        await supabase
          .from("site_partner_reviews")
          .delete()
          .eq("author_email", userEmail);
      } catch (error) {
        console.log("Partner reviews deletion failed:", error);
      }

      try {
        await supabase
          .from("site_partner_favorites")
          .delete()
          .eq("user_email", userEmail);
      } catch (error) {
        console.log("Partner favorites deletion failed:", error);
      }

      try {
        await supabase
          .from("site_notification_reads")
          .delete()
          .eq("user_email", userEmail);
      } catch (error) {
        console.log("Notification reads deletion failed:", error);
      }
    }

    // 구글 시트에서 학생 정보 삭제
    try {
      const sheetsConfig = resolveStudentSheetsConfig();
      if (sheetsConfig && request.student_id) {
        await deleteStudentFromSheets(sheetsConfig, request.student_id);
        console.log("Deleted student from Google Sheets:", request.student_id);
      } else {
        console.log("Skipped Google Sheets deletion: missing config or student_id");
      }
    } catch (error) {
      console.error("Google Sheets deletion failed:", error);
      // 구글 시트 삭제 실패해도 계속 진행
    }

    // Supabase Auth 사용자 삭제 (서비스 역할 필요)
    try {
      await supabase.auth.admin.deleteUser(request.user_id);
    } catch (error) {
      console.error("Admin delete failed:", error);
      // 실패해도 로그아웃 처리
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error("Signout failed:", signOutError);
      }
    }

    // 신청 상태 업데이트
    await supabase
      .from("site_account_deletion_requests")
      .update({
        status: "approved",
        processed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    // 저장된 메시지 가져오기
    let message = "탈퇴가 승인되고 처리되었습니다.";
    try {
      const { data: messages } = await supabase
        .from("site_member_messages")
        .select("message")
        .eq("key", "deletion_approve_message")
        .single();
      
      if (messages?.message) {
        message = messages.message;
      }
    } catch (error) {
      console.log("Failed to load custom message:", error);
    }

    return NextResponse.json({ ok: true, message });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "탈퇴 승인에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
