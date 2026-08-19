"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type SiteToastProps = {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
};

export default function SiteToast({ message, onDismiss, durationMs = 2200 }: SiteToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (!mounted || !message) {
    return null;
  }

  return createPortal(
    <div
      className="site-toast pointer-events-none fixed inset-x-0 bottom-6 z-[280] flex justify-center px-4"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="site-toast__message max-w-sm rounded-full bg-gray-900/95 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg ring-1 ring-white/10">
        {message}
      </p>
    </div>,
    document.body,
  );
}
