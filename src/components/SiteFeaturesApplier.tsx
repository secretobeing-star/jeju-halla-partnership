"use client";



import { useEffect, useState } from "react";

import { getDeveloperModeSettings } from "@/lib/developer-mode-settings";

import {

  DEFAULT_SITE_SCALE_PERCENT,

  getSiteScaleMultiplier,

  MAIN_FONT_SIZE_CLASSES,

  normalizeSiteScalePercent,

  siteScalePercentToFontSize,

  type MainFontSize,

} from "@/lib/main-font-size";

import {

  getEffectiveMainBoardPosition,
  resolveMainBoardPlacement,

  normalizeMainBoardPosition,

  type MainBoardPosition,

} from "@/lib/main-board-position";

import { getPageBackgroundStyle, getEffectivePageBackground } from "@/lib/page-background";

import { SiteSettings } from "@/lib/supabase";

import {

  loadUserBetaSettings,

  patchUserBetaSettings,

  USER_BETA_SETTINGS_EVENT,

  UserBetaSettings,

} from "@/lib/user-beta-settings";

import { useIsMobileDevice } from "@/lib/mobile-viewport";
import { useStandaloneDisplayMode } from "@/hooks/useStandaloneDisplayMode";
import { isPwaStandaloneDesktopLayout } from "@/lib/site-pwa";



type SiteFeaturesApplierProps = {

  settings: Partial<SiteSettings>;

  useUserBetaSettings?: boolean;

};



const DEFAULT_VIEWPORT =
  "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-visual";



function restoreViewport() {

  const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;

  if (meta) {

    meta.content = DEFAULT_VIEWPORT;

  }

}



function getEffectiveFeatures(

  settings: Partial<SiteSettings>,

  userPrefs: UserBetaSettings,

  useUserBetaSettings: boolean,

  isMobileDevice: boolean,

  pwaStandaloneDesktopLayout: boolean,

) {

  const admin = getDeveloperModeSettings(settings);



  if (!useUserBetaSettings) {

    return {

      ...admin,

      dark_mode_enabled: false,

      mobile_pc_mode_enabled: false,

      page_background_enabled: false,

      main_font_size: "medium" as MainFontSize,

      main_font_scale: 1,

      site_scale_percent: DEFAULT_SITE_SCALE_PERCENT,

      main_board_position: resolveMainBoardPlacement(settings),

    };

  }



  const siteScalePercent = admin.main_font_size_enabled

    ? normalizeSiteScalePercent(userPrefs.site_scale_percent)

    : DEFAULT_SITE_SCALE_PERCENT;

  const mainFontSize = siteScalePercentToFontSize(siteScalePercent);



  return {

    ...admin,

    dark_mode_enabled: admin.dark_mode_enabled && userPrefs.dark_mode,

    mobile_pc_mode_enabled:
      admin.mobile_pc_mode_enabled &&
      ((isMobileDevice && userPrefs.mobile_pc_mode) || pwaStandaloneDesktopLayout),

    page_background_enabled:
      admin.page_background_enabled &&
      getEffectivePageBackground(
        userPrefs.page_background,
        settings.page_background_default_enabled,
      ),

    main_font_size: mainFontSize,

    main_font_scale: getSiteScaleMultiplier(siteScalePercent, admin.main_font_size_enabled),

    site_scale_percent: siteScalePercent,

    main_board_position: resolveMainBoardPlacement(settings, userPrefs.board_position),

  };

}



