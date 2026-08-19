"use client";

import { useEffect, useState } from "react";
import {
  loadUserBetaSettings,
  patchUserBetaSettings,
  USER_BETA_SETTINGS_EVENT,
} from "@/lib/user-beta-settings";

type DarkModeToggleButtonProps = {
  available?: boolean;
  className?: string;
};

function MoonIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function SunIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

export default function DarkModeToggleButton({
  available = false,
  className = "",
}: DarkModeToggleButtonProps) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!available) {
      return;
    }

    const refresh = () => {
      setDarkMode(loadUserBetaSettings().dark_mode);
    };

    refresh();
    window.addEventListener(USER_BETA_SETTINGS_EVENT, refresh);
    return () => window.removeEventListener(USER_BETA_SETTINGS_EVENT, refresh);
  }, [available]);

  if (!available) {
    return null;
  }

  function toggleDarkMode() {
    const next = !darkMode;
    patchUserBetaSettings({ dark_mode: next });
    setDarkMode(next);
  }

  const label = darkMode ? "라이트 모드로 전환" : "다크 모드로 전환";

  return (
    <button
      type="button"
      onClick={toggleDarkMode}
      className={[
        "dark-mode-toggle-button site-top-toolbar__button inline-flex h-9 w-9 shrink-0 items-center justify-center",
        darkMode ? "dark-mode-toggle-button--light" : "dark-mode-toggle-button--dark",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      title={label}
      aria-pressed={darkMode}
    >
      {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
}
