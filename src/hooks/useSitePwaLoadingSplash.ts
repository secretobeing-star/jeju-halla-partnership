"use client";

import { useEffect, useState } from "react";
import {
  getPwaLoadingDurationMs,
  shouldUsePwaLoadingSplash,
} from "@/lib/site-pwa-loading";
import { isStandaloneDisplayMode, type SitePwaSettingsSource } from "@/lib/site-pwa";

const IMAGE_READY_TIMEOUT_MS = 8000;
const REVEAL_READY_TIMEOUT_MS = 8000;

type UseSitePwaLoadingSplashOptions = {
  settings: SitePwaSettingsSource;
  settingsReady: boolean;
  contentReady: boolean;
  imageUrl?: string | null;
  /** 지도 타일 등 — 사진이 끝난 뒤 바로 본문이 나오도록 준비될 때까지 스플래시를 유지 */
  revealReady?: boolean;
};

function waitForSplashImage(url: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve();
    };

    image.onload = () => {
      if (typeof image.decode === "function") {
        void image.decode().then(finish).catch(finish);
        return;
      }
      finish();
    };
    image.onerror = finish;
    image.src = url;

    if (image.complete) {
      if (typeof image.decode === "function") {
        void image.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    }
  });
}

export function useSitePwaLoadingSplash({
  settings,
  settingsReady,
  contentReady,
  imageUrl = null,
  revealReady = true,
}: UseSitePwaLoadingSplashOptions) {
  const [standalone, setStandalone] = useState(() => isStandaloneDisplayMode());
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [minDurationMet, setMinDurationMet] = useState(false);
  const [imageReady, setImageReady] = useState(() => !imageUrl?.trim());
  const [revealTimedOut, setRevealTimedOut] = useState(false);

  const enabled = shouldUsePwaLoadingSplash(settings, standalone);
  const durationMs = getPwaLoadingDurationMs(settings);
  const resolvedImageUrl = imageUrl?.trim() || "";

  useEffect(() => {
    setStandalone(isStandaloneDisplayMode());
  }, []);

  useEffect(() => {
    if (!enabled || startedAt != null) {
      return;
    }

    setStartedAt(Date.now());
  }, [enabled, startedAt]);

  useEffect(() => {
    if (!resolvedImageUrl) {
      setImageReady(true);
      return;
    }

    let cancelled = false;
    setImageReady(false);

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setImageReady(true);
      }
    }, IMAGE_READY_TIMEOUT_MS);

    void waitForSplashImage(resolvedImageUrl).then(() => {
      if (cancelled) {
        return;
      }
      requestAnimationFrame(() => {
        if (!cancelled) {
          setImageReady(true);
        }
      });
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [resolvedImageUrl]);

  useEffect(() => {
    // Wait until settings are loaded so we don't treat the default duration (0 ms) as final.
    if (!enabled || !settingsReady || startedAt == null) {
      return;
    }

    if (durationMs <= 0) {
      setMinDurationMet(true);
      return;
    }

    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, durationMs - elapsed);

    const timer = window.setTimeout(() => {
      setMinDurationMet(true);
    }, remaining);

    return () => {
      window.clearTimeout(timer);
    };
  }, [durationMs, enabled, settingsReady, startedAt]);

  useEffect(() => {
    if (!enabled || revealReady) {
      setRevealTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRevealTimedOut(true);
    }, REVEAL_READY_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [enabled, revealReady]);

  const appReady = settingsReady && contentReady;
  const mapRevealReady = revealReady || revealTimedOut;
  const visible = enabled && (!appReady || !minDurationMet || !imageReady || !mapRevealReady);
  /** 스플래시가 떠 있는 동안 지도는 뒤에서 준비만 하고, 사진이 끝난 뒤에 표시 */
  const holdMapLoading = visible;

  return {
    visible,
    enabled,
    holdMapLoading,
  };
}
