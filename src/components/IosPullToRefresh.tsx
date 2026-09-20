"use client";

import { useEffect, useRef, useState } from "react";
import { isIOSDevice } from "@/lib/in-app-browser";
import { isSoftKeyboardOpen, isTextEntryElement } from "@/lib/text-entry";

const PULL_THRESHOLD = 64;

function pageScrollTop() {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function isBlocked(target: EventTarget | null) {
  if (isSoftKeyboardOpen()) return true;
  if (document.body.classList.contains("board-post-popup-open")) return true;
  if (document.body.classList.contains("site-popup-open")) return true;
  if (document.body.classList.contains("site-event-open")) return true;
  if (document.querySelector(".ai-chatbot__panel")) return true;
  if (document.querySelector(".site-pwa-loading-splash")) return true;
  if (target instanceof Element) {
    if (
      target.closest(
        ".partner-main-map, .partner-main-map__canvas, .naver-map-embed, .ai-chatbot, .floating-page-controls",
      )
    ) {
      return true;
    }
  }
  return false;
}

function hasInnerScroll(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  let node: HTMLElement | null = target;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollTop > 2) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

export default function IosPullToRefresh() {
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullRef = useRef(0);

  useEffect(() => {
    setEnabled(isIOSDevice());
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function onStart(event: TouchEvent) {
      if (event.touches.length !== 1) return;
      if (isBlocked(event.target) || isTextEntryElement(event.target) || hasInnerScroll(event.target)) {
        pulling.current = false;
        return;
      }
      if (pageScrollTop() > 2) {
        pulling.current = false;
        return;
      }
      startY.current = event.touches[0].clientY;
      pulling.current = true;
      pullRef.current = 0;
      setVisible(false);
    }

    function onMove(event: TouchEvent) {
      if (!pulling.current || event.touches.length !== 1) return;
      if (pageScrollTop() > 2) {
        pulling.current = false;
        pullRef.current = 0;
        setVisible(false);
        return;
      }
      const delta = event.touches[0].clientY - startY.current;
      if (delta <= 8) {
        pullRef.current = 0;
        setVisible(false);
        return;
      }
      pullRef.current = delta;
      setVisible(true);
      if (delta > 12) {
        event.preventDefault();
      }
    }

    function onEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      const amount = pullRef.current;
      pullRef.current = 0;
      if (amount >= PULL_THRESHOLD) {
        window.location.reload();
        return;
      }
      setVisible(false);
    }

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled]);

  if (!enabled || !visible) return null;

  return (
    <div className="ios-pull-refresh" aria-hidden>
      <span className="ios-pull-refresh__label">새로고침</span>
    </div>
  );
}
