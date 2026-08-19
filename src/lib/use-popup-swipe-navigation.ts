"use client";

import { useCallback, useEffect, useRef } from "react";
import { isTextEntryActive } from "@/lib/text-entry";

const POPUP_SWIPE_MIN_DISTANCE_PX = 48;
const POPUP_SWIPE_HORIZONTAL_RATIO = 1.25;
const POPUP_SWIPE_LOCK_PX = 8;

const SWIPE_BLOCK_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a",
  "label",
  "form",
  "[contenteditable='true']",
  "[role='textbox']",
  ".board-comments",
  ".partner-reviews",
  ".site-event-comments",
  ".tablet-split-layout__master",
  ".board-community-list",
].join(", ");

type UsePopupSwipeNavigationOptions = {
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  enabled?: boolean;
};

type TouchStartState = {
  x: number;
  y: number;
  locked: "horizontal" | "vertical" | null;
  blocked: boolean;
};

function isSwipeBlocked(target: EventTarget | null) {
  if (isTextEntryActive()) {
    return true;
  }

  if (!(target instanceof Element)) {
    return true;
  }

  // 이벤트 카드·분류 탭은 button이지만 좌우 스와이프가 핵심 UX라 차단하지 않음
  if (target.closest(".site-event-card, .site-event-board-filters")) {
    return false;
  }

  return Boolean(target.closest(SWIPE_BLOCK_SELECTOR));
}

export function usePopupSwipeNavigation({
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  enabled = true,
}: UsePopupSwipeNavigationOptions) {
  const cleanupRef = useRef<(() => void) | null>(null);
  const onPreviousRef = useRef(onPrevious);
  const onNextRef = useRef(onNext);
  const hasPreviousRef = useRef(hasPrevious);
  const hasNextRef = useRef(hasNext);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    onPreviousRef.current = onPrevious;
    onNextRef.current = onNext;
    hasPreviousRef.current = hasPrevious;
    hasNextRef.current = hasNext;
    enabledRef.current = enabled;
  }, [enabled, hasNext, hasPrevious, onNext, onPrevious]);

  useEffect(
    () => () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    },
    [],
  );

  return useCallback((node: HTMLElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;

    if (!node) {
      return;
    }

    const touchStartRef: { current: TouchStartState | null } = { current: null };

    const onTouchStart = (event: TouchEvent) => {
      if (!enabledRef.current) {
        touchStartRef.current = null;
        return;
      }

      const touch = event.touches[0];
      if (!touch || event.touches.length > 1) {
        touchStartRef.current = null;
        return;
      }

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        locked: null,
        blocked: isSwipeBlocked(event.target),
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      const start = touchStartRef.current;
      const touch = event.touches[0];
      if (!start || !touch || start.blocked) {
        return;
      }

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;

      if (!start.locked) {
        if (Math.abs(deltaX) < POPUP_SWIPE_LOCK_PX && Math.abs(deltaY) < POPUP_SWIPE_LOCK_PX) {
          return;
        }

        start.locked =
          Math.abs(deltaX) > Math.abs(deltaY) * POPUP_SWIPE_HORIZONTAL_RATIO
            ? "horizontal"
            : "vertical";
      }

      if (start.locked === "vertical") {
        start.blocked = true;
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }
    };

    const finishGesture = (event: TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;

      if (!enabledRef.current || !start || start.blocked || start.locked === "vertical") {
        return;
      }

      if (isTextEntryActive()) {
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;

      if (
        Math.abs(deltaX) < POPUP_SWIPE_MIN_DISTANCE_PX ||
        Math.abs(deltaX) < Math.abs(deltaY) * POPUP_SWIPE_HORIZONTAL_RATIO
      ) {
        return;
      }

      if (deltaX > 0) {
        if (hasPreviousRef.current) {
          onPreviousRef.current?.();
        }
        return;
      }

      if (hasNextRef.current) {
        onNextRef.current?.();
      }
    };

    const onTouchCancel = () => {
      touchStartRef.current = null;
    };

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", finishGesture);
    node.addEventListener("touchcancel", onTouchCancel);

    cleanupRef.current = () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", finishGesture);
      node.removeEventListener("touchcancel", onTouchCancel);
    };
  }, []);
}
