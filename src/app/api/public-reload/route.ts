import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/admin-auth-guard";
import { bumpPublicReloadAt, syncPublicReloadForDeploy } from "@/lib/public-reload-server";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const { at, build } = await syncPublicReloadForDeploy();
  return NextResponse.json({ at, build }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  const auth = await adminAuthMiddleware(request, null);
  if ("error" in auth) return auth.error;

  const at = await bumpPublicReloadAt();
  if (!at) {
    return NextResponse.json(
      { error: "새로고침 신호를 저장하지 못했습니다." },
      { status: 500, headers: noStore },
    );
  }

  return NextResponse.json({ ok: true, at }, { headers: noStore });
}
