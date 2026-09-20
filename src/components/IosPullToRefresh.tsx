"use client";

import { useEffect, useRef, useState } from "react";
import { isIOSDevice } from "@/lib/in-app-browser";
import { isSoftKeyboardOpen, isTextEntryElement } from "@/lib/text-entry";

const PULL_THRESHOLD = 72;
const MAX_PULL = 112;

function pageScrollTop() {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function isBlocked() {
  if (isSoftKeyboardOpen()) return true;
  if (document.body.classList.contains("board-post-popup-open")) return true;
  if (document.body.classList.contains("site-popup-open")) return true;
  if (document.body.classList.contains("site-event-open")) return true;
  if (document.querySelector(".ai-chatbot__panel")) return true;
  if (document.querySelector(".site-pwa-loading-splash")) return true;
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
  const [pull, setPull] = useState(0);
  const [ready, setReady] = useState(false);
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
      if (isBlocked() || isTextEntryElement(event.target) || hasInnerScroll(event.target)) {
        pulling.current = false;
        return;
      }
      if (pageScrollTop() > 2) {
        pulling.current = false;
        return;
      }
      startY.current = event.touches[0].clientY;
      pulling.current = true;
      setReady(false);
    }

    function onMove(event: TouchEvent) {
      if (!pulling.current || event.touches.length !== 1) return;
      if (pageScrollTop() > 2) {
        pulling.current = false;
        pullRef.current = 0;
        setPull(0);
        setReady(false);
        return;
      }
      const delta = event.touches[0].clientY - startY.current;
      if (delta <= 0) {
        pullRef.current = 0;
        setPull(0);
        setReady(false);
        return;
      }
      const next = Math.min(MAX_PULL, delta * 0.55);
      pullRef.current = next;
      setPull(next);
      setReady(next >= PULL_THRESHOLD);
      if (delta > 12) {
        event.preventDefault();
      }
    }

    function onEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      const amount = pullRef.current;
      if (amount >= PULL_THRESHOLD) {
        setPull(PULL_THRESHOLD);
        window.setTimeout(() => window.location.reload(), 160);
      } else {
        pullRef.current = 0;
        setPull(0);
        setReady(false);
      }
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

  if (!enabled || pull <= 0) return null;

  return (
    <div className="ios-pull-refresh" style={{ height: `${Math.round(pull)}px` }} aria-hidden>
      <span className={`ios-pull-refresh__label${ready ? " is-ready" : ""}`}>
        {ready ? "놓으면 새로고침" : "아래로 당겨 새로고침"}
      </span>
    </div>
  );
}
