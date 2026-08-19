"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const EDGE_ZONE_PX = 72;
const OPEN_THRESHOLD_PX = 88;
const MAX_DRAG_PX = 220;
/** 스와이프 속도 +120% (기존 대비 2.2배) */
const SWIPE_SPEED_MULTIPLIER = 2.2;

type StudentSamsungPaySwipeProps = {
  enabled: boolean;
  cardOpen: boolean;
  onOpen: () => void;
};

/**
 * 삼성페이 스타일: PWA 하단 핸들을 위로 끌어 학생증을 엽니다.
 */
export default function StudentSamsungPaySwipe({
  enabled,
  cardOpen,
  onOpen,
}: StudentSamsungPaySwipeProps) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const armedRef = useRef(false);
  const dragYRef = useRef(0);

  const reset = useCallback(() => {
    armedRef.current = false;
    startRef.current = null;
    dragYRef.current = 0;
    setDragY(0);
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!enabled || cardOpen || typeof window === "undefined") {
      reset();
      return;
    }

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        reset();
        return;
      }
      if (
        document.body.classList.contains("pwa-loading-splash-open") ||
        document.body.classList.contains("delete-account-confirm-open") ||
        document.querySelector(".site-pwa-loading-splash")
      ) {
        reset();
        return;
      }
      const touch = event.touches[0];
      const fromBottom = window.innerHeight - touch.clientY <= EDGE_ZONE_PX;
      if (!fromBottom) {
        reset();
        return;
      }
      armedRef.current = true;
      startRef.current = { x: touch.clientX, y: touch.clientY };
      setDragging(true);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!armedRef.current || !startRef.current) {
        return;
      }
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      const rawDeltaY = startRef.current.y - touch.clientY; // up = positive
      const deltaY = rawDeltaY * SWIPE_SPEED_MULTIPLIER;
      const deltaX = touch.clientX - startRef.current.x;
      if (Math.abs(deltaX) > Math.abs(rawDeltaY) * 1.1 && Math.abs(deltaX) > 24) {
        reset();
        return;
      }
      const next = Math.max(0, Math.min(MAX_DRAG_PX, deltaY));
      dragYRef.current = next;
      setDragY(next);
      if (next > 12) {
        event.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (!armedRef.current) {
        return;
      }
      const shouldOpen = dragYRef.current >= OPEN_THRESHOLD_PX;
      reset();
      if (shouldOpen) {
        onOpen();
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", reset, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", reset);
    };
  }, [cardOpen, enabled, onOpen, reset]);

  if (!enabled || cardOpen) {
    return null;
  }

  const progress = Math.min(1, dragY / OPEN_THRESHOLD_PX);
  const peekTranslate = Math.max(0, 100 - progress * 100);

  return (
    <div
      className={[
        "student-pay-swipe",
        dragging ? "student-pay-swipe--dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      <div
        className="student-pay-swipe__peek"
        style={{
          transform: `translate3d(-50%, ${peekTranslate}%, 0)`,
          opacity: 0.35 + progress * 0.65,
        }}
      >
        <div className="student-pay-swipe__peek-card">
          <div className="student-pay-swipe__peek-photo" />
          <div className="student-pay-swipe__peek-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      <div className="student-pay-swipe__handle" style={{ transform: `translate3d(0, ${-dragY * 0.15}px, 0)` }}>
        <div className="student-pay-swipe__grip" aria-hidden />
      </div>
    </div>
  );
}
