import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSiteMemberSession } from "@/lib/site-member-session";

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 서버 설정이 없습니다." },
      { status: 503 },
    );
  }

  // 구글 시트 기반 세션 확인
  const session = getSiteMemberSession();
  console.log("Session data:", JSON.stringify(session, null, 2));
  
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const userId = session.student?.studentId?.trim() || "";
    const userEmail = session.displayName || "";

    console.log("User ID:", userId);
    console.log("User Email:", userEmail);

    if (!userId) {
      return NextResponse.json({ 
        error: "학생 정보가 없습니다. session.student?.studentId가 존재하지 않습니다.",
        debug: { session }
      }, { status: 400 });
    }

    // 탈퇴 신청 테이블에 신청 기록 저장
    const insertData = {
      user_id: userId,
      user_email: userEmail,
      student_id: userId,
      status: "pending",
      requested_at: new Date().toISOString(),
    };
    
    console.log("Insert data:", JSON.stringify(insertData, null, 2));

    const { error: insertError } = await supabase
      .from("site_account_deletion_requests")
      .insert(insertData);

    if (insertError) {
      console.error("Account deletion request creation failed:", insertError);
      return NextResponse.json(
        { error: "탈퇴 신청 저장에 실패했습니다: " + insertError.message, debug: insertError },
        { status: 500 },
      );
    }

    console.log("Account deletion request created successfully");

    // 구글 시트에 로그 기록 (Webhook 방식)
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim();
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            user_id: userId,
            email: userEmail,
            student_id: userId,
            status: "pending",
            action: "deletion_request",
          }),
        });
        console.log("Google Sheets webhook sent successfully");
      } catch (webhookError) {
        console.error("Google Sheets webhook failed:", webhookError);
        // 웹훅 실패해도 탈퇴 프로세스는 계속 진행
      }
    } else {
      console.log("GOOGLE_SHEET_WEBHOOK_URL not set, skipping webhook");
    }

    return NextResponse.json({ ok: true, message: "탈퇴 신청이 접수되었습니다. 관리자 승인 후 탈퇴가 처리됩니다." });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "탈퇴 신청에 실패했습니다.",
        debug: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    );
  }
}
