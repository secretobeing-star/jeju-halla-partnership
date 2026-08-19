import { NextRequest, NextResponse } from "next/server";
import { rowToAdminAccess } from "@/lib/admin-permissions";
import { getRequestUser, resolveAdminAccess } from "@/lib/admin-permissions-server";
import { geocodeAddress, type MapGeocodeProvider } from "@/lib/geocode";
import {
  fetchMapGeocodeSiteSettings,
  getEnabledMapGeocodeProviders,
  isMapGeocodeProviderEnabled,
} from "@/lib/map-geocode-settings";
import { normalizePartnerMapUrl } from "@/lib/partner-map-url";
import { resolveAndParsePartnerMapUrl } from "@/lib/partner-map-url-resolve";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type RouteParams = { params: Promise<{ id: string }> };

type MapRegisterBody = {
  address?: string;
  map_url?: string;
  provider?: MapGeocodeProvider | "auto";
};

function getAccessToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
}

function parseProvider(value: unknown): MapGeocodeProvider | "auto" | undefined {
  if (value === "auto") {
    return "auto";
  }

  if (value === "naver" || value === "nominatim") {
    return value;
  }

  return undefined;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const user = await getRequestUser(getAccessToken(request));

  if (!user?.email) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const { row, error: accessError } = await resolveAdminAccess(user.id, user.email);
  if (accessError) {
    return NextResponse.json({ error: accessError }, { status: 500 });
  }

  const access = row ? rowToAdminAccess(row) : null;
  if (!access?.is_active || !access.permissions.partners) {
    return NextResponse.json({ error: "제휴업체 관리 권한이 없습니다." }, { status: 403 });
  }

  let body: MapRegisterBody;
  try {
    body = (await request.json()) as MapRegisterBody;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const mapUrlInput = body.map_url?.trim() ?? "";

  let nextLatitude: number | null = null;
  let nextLongitude: number | null = null;
  let nextMapUrl: string | null = null;
  let provider: MapGeocodeProvider | null = null;
  let roadAddress: string | null = null;
  let jibunAddress: string | null = null;

  if (mapUrlInput) {
    const { resolvedUrl, parsed: parsedMapUrl } = await resolveAndParsePartnerMapUrl(mapUrlInput);
    if (!parsedMapUrl) {
      return NextResponse.json(
        {
          error:
            "지원하지 않는 지도 링크입니다. 네이버 지도에서 「공유 → URL 복사」로 받은 링크인지 확인해 주세요.",
        },
        { status: 400 },
      );
    }

    nextLatitude = parsedMapUrl.latitude;
    nextLongitude = parsedMapUrl.longitude;
    nextMapUrl = normalizePartnerMapUrl(resolvedUrl) ?? normalizePartnerMapUrl(mapUrlInput);
  } else {
    const address = body.address?.trim();
    if (!address) {
      return NextResponse.json(
        { error: "지도 링크 또는 주소가 필요합니다." },
        { status: 400 },
      );
    }

    const geocodeSettings = await fetchMapGeocodeSiteSettings();
    const enabledProviders = getEnabledMapGeocodeProviders(geocodeSettings);

    if (!geocodeSettings.apiEnabled || enabledProviders.length === 0) {
      return NextResponse.json(
        { error: "주소 지도 API가 비활성화되어 있습니다." },
        { status: 403 },
      );
    }

    const requestedProvider = parseProvider(body.provider) ?? "auto";
    if (
      requestedProvider !== "auto" &&
      !isMapGeocodeProviderEnabled(requestedProvider, geocodeSettings)
    ) {
      return NextResponse.json(
        { error: "선택한 지도 API를 사용할 수 없습니다." },
        { status: 403 },
      );
    }

    const geocoded = await geocodeAddress(address, {
      provider: requestedProvider,
      allowedProviders: enabledProviders,
    });

    if (!geocoded) {
      return NextResponse.json({ error: "주소로 좌표를 찾지 못했습니다." }, { status: 404 });
    }

    nextLatitude = geocoded.latitude;
    nextLongitude = geocoded.longitude;
    provider = geocoded.provider;
    roadAddress = geocoded.roadAddress ?? null;
    jibunAddress = geocoded.jibunAddress ?? null;
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const { data, error } = await admin
    .from("partners")
    .update({
      latitude: nextLatitude,
      longitude: nextLongitude,
      map_url: nextMapUrl,
    })
    .eq("id", id)
    .select("id, latitude, longitude, map_url")
    .maybeSingle();

  if (error) {
    const message = error.message.includes("map_url")
      ? "partners.map_url 컬럼이 없습니다. Supabase SQL Editor에서 supabase/partner-map-url.sql을 실행해 주세요."
      : error.message.includes("latitude") || error.message.includes("longitude")
        ? "partners.latitude/longitude 컬럼이 없습니다. Supabase 기본 partners 테이블을 확인해 주세요."
        : error.message;

    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "제휴 업체를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    latitude: data.latitude,
    longitude: data.longitude,
    map_url: data.map_url,
    provider,
    roadAddress,
    jibunAddress,
  });
}
