"use client";

import { useEffect, useMemo, useState } from "react";

import type { Partner } from "@/lib/supabase";

type PartnerLookup = Pick<Partner, "id" | "name" | "address">;

export function usePartnerLocalFranchiseStatus(partners: PartnerLookup[]) {
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [configured, setConfigured] = useState(false);

  const partnersKey = useMemo(
    () =>
      partners
        .map((partner) => `${partner.id}:${partner.name}:${partner.address ?? ""}`)
        .join("|"),
    [partners],
  );

  useEffect(() => {
    if (partners.length === 0) {
      setResults({});
      setConfigured(false);
      return;
    }

    let cancelled = false;

    async function loadStatuses() {
      try {
        const response = await fetch("/api/local-franchise/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partners: partners.map((partner) => ({
              id: partner.id,
              name: partner.name,
              address: partner.address,
            })),
          }),
        });

        const data = (await response.json()) as {
          configured?: boolean;
          results?: Record<string, boolean>;
        };

        if (cancelled) {
          return;
        }

        setConfigured(Boolean(data.configured));
        setResults(data.results ?? {});
      } catch {
        if (!cancelled) {
          setConfigured(false);
          setResults({});
        }
      }
    }

    void loadStatuses();

    return () => {
      cancelled = true;
    };
  }, [partnersKey, partners]);

  return { results, configured };
}
