"use client";

import { useEffect, useState } from "react";
import {
  resolveSupabaseConfigured,
  useSupabaseConfigState,
} from "@/components/SupabaseConfigProvider";

export { SupabaseConfigProvider, useSupabaseConfigState } from "@/components/SupabaseConfigProvider";

/** @deprecated Prefer useSupabaseConfigState in admin. Kept for other pages. */
export function useSupabaseConfigured(serverHint?: boolean): boolean | null {
  const [configured, setConfigured] = useState<boolean | null>(
    serverHint === undefined ? null : serverHint,
  );

  useEffect(() => {
    let cancelled = false;

    void resolveSupabaseConfigured(serverHint).then((next) => {
      if (!cancelled) {
        setConfigured(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [serverHint]);

  return configured;
}
