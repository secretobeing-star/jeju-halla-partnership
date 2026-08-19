import { NextRequest, NextResponse } from "next/server";
import {
  adminAuthMiddleware,
} from "@/lib/admin-auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

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
  const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
  const offset = Number.parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    // Supabase Auth 사용자 목록 가져오기
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      return NextResponse.json(
        { error: "사용자 목록을 불러오지 못했습니다." },
        { status: 500 },
      );
    }

    const members = users.map((user) => ({
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      user_metadata: user.user_metadata,
    }));

    return NextResponse.json({
      members: members.slice(offset, offset + limit),
      total: members.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "회원 목록 조회에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
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
  const userId = searchParams.get("userId")?.trim();

  if (!userId) {
    return NextResponse.json({ error: "사용자 ID가 필요합니다." }, { status: 400 });
  }

  try {
    // 사용자 데이터 삭제를 위한 사용자 정보 가져오기
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const targetUser = users.find((u) => u.id === userId);
    
    if (!targetUser) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    const userEmail = targetUser.email;

    // 관련 데이터 삭제
    // 학생 보상 데이터 삭제
    try {
      await supabase
        .from("site_student_rewards")
        .delete()
        .eq("student_id", userEmail || "");
    } catch (error) {
      console.log("Student rewards deletion failed:", error);
    }

    // 학생 인증 로그 삭제
    try {
      await supabase
        .from("site_student_auth_logs")
        .delete()
        .eq("student_id", userEmail || "");
    } catch (error) {
      console.log("Student auth logs deletion failed:", error);
    }

    // 게시판 댓글 삭제
    try {
      await supabase
        .from("site_board_comments")
        .delete()
        .eq("author_email", userEmail || "");
    } catch (error) {
      console.log("Board comments deletion failed:", error);
    }

    // 게시판 게시물 삭제
    try {
      await supabase
        .from("site_board_posts")
        .delete()
        .eq("author_email", userEmail || "");
    } catch (error) {
      console.log("Board posts deletion failed:", error);
    }

    // 이벤트 댓글 삭제
    try {
      await supabase
        .from("site_event_comments")
        .delete()
        .eq("author_email", userEmail || "");
    } catch (error) {
      console.log("Event comments deletion failed:", error);
    }

    // 파트너 리뷰 삭제
    try {
      await supabase
        .from("site_partner_reviews")
        .delete()
        .eq("author_email", userEmail || "");
    } catch (error) {
      console.log("Partner reviews deletion failed:", error);
    }

    // Supabase Auth 사용자 삭제
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      return NextResponse.json(
        { error: "사용자 삭제에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, deletedUserId: userId });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "회원 삭제에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}