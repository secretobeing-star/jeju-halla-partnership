import { NextRequest } from "next/server";
import { GET as getSiteAnalytics } from "@/app/api/admin/analytics/route";

export async function GET(request: NextRequest) {
  return getSiteAnalytics(request);
}
