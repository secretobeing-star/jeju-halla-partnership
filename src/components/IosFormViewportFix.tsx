"use client";

import { useEffect } from "react";
import { isTextEntryElement } from "@/lib/text-entry";

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function syncKeyboardInset() {
  const root = document.documentElement;
  const visual = window.visualViewport;
  if (!visual) {
    root.style.setProperty("--keyboard-inset", "0px");
    root.classList.remove("keyboard-open");
    return;
  }

  const inset = Math.max(0, Math.round(window.innerHeight - visual.height - visual.offsetTop));
  root.style.setProperty("--keyboard-inset", `${inset}px`);
  root.classList.toggle("keyboard-open", inset > 64);
}

export default function IosFormViewportFix() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    syncKeyboardInset();
    const visual = window.visualViewport;
    visual?.addEventListener("resize", syncKeyboardInset);
    visual?.addEventListener("scroll", syncKeyboardInset);
    window.addEventListener("orientationchange", syncKeyboardInset);

    function onFocusIn(event: FocusEvent) {
      const target = event.target;
      if (!isTextEntryElement(target) || !(target instanceof HTMLElement)) return;
      window.setTimeout(() => {
        if (document.activeElement !== target) return;
        target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        syncKeyboardInset();
      }, isIosDevice() ? 380 : 160);
    }

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", syncKeyboardInset, true);

    return () => {
      visual?.removeEventListener("resize", syncKeyboardInset);
      visual?.removeEventListener("scroll", syncKeyboardInset);
      window.removeEventListener("orientationchange", syncKeyboardInset);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", syncKeyboardInset, true);
      document.documentElement.style.removeProperty("--keyboard-inset");
      document.documentElement.classList.remove("keyboard-open");
    };
  }, []);

  return null;
}
