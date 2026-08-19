"use client";

import { useStandaloneDisplayMode } from "@/hooks/useStandaloneDisplayMode";

/** PWA/독립 실행(display-mode: standalone 등) 여부 */
export function useIsPWA() {
  return useStandaloneDisplayMode();
}
