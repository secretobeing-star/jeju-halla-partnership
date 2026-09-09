import { NextResponse } from "next/server";
import { markStampReadyPushSent, sendStampReadyPush } from "@/lib/stamp-ready-push";

type Body = {
  userId?: string;
  eventId?: string;
  clientKey?: string;
  partnerId?: string;
  partnerName?: string;
  eventTitle?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const userId = body.userId?.trim() || "";
  const eventId = body.eventId?.trim() || "";
  const partnerName = body.partnerName?.trim() || "제휴처";
  if (!userId) {
    return NextResponse.json({ error: "userId가 필요합니다." }, { status: 400 });
  }

  const result = await sendStampReadyPush({
    lookupKeys: [body.clientKey, userId],
    partnerId: body.partnerId?.trim() || "",
    partnerName,
    eventTitle: body.eventTitle,
  });

  if (eventId) {
    await markStampReadyPushSent(userId, eventId);
  }

  return NextResponse.json({ ok: true, result });
}
