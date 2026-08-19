"use client";

import { ReactNode } from "react";
import PopupNavChevron from "@/components/PopupNavChevron";
import { useAppBackHandler } from "@/lib/app-back-stack";
import { usePopupSwipeNavigation } from "@/lib/use-popup-swipe-navigation";

type TabletSplitDetailPaneProps = {
  ariaLabel: string;
  emptyTitle: string;
  emptyMessage?: string;
  selected: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  navigationSummary?: string | null;
  backHandlerId?: string;
  children?: ReactNode;
};

export default function TabletSplitDetailPane({
  ariaLabel,
  emptyTitle,
  emptyMessage = "왼쪽 목록에서 항목을 선택해 주세요.",
  selected,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  navigationSummary = null,
  backHandlerId = "tablet-split-detail-pane",
  children,
}: TabletSplitDetailPaneProps) {
  useAppBackHandler(selected, onClose, backHandlerId);

  const swipeEnabled = Boolean(
    selected && ((hasPrevious && onPrevious) || (hasNext && onNext)),
  );
  const swipeTargetRef = usePopupSwipeNavigation({
    onPrevious,
    onNext,
    hasPrevious,
    hasNext,
    enabled: swipeEnabled,
  });

  return (
    <aside
      ref={swipeTargetRef}
      className={[
        "tablet-split-detail-pane",
        swipeEnabled ? "tablet-split-detail-pane--swipeable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role={selected ? "dialog" : "complementary"}
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <div className="tablet-split-detail-pane__toolbar">
        <div className="tablet-split-detail-pane__nav">
          {hasPrevious && onPrevious ? (
            <button
              type="button"
              onClick={onPrevious}
              className="tablet-split-detail-pane__nav-btn"
              aria-label="이전"
            >
              <PopupNavChevron direction="prev" />
            </button>
          ) : (
            <span className="tablet-split-detail-pane__nav-spacer" aria-hidden />
          )}
          {navigationSummary ? (
            <p className="tablet-split-detail-pane__summary">{navigationSummary}</p>
          ) : (
            <span className="tablet-split-detail-pane__nav-spacer" aria-hidden />
          )}
          {hasNext && onNext ? (
            <button
              type="button"
              onClick={onNext}
              className="tablet-split-detail-pane__nav-btn"
              aria-label="다음"
            >
              <PopupNavChevron direction="next" />
            </button>
          ) : (
            <span className="tablet-split-detail-pane__nav-spacer" aria-hidden />
          )}
        </div>
        {selected ? (
          <button
            type="button"
            onClick={onClose}
            className="tablet-split-detail-pane__close"
            aria-label="닫기"
          >
            ×
          </button>
        ) : null}
      </div>

      {selected && children ? (
        <div className="tablet-split-detail-pane__body modal-slim-scroll">{children}</div>
      ) : (
        <div className="tablet-split-detail-pane__empty" aria-hidden={selected && Boolean(children)}>
          <p className="tablet-split-detail-pane__empty-title">{emptyTitle}</p>
          <p className="tablet-split-detail-pane__empty-message">{emptyMessage}</p>
        </div>
      )}
    </aside>
  );
}
