"use client";

import { useEffect, useState } from "react";
import { getNaverMapClientId, setNaverMapClientId } from "@/lib/naver-maps-loader";

type NaverMapConfigState = {
  clientId: string | null;
  loading: boolean;
  available: boolean;
  geocodeKeyFallback: boolean;
};

export function useNaverMapConfig(): NaverMapConfigState {
  const buildTimeClientId = getNaverMapClientId();
  const [clientId, setClientId] = useState<string | null>(buildTimeClientId);
  const [loading, setLoading] = useState(!buildTimeClientId);
  const [geocodeKeyFallback, setGeocodeKeyFallback] = useState(false);

  useEffect(() => {
    if (buildTimeClientId) {
      return;
    }

    let cancelled = false;

    void fetch("/api/naver-map-config", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { clientId?: string | null; geocodeKeyFallback?: boolean }) => {
        if (cancelled) {
          return;
        }

        const resolved = data.clientId?.trim() || null;
        if (resolved) {
          setNaverMapClientId(resolved);
        }
        setClientId(resolved);
        setGeocodeKeyFallback(Boolean(data.geocodeKeyFallback));
      })
      .catch(() => {
        if (!cancelled) {
          setClientId(null);
          setGeocodeKeyFallback(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [buildTimeClientId]);

  return {
    clientId,
    loading,
    available: Boolean(clientId),
    geocodeKeyFallback,
  };
}
