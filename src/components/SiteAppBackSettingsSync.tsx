"use client";

import { useLayoutEffect } from "react";
import {
  hydrateSiteAppBackExitSettingsFromCache,
  syncSiteAppBackExitSettings,
  type SitePwaBackExitSettingsSource,
} from "@/lib/app-back-stack";

type SiteAppBackSettingsSyncProps = {
  settings: SitePwaBackExitSettingsSource;
  /** false면 서버 설정 도착 전 — 기본값으로 덮지 않고 캐시만 사용 */
  ready?: boolean;
};

export default function SiteAppBackSettingsSync({
  settings,
  ready = true,
}: SiteAppBackSettingsSyncProps) {
  useLayoutEffect(() => {
    if (!ready) {
      hydrateSiteAppBackExitSettingsFromCache();
      return;
    }

    syncSiteAppBackExitSettings({
      site_pwa_back_exit_enabled: settings.site_pwa_back_exit_enabled,
      site_pwa_back_exit_message: settings.site_pwa_back_exit_message,
      site_pwa_back_exit_timeout_ms: settings.site_pwa_back_exit_timeout_ms,
      site_pwa_back_exit_popup_enabled: settings.site_pwa_back_exit_popup_enabled,
      site_pwa_back_exit_popup_title: settings.site_pwa_back_exit_popup_title,
      site_pwa_back_exit_popup_message: settings.site_pwa_back_exit_popup_message,
      site_pwa_loading_back_exit_enabled: settings.site_pwa_loading_back_exit_enabled,
    });
  }, [
    ready,
    settings.site_pwa_back_exit_enabled,
    settings.site_pwa_back_exit_message,
    settings.site_pwa_back_exit_timeout_ms,
    settings.site_pwa_back_exit_popup_enabled,
    settings.site_pwa_back_exit_popup_title,
    settings.site_pwa_back_exit_popup_message,
    settings.site_pwa_loading_back_exit_enabled,
  ]);

  return null;
}
