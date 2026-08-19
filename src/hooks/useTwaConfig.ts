"use client";

import { useEffect, useState } from "react";
import type { TwaClientConfig } from "@/lib/site-twa-client";
import { resolveTwaPackageName } from "@/lib/site-twa-client";

const DEFAULT_CONFIG: TwaClientConfig = {
  packageName: resolveTwaPackageName(null),
  settingsDeepLinkSupported: Boolean(resolveTwaPackageName(null)),
};

export function useTwaConfig() {
  const [config, setConfig] = useState<TwaClientConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/twa-config", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as Partial<TwaClientConfig>;
        if (cancelled) {
          return;
        }

        const packageName = resolveTwaPackageName(
          typeof payload.packageName === "string" ? payload.packageName : null,
        );
        setConfig({
          packageName,
          settingsDeepLinkSupported: Boolean(packageName),
        });
      } catch {
        // keep env fallback
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loaded };
}
