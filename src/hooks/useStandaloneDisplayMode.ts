"use client";

import { useEffect, useState } from "react";
import { isStandaloneDisplayMode } from "@/lib/site-pwa";

const DISPLAY_MODE_QUERIES = [
  "(display-mode: standalone)",
  "(display-mode: fullscreen)",
  "(display-mode: minimal-ui)",
  "(display-mode: window-controls-overlay)",
] as const;

export function useStandaloneDisplayMode() {
  const [standalone, setStandalone] = useState(() => isStandaloneDisplayMode());

  useEffect(() => {
    const update = () => {
      setStandalone(isStandaloneDisplayMode());
    };

    update();

    const mediaQueries = DISPLAY_MODE_QUERIES.map((query) => window.matchMedia(query));
    for (const mediaQuery of mediaQueries) {
      mediaQuery.addEventListener("change", update);
    }

    return () => {
      for (const mediaQuery of mediaQueries) {
        mediaQuery.removeEventListener("change", update);
      }
    };
  }, []);

  return standalone;
}