export default function SiteFeaturesApplier({

  settings,

  useUserBetaSettings = false,

}: SiteFeaturesApplierProps) {

  const [userPrefs, setUserPrefs] = useState<UserBetaSettings>(() => loadUserBetaSettings());

  const isMobileDevice = useIsMobileDevice();
  const standaloneMode = useStandaloneDisplayMode();
  const pwaStandaloneDesktopLayout = isPwaStandaloneDesktopLayout(settings, {
    standalone: standaloneMode,
    isMobileDevice,
  });

  const adminMobilePcModeEnabled =
    getDeveloperModeSettings(settings).mobile_pc_mode_enabled ?? false;

  useEffect(() => {
    if (adminMobilePcModeEnabled) {
      return;
    }

    const prefs = loadUserBetaSettings();
    if (!prefs.mobile_pc_mode) {
      return;
    }

    patchUserBetaSettings({ mobile_pc_mode: false });
  }, [adminMobilePcModeEnabled]);



  useEffect(() => {

    if (!useUserBetaSettings) {

      return;

    }



    const refresh = () => setUserPrefs(loadUserBetaSettings());

    refresh();

    window.addEventListener(USER_BETA_SETTINGS_EVENT, refresh);

    return () => window.removeEventListener(USER_BETA_SETTINGS_EVENT, refresh);

  }, [useUserBetaSettings]);



  const features = getEffectiveFeatures(

    settings,

    userPrefs,

    useUserBetaSettings,

    isMobileDevice,

    pwaStandaloneDesktopLayout,

  );



  useEffect(() => {

    if (!useUserBetaSettings) {

      return;

    }



    const root = document.documentElement;



    restoreViewport();



    root.classList.toggle("dark-mode", features.dark_mode_enabled);
  }, [features.dark_mode_enabled, useUserBetaSettings]);

  useEffect(() => {
    if (!useUserBetaSettings) {
      return;
    }

    const root = document.documentElement;

    root.classList.toggle("mobile-pc-mode", features.mobile_pc_mode_enabled);

    document.body.classList.toggle("mobile-pc-mode", features.mobile_pc_mode_enabled);
  }, [features.mobile_pc_mode_enabled, useUserBetaSettings]);

  useEffect(() => {
    if (!useUserBetaSettings) {
      return;
    }

    const root = document.documentElement;

    root.classList.remove(
      MAIN_FONT_SIZE_CLASSES.small,
      MAIN_FONT_SIZE_CLASSES.medium,
      MAIN_FONT_SIZE_CLASSES.large,
    );

    if (features.main_font_scale !== 1) {
      root.style.fontSize = `${features.site_scale_percent}%`;
    } else {
      root.style.removeProperty("font-size");
      root.classList.add(MAIN_FONT_SIZE_CLASSES.medium);
    }

    root.style.setProperty("--main-font-scale", String(features.main_font_scale));
  }, [
    features.main_font_size,
    features.main_font_scale,
    features.site_scale_percent,
    useUserBetaSettings,
  ]);

  useEffect(() => {
    if (!useUserBetaSettings) {
      return;
    }

    const root = document.documentElement;

    if (features.page_background_enabled) {
      const { color, imageUrl } = getPageBackgroundStyle(settings);

      root.classList.add("custom-page-background");
      root.style.setProperty("--page-background-color", color);

      if (imageUrl) {
        root.style.setProperty("--page-background-image", `url("${imageUrl}")`);
      } else {
        root.style.removeProperty("--page-background-image");
      }
    } else {
      root.classList.remove("custom-page-background");
      root.style.removeProperty("--page-background-color");
      root.style.removeProperty("--page-background-image");
    }
  }, [
    features.page_background_enabled,
    settings.page_background_color,
    settings.page_background_image_url,
    useUserBetaSettings,
  ]);



  useEffect(() => {

    if (!useUserBetaSettings) {

      return;

    }



    return () => {

      const root = document.documentElement;

      root.classList.remove("dark-mode", "mobile-pc-mode", "custom-page-background");

      root.classList.remove(

        MAIN_FONT_SIZE_CLASSES.small,

        MAIN_FONT_SIZE_CLASSES.medium,

        MAIN_FONT_SIZE_CLASSES.large,

      );

      root.style.removeProperty("font-size");

      root.style.removeProperty("--main-font-scale");

      root.style.removeProperty("--page-background-color");

      root.style.removeProperty("--page-background-image");

      document.body.classList.remove("mobile-pc-mode");

      restoreViewport();

    };

  }, [useUserBetaSettings]);



  return null;

}

