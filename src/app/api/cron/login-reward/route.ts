import { NextRequest, NextResponse } from "next/server";
import { dispatchScheduledLoginRewards } from "@/lib/login-reward-server";

function isAuthorizedCron(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  if (request.headers.get("x-vercel-cron") === "1") {
    return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchScheduledLoginRewards();
  return NextResponse.json({ ok: true, ...result });
}
