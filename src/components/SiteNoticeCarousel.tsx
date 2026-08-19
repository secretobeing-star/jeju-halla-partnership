"use client";

import { useEffect, useState } from "react";
import {
  resolveSiteNoticeItemBadgeLabel,
  type SiteNoticeItem,
} from "@/lib/site-notices";

type SiteNoticeCarouselProps = {
  items: SiteNoticeItem[];
  defaultBadgeLabel?: string | null;
  textColor?: string | null;
  autoEnabled?: boolean;
  autoIntervalSeconds?: number;
};

export default function SiteNoticeCarousel({
  items,
  defaultBadgeLabel,
  textColor,
  autoEnabled = false,
  autoIntervalSeconds = 5,
}: SiteNoticeCarouselProps) {
  const [index, setIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [timerSeed, setTimerSeed] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [items]);

  useEffect(() => {
    if (index >= items.length) {
      setIndex(Math.max(0, items.length - 1));
    }
  }, [index, items.length]);

  const total = items.length;
  const showNavigation = total > 1;
  const isAutoPlaying = autoEnabled && showNavigation && !hoverPaused;

  useEffect(() => {
    if (!isAutoPlaying) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % total);
    }, autoIntervalSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [isAutoPlaying, autoIntervalSeconds, total, timerSeed]);

  if (items.length === 0) {
    return null;
  }

  const current = items[index] ?? items[0];
  const badgeLabel = resolveSiteNoticeItemBadgeLabel(current, defaultBadgeLabel);

  function goPrev() {
    setIndex((prev) => (prev - 1 + total) % total);
    setTimerSeed((prev) => prev + 1);
  }

  function goNext() {
    setIndex((prev) => (prev + 1) % total);
    setTimerSeed((prev) => prev + 1);
  }

  const content = (
    <span
      className="block truncate text-sm font-semibold text-gray-900 sm:text-base"
      style={textColor?.trim() ? { color: textColor.trim() } : undefined}
    >
      {current.text}
    </span>
  );

  return (
    <section
      className="site-notice-carousel mb-6 rounded-lg border border-gray-100 bg-slate-50/90 px-3 py-2.5 sm:px-4 sm:py-3"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="max-w-[5.5rem] shrink-0 truncate rounded-full bg-orange-500 px-2.5 py-0.5 text-center text-[10px] font-bold tracking-wide text-white sm:max-w-none sm:px-3 sm:text-[11px]">
          {badgeLabel}
        </span>

        <div className="min-w-0 flex-1">
          {current.link_url ? (
            <a
              href={current.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block transition hover:opacity-90"
            >
              {content}
            </a>
          ) : (
            content
          )}
        </div>

        {showNavigation ? (
          <div className="flex shrink-0 items-center gap-1 text-xs text-gray-500 sm:text-sm">
            <button
              type="button"
              onClick={goPrev}
              className="rounded px-1 py-0.5 transition hover:bg-gray-200/80 hover:text-gray-700"
              aria-label="이전 공지"
            >
              &lt;
            </button>
            <span className="min-w-[2.75rem] text-center tabular-nums">
              {index + 1}/{total}
            </span>
            <button
              type="button"
              onClick={goNext}
              className="rounded px-1 py-0.5 transition hover:bg-gray-200/80 hover:text-gray-700"
              aria-label="다음 공지"
            >
              &gt;
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
