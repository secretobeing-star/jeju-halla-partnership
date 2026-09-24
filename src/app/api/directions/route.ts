import { NextRequest, NextResponse } from "next/server";
import { getMapRoutePath } from "@/lib/map-directions";

function parseCoord(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const startLat = parseCoord(request.nextUrl.searchParams.get("startLat"));
  const startLng = parseCoord(request.nextUrl.searchParams.get("startLng"));
  const goalLat = parseCoord(request.nextUrl.searchParams.get("goalLat"));
  const goalLng = parseCoord(request.nextUrl.searchParams.get("goalLng"));

  if (startLat == null || startLng == null || goalLat == null || goalLng == null) {
    return NextResponse.json({ error: "출발지와 도착지 좌표가 필요합니다." }, { status: 400 });
  }

  if (
    startLat < -90 ||
    startLat > 90 ||
    goalLat < -90 ||
    goalLat > 90 ||
    startLng < -180 ||
    startLng > 180 ||
    goalLng < -180 ||
    goalLng > 180
  ) {
    return NextResponse.json({ error: "좌표가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const result = await getMapRoutePath(
      { latitude: startLat, longitude: startLng },
      { latitude: goalLat, longitude: goalLng },
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "경로를 찾지 못했습니다." }, { status: 502 });
  }
}
