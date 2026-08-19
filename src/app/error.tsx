"use client";

import { useEffect, useState } from "react";
import SiteErrorPage from "@/components/SiteErrorPage";
import {
  ERROR_PAGE_SETTINGS_SELECT,
  getErrorPageDisplaySettings,
  type ErrorPageDisplaySettings,
  type ErrorPageSettingsSource,
} from "@/lib/error-page-settings";
import { supabase } from "@/lib/supabase";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [settings, setSettings] = useState<ErrorPageDisplaySettings>(() =>
    getErrorPageDisplaySettings(null, "500"),
  );

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    void supabase
      .from("site_settings")
      .select(ERROR_PAGE_SETTINGS_SELECT)
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        setSettings(getErrorPageDisplaySettings(data as ErrorPageSettingsSource | null, "500"));
      });
  }, []);

  return <SiteErrorPage variant="500" settings={settings} onRetry={reset} />;
}
