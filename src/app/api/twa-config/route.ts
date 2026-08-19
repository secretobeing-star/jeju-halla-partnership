import { NextResponse } from "next/server";
import { getTwaAndroidPackageName } from "@/lib/twa-asset-links";

export const revalidate = 300;

export async function GET() {
  const packageName = getTwaAndroidPackageName();

  return NextResponse.json({
    packageName,
    settingsDeepLinkSupported: Boolean(packageName),
  });
}
