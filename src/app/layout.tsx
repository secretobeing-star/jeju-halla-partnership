import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import AppProviders from "@/components/AppProviders";
import SiteDomainApplier from "@/components/SiteDomainApplier";
import SitePwaHeadLinks from "@/components/SitePwaHeadLinks";
import SiteTitleApplier from "@/components/SiteTitleApplier";
import SupabaseRuntimeConfigScript from "@/components/SupabaseRuntimeConfigScript";
import { buildSiteMetadata } from "@/lib/site-metadata";
import SitePwaThemeApplier from "@/components/SitePwaThemeApplier";
import { resolvePwaBackgroundColor, resolvePwaChromeTabThemeColor, resolvePwaTaskbarThemeColor } from "@/lib/site-pwa";
import {
  getPublicPwaSettings,
  getPublicSiteSettingsForMetadata,
} from "@/lib/site-settings-server";
import "./globals.css";

export const revalidate = 300;

export async function generateViewport(): Promise<Viewport> {
  const pwaSettings = await getPublicPwaSettings();

  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    interactiveWidget: "resizes-visual",
    themeColor: resolvePwaChromeTabThemeColor(pwaSettings),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettingsForMetadata();
  return buildSiteMetadata(settings);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pwaSettings = await getPublicPwaSettings();
  const pwaChromeTabThemeColor = resolvePwaChromeTabThemeColor(pwaSettings);
  const pwaTaskbarThemeColor = resolvePwaTaskbarThemeColor(pwaSettings);
  const pwaBackgroundColor = resolvePwaBackgroundColor(pwaSettings);

  return (
    <html
      lang="ko"
      style={
        {
          ["--pwa-chrome-tab-theme-color" as string]: pwaChromeTabThemeColor,
          ["--pwa-taskbar-theme-color" as string]: pwaTaskbarThemeColor,
          ["--pwa-theme-color" as string]: pwaTaskbarThemeColor,
          ["--pwa-background-color" as string]: pwaBackgroundColor,
        } as CSSProperties
      }
    >
      <head>
        <SupabaseRuntimeConfigScript />
        <SitePwaHeadLinks settings={pwaSettings} />
      </head>
      <body>
        <AppProviders>
          <SitePwaThemeApplier
            chromeTabThemeColor={pwaChromeTabThemeColor}
            taskbarThemeColor={pwaTaskbarThemeColor}
            backgroundColor={pwaBackgroundColor}
          />
          <SiteTitleApplier />
          <SiteDomainApplier />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
