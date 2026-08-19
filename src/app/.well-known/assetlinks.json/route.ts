import { NextResponse } from "next/server";
import { buildTwaAssetLinks } from "@/lib/twa-asset-links";

export const revalidate = 300;

export async function GET() {
  const assetLinks = buildTwaAssetLinks();

  if (!assetLinks) {
    return NextResponse.json(
      {
        error: "TWA asset links are not configured.",
        hint: "Set TWA_ANDROID_PACKAGE_NAME and TWA_SHA256_FINGERPRINTS in the server environment.",
      },
      {
        status: 404,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-cache, must-revalidate",
        },
      },
    );
  }

  return NextResponse.json(assetLinks, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, must-revalidate",
    },
  });
}
