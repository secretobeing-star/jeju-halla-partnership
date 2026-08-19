"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { scrollToSection } from "@/lib/scroll-to-section";

type ScrollToTopButtonProps = {
  targetId?: string;
  showAfterPx?: number;
};

function getScrollTop() {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

export default function ScrollToTopButton({
  targetId = "site-header",
  showAfterPx = 400,
}: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleScroll() {
      setVisible(getScrollTop() > showAfterPx);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll);
    };
  }, [showAfterPx]);

  function handleClick() {
    scrollToSection(targetId, 0);
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <button
      type="button"
      onClick={handleClick}
      aria-label="맨 위로"
      title="맨 위로"
      className={`scroll-to-top-button fixed z-50 flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-md transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>,
    document.body,
  );
}
