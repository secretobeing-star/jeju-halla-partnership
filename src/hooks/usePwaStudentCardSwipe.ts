"use client";

import { useEffect, useRef } from "react";

const EDGE_ZONE_PX = 56;
const MIN_DISTANCE_PX = 64;

type UsePwaStudentCardSwipeOptions = {
  enabled: boolean;
  onSwipe: () => void;
};

/**
 * PWA standalone 전용: 화면 하단 가장자리에서 위/아래 스와이프 시 콜백.
 * 일반 브라우저에서는 enabled=false 로 두어 스크롤과 충돌하지 않음.
 */
export function usePwaStudentCardSwipe({ enabled, onSwipe }: UsePwaStudentCardSwipeOptions) {
  const onSwipeRef = useRef(onSwipe);

  useEffect(() => {
    onSwipeRef.current = onSwipe;
  }, [onSwipe]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    let startY: number | null = null;
    let startX: number | null = null;
    let armed = false;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        armed = false;
        return;
      }
      const touch = event.touches[0];
      const fromBottom = window.innerHeight - touch.clientY <= EDGE_ZONE_PX;
      if (!fromBottom) {
        armed = false;
        startY = null;
        startX = null;
        return;
      }
      armed = true;
      startY = touch.clientY;
      startX = touch.clientX;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!armed || startY == null || startX == null) {
        return;
      }
      const touch = event.changedTouches[0];
      if (!touch) {
        armed = false;
        return;
      }

      const deltaY = touch.clientY - startY;
      const deltaX = touch.clientX - startX;
      armed = false;
      startY = null;
      startX = null;

      if (Math.abs(deltaY) < MIN_DISTANCE_PX || Math.abs(deltaY) < Math.abs(deltaX) * 1.2) {
        return;
      }

      // 위로 스와이프(음수) 또는 아래로 스와이프(양수) 모두 허용
      onSwipeRef.current();
    };

    const onTouchCancel = () => {
      armed = false;
      startY = null;
      startX = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [enabled]);
}
