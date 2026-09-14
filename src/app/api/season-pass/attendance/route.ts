import { NextRequest, NextResponse } from "next/server";
import { completeAttendance } from "@/lib/season-pass-server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { userId?: string; studentId?: string };
    const userId = body.userId?.trim() || body.studentId?.trim() || "";
    const result = await completeAttendance(userId);
    if (!result.applied) {
      const status =
        result.reason === "로그인이 필요합니다."
          ? 401
          : result.reason === "already-attended"
            ? 409
            : result.reason === "schema-missing"
              ? 503
              : 400;
      return NextResponse.json(
        {
          error:
            result.reason === "already-attended"
              ? "오늘 출석을 이미 완료했습니다."
              : result.reason === "schema-missing"
                ? "출석 테이블이 없습니다. supabase/season-pass-attendance.sql 을 실행해 주세요."
                : result.reason === "no-season"
                  ? "진행 중인 시즌이 없습니다."
                  : result.reason || "출석에 실패했습니다.",
          state: result.state,
        },
        { status },
      );
    }
    return NextResponse.json({ ok: true, state: result.state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "출석에 실패했습니다." },
      { status: 500 },
    );
  }
}
