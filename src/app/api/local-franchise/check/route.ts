import { NextRequest, NextResponse } from "next/server";

import {
  checkLocalFranchiseAvailability,
  checkLocalFranchiseAvailabilityBatch,
} from "@/lib/local-franchise-api";

type BatchPartnerInput = {
  id?: unknown;
  name?: unknown;
  address?: unknown;
};

function parseBatchPartners(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const partner = item as BatchPartnerInput;
      const id = typeof partner.id === "string" ? partner.id.trim() : "";
      const name = typeof partner.name === "string" ? partner.name.trim() : "";
      const address =
        typeof partner.address === "string" ? partner.address.trim() : null;

      if (!id || !name) {
        return null;
      }

      return { id, name, address };
    })
    .filter((item): item is { id: string; name: string; address: string | null } =>
      Boolean(item),
    )
    .slice(0, 30);
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim() ?? "";
  const address = request.nextUrl.searchParams.get("address")?.trim() ?? null;

  if (!name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 },
    );
  }

  try {
    const result = await checkLocalFranchiseAvailability({ name, address });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        available: false,
        match: null,
        error: error instanceof Error ? error.message : "local-franchise check failed",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: { partners?: unknown };
  try {
    body = (await request.json()) as { partners?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const partners = parseBatchPartners(body.partners);
  if (partners.length === 0) {
    return NextResponse.json(
      { error: "partners array is required" },
      { status: 400 },
    );
  }

  try {
    const result = await checkLocalFranchiseAvailabilityBatch(partners);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        results: {},
        error: error instanceof Error ? error.message : "local-franchise batch check failed",
      },
      { status: 502 },
    );
  }
}
