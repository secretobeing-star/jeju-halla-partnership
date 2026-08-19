"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyRuntimeSupabaseEnv } from "@/lib/supabase-env";
import { resetSupabaseClient } from "@/lib/supabase";

type SupabaseConfigState = {
  configured: boolean | null;
  checking: boolean;
};

const SupabaseConfigContext = createContext<SupabaseConfigState>({
  configured: null,
  checking: true,
});

async function fetchConfigCheck(): Promise<boolean | null> {
  const response = await fetch("/api/config-check", { cache: "no-store" });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { supabaseConfigured?: boolean };
  return typeof payload.supabaseConfigured === "boolean" ? payload.supabaseConfigured : null;
}

async function bootstrapPublicConfig(): Promise<boolean> {
  const response = await fetch("/api/supabase-public-config", { cache: "no-store" });
  if (!response.ok) {
    return false;
  }

  const payload = (await response.json()) as {
    configured?: boolean;
    url?: string;
    anonKey?: string;
  };

  if (payload.configured && payload.url && payload.anonKey) {
    applyRuntimeSupabaseEnv({ url: payload.url, anonKey: payload.anonKey });
    resetSupabaseClient();
    return true;
  }

  return false;
}

export async function resolveSupabaseConfigured(serverHint?: boolean): Promise<boolean> {
  if (serverHint === true) {
    const bootstrapped = await bootstrapPublicConfig();
    if (bootstrapped) {
      return true;
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const checked = await fetchConfigCheck();
    if (checked === true) {
      await bootstrapPublicConfig();
      return true;
    }
    if (checked === false) {
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }

  return serverHint ?? false;
}

export function SupabaseConfigProvider({
  serverConfigured,
  children,
}: {
  serverConfigured: boolean;
  children: ReactNode;
}) {
  const [state, setState] = useState<SupabaseConfigState>(() => ({
    configured: serverConfigured ? true : null,
    checking: true,
  }));

  useEffect(() => {
    let cancelled = false;

    void resolveSupabaseConfigured(serverConfigured).then((configured) => {
      if (cancelled) {
        return;
      }

      setState({
        configured,
        checking: false,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [serverConfigured]);

  const value = useMemo(() => state, [state]);

  return (
    <SupabaseConfigContext.Provider value={value}>{children}</SupabaseConfigContext.Provider>
  );
}

export function useSupabaseConfigState() {
  return useContext(SupabaseConfigContext);
}
