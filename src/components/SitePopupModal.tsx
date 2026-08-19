"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  dismissSitePopupForToday,
  isSitePopupDismissedToday,
} from "@/lib/site-popup-dismiss";
import { dispatchSitePopupVisibility } from "@/lib/site-popup-visibility";
import { useAppBackHandler } from "@/lib/app-back-stack";
import { SitePopup } from "@/lib/supabase";

type SitePopupModalProps = {
  popups: SitePopup[];
};

export default function SitePopupModal({ popups }: SitePopupModalProps) {
  const [closedIds, setClosedIds] = useState<string[]>([]);

  const visiblePopup = useMemo(() => {
    return popups.find((popup) => {
      if (!popup.is_active || !popup.image_url?.trim()) {
        return false;
      }

      if (closedIds.includes(popup.id)) {
        return false;
      }

      return !isSitePopupDismissedToday(popup.id);
    });
  }, [popups, closedIds]);

  const isOpen = Boolean(visiblePopup?.image_url);

  const closePopup = useCallback(() => {
    if (!visiblePopup) {
      return;
    }

    setClosedIds((prev) => [...prev, visiblePopup.id]);
  }, [visiblePopup]);

  useAppBackHandler(
    isOpen,
    closePopup,
    visiblePopup ? `site-popup-${visiblePopup.id}` : "site-popup-closed",
  );

  useEffect(() => {
    dispatchSitePopupVisibility(Boolean(visiblePopup));
  }, [visiblePopup]);

  useEffect(() => {
    if (!visiblePopup) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.classList.add("site-popup-open");
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.classList.remove("site-popup-open");
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [visiblePopup]);

  if (!visiblePopup?.image_url) {
    return null;
  }

  function dismissForToday() {
    dismissSitePopupForToday(visiblePopup!.id);
    closePopup();
  }

  const image = (
    <img
      src={visiblePopup.image_url}
      alt={visiblePopup.title?.trim() || "팝업 안내"}
      className="site-popup-image"
    />
  );

  return (
    <div className="site-popup-overlay" role="presentation" onClick={closePopup}>
      <div
        className="site-popup-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={visiblePopup.title?.trim() || "팝업 안내"}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={closePopup}
          className="site-popup-close"
          aria-label="팝업 닫기"
        >
          ×
        </button>

        {visiblePopup.link_url?.trim() ? (
          <a
            href={visiblePopup.link_url.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="site-popup-image-link"
          >
            {image}
          </a>
        ) : (
          image
        )}

        <div className="site-popup-footer">
          <button
            type="button"
            onClick={dismissForToday}
            className="site-popup-dismiss"
          >
            오늘 하루 보지 않기
          </button>
          <button type="button" onClick={closePopup} className="site-popup-close-text">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
