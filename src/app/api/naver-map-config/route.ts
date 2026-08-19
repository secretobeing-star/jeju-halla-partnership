import { NextResponse } from "next/server";
import {
  isLikelyGeocodeOnlyMapKey,
  resolveNaverMapClientConfig,
} from "@/lib/naver-map-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = resolveNaverMapClientConfig();

  return NextResponse.json({
    clientId: config.clientId,
    available: Boolean(config.clientId),
    keySource: config.keySource,
    geocodeKeyFallback: isLikelyGeocodeOnlyMapKey(config.keySource),
  });
}
