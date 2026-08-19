"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isTextEntryLike(element: HTMLElement) {
  const tag = element.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    element.isContentEditable
  );
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null || element.getClientRects().length > 0,
  );
}

export function useDialogFocusTrap(
  open: boolean,
  initialFocusSelector?: string,
  options?: { autoFocus?: boolean },
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const autoFocus = options?.autoFocus ?? true;

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const initialFocus =
      (initialFocusSelector
        ? container.querySelector<HTMLElement>(initialFocusSelector)
        : null) ?? getFocusableElements(container)[0];

    window.requestAnimationFrame(() => {
      if (!autoFocus) {
        return;
      }

      const active = document.activeElement;
      if (active instanceof HTMLElement && container.contains(active) && isTextEntryLike(active)) {
        return;
      }

      initialFocus?.focus({ preventScroll: true });
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || !containerRef.current) {
        return;
      }

      const active = document.activeElement;
      if (active instanceof Element && !containerRef.current.contains(active)) {
        if (active.closest(".board-post-popup-overlay, [role='dialog'], [role='alertdialog']")) {
          return;
        }
      }

      const focusable = getFocusableElements(containerRef.current);
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (active === first || !containerRef.current.contains(active)) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        }
        return;
      }

      if (active === last || !containerRef.current.contains(active)) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (!autoFocus) {
        return;
      }
      previousFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [autoFocus, initialFocusSelector, open]);

  return containerRef;
}
