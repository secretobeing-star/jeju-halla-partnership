import { NextRequest, NextResponse } from "next/server";
import { resolveAndParsePartnerMapUrl } from "@/lib/partner-map-url-resolve";

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  if (!rawUrl) {
    return NextResponse.json({ error: "url 파라미터가 필요합니다." }, { status: 400 });
  }

  const { resolvedUrl, parsed } = await resolveAndParsePartnerMapUrl(rawUrl);

  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "지원하지 않는 링크입니다. 네이버 지도에서 「공유 → URL 복사」로 받은 링크인지 확인해 주세요.",
        url: resolvedUrl,
        parsed: null,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    url: resolvedUrl,
    parsed: {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      embedUrl: parsed.embedUrl,
    },
  });
}
