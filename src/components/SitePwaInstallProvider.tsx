"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSitePwaInstall } from "@/hooks/useSitePwaInstall";
import type { SitePwaSettingsSource } from "@/lib/site-pwa";

type SitePwaInstallContextValue = ReturnType<typeof useSitePwaInstall>;

const SitePwaInstallContext = createContext<SitePwaInstallContextValue | null>(null);

type SitePwaInstallProviderProps = {
  settings: SitePwaSettingsSource;
  settingsReady?: boolean;
  children: ReactNode;
};

export function SitePwaInstallProvider({
  settings,
  settingsReady = true,
  children,
}: SitePwaInstallProviderProps) {
  const value = useSitePwaInstall(settings, { settingsReady });

  return (
    <SitePwaInstallContext.Provider value={value}>{children}</SitePwaInstallContext.Provider>
  );
}

export function useSitePwaInstallContext() {
  const value = useContext(SitePwaInstallContext);
  if (!value) {
    throw new Error("useSitePwaInstallContext must be used within SitePwaInstallProvider");
  }
  return value;
}
