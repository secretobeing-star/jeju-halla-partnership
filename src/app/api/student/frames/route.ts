import { NextResponse } from "next/server";
import {
  loadCardFrameCatalogFromDb,
  toPublicCardFrames,
} from "@/lib/student-card-frames";

/** 공개 테두리 목록 (시크릿 코드 제외) */
export async function GET() {
  try {
    const catalog = await loadCardFrameCatalogFromDb();
    return NextResponse.json({
      frames: toPublicCardFrames(catalog),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "코스튬 목록을 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
