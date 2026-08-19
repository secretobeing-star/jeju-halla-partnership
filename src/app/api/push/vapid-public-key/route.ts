import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
  if (!publicKey) {
    return NextResponse.json(
      {
        enabled: false,
        publicKey: null,
        message: "VAPID_PUBLIC_KEY가 설정되지 않았습니다.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    enabled: true,
    publicKey,
  });
}
