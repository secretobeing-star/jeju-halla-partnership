"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import AdminPwaHeadLinks from "@/components/AdminPwaHeadLinks";
import AdminPwaTabletGate from "@/components/AdminPwaTabletGate";
import { useAdminPwaInstall } from "@/hooks/useAdminPwaInstall";
import type { SiteAdminPwaSettingsSource } from "@/lib/site-admin-pwa";
import { supabase } from "@/lib/supabase";

type AdminPwaInstallContextValue = ReturnType<typeof useAdminPwaInstall>;

const AdminPwaInstallContext = createContext<AdminPwaInstallContextValue | null>(null);

const ADMIN_PWA_SETTINGS_SELECT =
  "site_admin_pwa_enabled, site_admin_pwa_name, site_admin_pwa_short_name, site_admin_pwa_icon_url, site_admin_pwa_install_prompt_enabled, site_admin_pwa_install_guide_message, site_admin_pwa_install_button_label, site_pwa_icon_url, site_pwa_theme_color, site_pwa_chrome_tab_theme_color, site_pwa_taskbar_theme_color, site_pwa_background_color, site_favicon_url, site_nav_brand_icon_url, site_title, header_title, link_preview_title, main_domain, admin_site_title";

type AdminPwaRuntimeProps = {
  settings: SiteAdminPwaSettingsSource | null;
  children: ReactNode;
};

export function AdminPwaRuntime({ settings: initialSettings, children }: AdminPwaRuntimeProps) {
  const [settings, setSettings] = useState<SiteAdminPwaSettingsSource | null>(initialSettings);
  const install = useAdminPwaInstall(settings);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const { data } = await supabase
        .from("site_settings")
        .select(ADMIN_PWA_SETTINGS_SELECT)
        .eq("id", 1)
        .maybeSingle();

      if (!cancelled && data) {
        setSettings(data);
      }
    }

    void refresh();

    function onFocus() {
      void refresh();
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("site-settings-saved", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("site-settings-saved", onFocus);
    };
  }, []);

  return (
    <AdminPwaInstallContext.Provider value={install}>
      <AdminPwaHeadLinks settings={settings} />
      <AdminPwaTabletGate>
        {children}
        {install.shouldShowInstallBanner ? (
          <div className="admin-pwa-install-banner" role="dialog" aria-label="관리자 앱 설치">
            <div className="admin-pwa-install-banner__inner">
              {install.iconUrl ? (
                <img
                  src={install.iconUrl}
                  alt=""
                  className="admin-pwa-install-banner__icon"
                  width={40}
                  height={40}
                />
              ) : null}
              <div className="admin-pwa-install-banner__copy">
                <p className="admin-pwa-install-banner__title">{install.appName}</p>
                <p className="admin-pwa-install-banner__desc">{install.guideMessage}</p>
              </div>
              <button
                type="button"
                className="admin-pwa-install-banner__primary"
                disabled={install.installing || !install.showNativeInstall}
                onClick={() => void install.handleInstallClick()}
              >
                {install.installing ? "설치 중..." : install.installButtonLabel}
              </button>
              <button
                type="button"
                className="admin-pwa-install-banner__dismiss"
                onClick={install.dismissInstallBanner}
              >
                닫기
              </button>
            </div>
          </div>
        ) : null}
        {install.shouldShowTabletHint ? (
          <div className="admin-pwa-tablet-hint" role="status">
            <p>
              관리자 앱 설치는 가로 {install.minViewportWidth}px 이상(태블릿·폴드 펼침)에서만
              가능합니다.
            </p>
            <button type="button" onClick={install.dismissInstallBanner}>
              닫기
            </button>
          </div>
        ) : null}
      </AdminPwaTabletGate>
    </AdminPwaInstallContext.Provider>
  );
}

export function useAdminPwaInstallContext() {
  const value = useContext(AdminPwaInstallContext);
  if (!value) {
    throw new Error("useAdminPwaInstallContext must be used within AdminPwaRuntime");
  }
  return value;
}
