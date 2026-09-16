"use client";

import { useEffect } from "react";

const TAP_COUNT = 10;
const TAP_WINDOW_MS = 1800;

export const DEVELOPER_EGG_TAP_EVENT = "site-joho-egg-tap";

export function tapDeveloperEasterEgg() {
  window.dispatchEvent(new Event(DEVELOPER_EGG_TAP_EVENT));
}

let developerCreditLogged = false;

export function logDeveloperCredit(force = false) {
  if (developerCreditLogged && !force) return;
  developerCreditLogged = true;
  console.log(
    "%c" +
      "  ██╗ ██████╗ ██╗  ██╗ ██████╗      ██████╗        ██████╗ \n" +
      "  ██║██╔═══██╗██║  ██║██╔═══██╗    ██╔═══██╗      ██╔═══██╗\n" +
      "  ██║██║   ██║███████║██║   ██║    ██║   ██║█████╗██║   ██║\n" +
      "  ██║██║   ██║██╔══██║██║   ██║    ██║   ██║╚════╝██║   ██║\n" +
      "████║╚██████╔╝██║  ██║╚██████╔╝    ╚██████╔╝      ╚██████╔╝\n" +
      "╚═══╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝      ╚═════╝        ╚═════╝ \n" +
      "\n%c★ Designed & Built by 김주호 (@joho_o.o)\n" +
      "★ All Rights Reserved. Do not touch this binary.",
    "color: #00ff88; font-family: monospace; font-size: 10px; font-weight: bold;",
    "color: #ffffff; background: #222; font-size: 12px; padding: 4px 8px; border-radius: 4px;",
  );
}

export default function DeveloperEasterEgg() {
  useEffect(() => {
    const win = window as Window & { joho?: () => void };
    win.joho = () => logDeveloperCredit(true);

    let taps = 0;
    let tapTimer: number | null = null;

    function onTap() {
      taps += 1;
      if (tapTimer) window.clearTimeout(tapTimer);
      tapTimer = window.setTimeout(() => {
        taps = 0;
      }, TAP_WINDOW_MS);
      if (taps >= TAP_COUNT) {
        logDeveloperCredit(true);
        taps = 0;
      }
    }

    window.addEventListener(DEVELOPER_EGG_TAP_EVENT, onTap);
    return () => {
      delete win.joho;
      window.removeEventListener(DEVELOPER_EGG_TAP_EVENT, onTap);
      if (tapTimer) window.clearTimeout(tapTimer);
    };
  }, []);

  return null;
}
