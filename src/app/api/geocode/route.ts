import { NextRequest, NextResponse } from "next/server";

import { geocodeAddress, type MapGeocodeProvider } from "@/lib/geocode";

import {

  fetchMapGeocodeSiteSettings,

  getDefaultEnabledMapGeocodeProvider,

  getEnabledMapGeocodeProviders,

  isMapGeocodeProviderEnabled,

} from "@/lib/map-geocode-settings";



function parseProvider(value: string | null): MapGeocodeProvider | "auto" | undefined {

  if (!value) {

    return undefined;

  }



  if (value === "auto") {

    return "auto";

  }



  if (value === "naver" || value === "nominatim") {

    return value;

  }



  return undefined;

}



export async function GET(request: NextRequest) {

  const address = request.nextUrl.searchParams.get("address")?.trim();

  const provider = parseProvider(request.nextUrl.searchParams.get("provider"));

  const geocodeSettings = await fetchMapGeocodeSiteSettings();

  const enabledProviders = getEnabledMapGeocodeProviders(geocodeSettings);



  if (!address) {

    return NextResponse.json({

      apiEnabled: geocodeSettings.apiEnabled,

      defaultProvider: getDefaultEnabledMapGeocodeProvider(geocodeSettings),

      providers: enabledProviders,

    });

  }



  if (!geocodeSettings.apiEnabled || enabledProviders.length === 0) {

    return NextResponse.json(

      { error: "주소 지도 API가 비활성화되어 있습니다." },

      { status: 403 },

    );

  }



  if (provider && provider !== "auto" && !isMapGeocodeProviderEnabled(provider, geocodeSettings)) {

    return NextResponse.json(

      { error: "선택한 지도 API를 사용할 수 없습니다." },

      { status: 403 },

    );

  }



  const result = await geocodeAddress(address, {

    provider: provider ?? "auto",

    allowedProviders: enabledProviders,

  });



  if (!result) {

    return NextResponse.json({ error: "주소로 좌표를 찾지 못했습니다." }, { status: 404 });

  }



  return NextResponse.json(result);

}

