import { NextRequest, NextResponse } from "next/server";
import { getSeasonPassState } from "@/lib/season-pass-server";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")?.trim() || "";
  try {
    const state = await getSeasonPassState(userId);
    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "시즌패스를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
