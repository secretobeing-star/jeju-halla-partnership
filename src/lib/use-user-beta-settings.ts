"use client";

import { useEffect, useState } from "react";
import {
  loadUserBetaSettings,
  USER_BETA_SETTINGS_EVENT,
  type UserBetaSettings,
} from "@/lib/user-beta-settings";

export function useUserBetaSettings() {
  const [prefs, setPrefs] = useState<UserBetaSettings>(() => loadUserBetaSettings());

  useEffect(() => {
    const refresh = () => setPrefs(loadUserBetaSettings());
    refresh();
    window.addEventListener(USER_BETA_SETTINGS_EVENT, refresh);
    return () => window.removeEventListener(USER_BETA_SETTINGS_EVENT, refresh);
  }, []);

  return prefs;
}
