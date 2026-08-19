"use client";

import PromptModalProvider from "@/components/PromptModalProvider";
import SitePwaFoldViewportApplier from "@/components/SitePwaFoldViewportApplier";
import { SiteAppBackProvider } from "@/lib/app-back-stack";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SiteAppBackProvider>
      <PromptModalProvider>
        <SitePwaFoldViewportApplier />
        {children}
      </PromptModalProvider>
    </SiteAppBackProvider>
  );
}
