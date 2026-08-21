import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    configured: false,
    available: false,
    match: null,
    message: "Local franchise check is disabled.",
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    configured: false,
    results: {},
    message: "Local franchise batch check is disabled.",
  });
}