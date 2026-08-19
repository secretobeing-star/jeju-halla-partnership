"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

type PartnerBusinessInfoProps = {
  text: string;
  defaultExpanded?: boolean;
  className?: string;
};

function needsToggleButton(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.setAttribute("aria-hidden", "true");
  clone.style.position = "absolute";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  clone.style.width = `${element.clientWidth}px`;
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.zIndex = "-1";
  clone.classList.remove("line-clamp-2");

  const parent = element.parentElement;
  if (!parent) {
    return false;
  }

  parent.appendChild(clone);
  const fullHeight = clone.getBoundingClientRect().height;

  clone.classList.add("line-clamp-2");
  void clone.offsetHeight;
  const clampedHeight = clone.getBoundingClientRect().height;

  parent.removeChild(clone);

  return fullHeight > clampedHeight + 1;
}

export default function PartnerBusinessInfo({
  text,
  defaultExpanded = false,
  className = "",
}: PartnerBusinessInfoProps) {
  const contentId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [canToggle, setCanToggle] = useState(false);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded, text]);

  useLayoutEffect(() => {
    const element = textRef.current;
    const container = containerRef.current;
    if (!element || !container) {
      return;
    }

    const checkOverflow = () => {
      if (element.clientWidth === 0) {
        return;
      }
      setCanToggle(needsToggleButton(element));
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(container);

    if (document.fonts?.ready) {
      void document.fonts.ready.then(checkOverflow);
    }

    return () => observer.disconnect();
  }, [text]);

  return (
    <p className={`flex items-start gap-1.5 text-xs leading-relaxed text-gray-600 sm:text-sm ${className}`}>
      <span aria-hidden className="mt-0.5 shrink-0 text-sm leading-none">
        🕒
      </span>
      <span ref={containerRef} className="relative min-w-0 flex-1">
        <span
          ref={textRef}
          id={contentId}
          className={`block whitespace-pre-line ${expanded ? "" : "line-clamp-2"}`}
        >
          {text}
        </span>
        {canToggle ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="mt-0.5 text-xs font-medium text-emerald-600 hover:text-emerald-700"
            aria-expanded={expanded}
            aria-controls={contentId}
          >
            {expanded ? "접기" : "펼치기"}
          </button>
        ) : null}
      </span>
    </p>
  );
}
