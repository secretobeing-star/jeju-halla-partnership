"use client";

import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PopupNavChevron from "@/components/PopupNavChevron";
import TabletSplitDetailPane from "@/components/TabletSplitDetailPane";
import TabletSplitLayout from "@/components/TabletSplitLayout";
import { useAppBackHandler } from "@/lib/app-back-stack";
import { useDialogFocusTrap } from "@/lib/use-dialog-focus-trap";
import { usePopupSwipeNavigation } from "@/lib/use-popup-swipe-navigation";
import { isTextEntryActive } from "@/lib/text-entry";

export type BoardPostModalSplitPane = {
  master: ReactNode;
  detail: ReactNode;
  detailSelected: boolean;
  emptyTitle: string;
  emptyMessage?: string;
  onDetailClose: () => void;
  detailAriaLabel?: string;
};

type BoardPostModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel?: string;
  wide?: boolean;
  wideMaxWidthRem?: number;
  tabletSplit?: boolean;
  splitPane?: BoardPostModalSplitPane;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  navigationSummary?: string | null;
  backHandlerId?: string;
  dialogClassName?: string;
};

export default function BoardPostModal({
  open,
  onClose,
  children,
  ariaLabel = "게시글",
  wide = false,
  wideMaxWidthRem,
  tabletSplit = false,
  splitPane,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  navigationSummary = null,
  backHandlerId = "board-post-modal",
  dialogClassName = "",
}: BoardPostModalProps) {
  const [mounted, setMounted] = useState(false);
  const overlayRef = useDialogFocusTrap(open, undefined, { autoFocus: false });
  const useSplitLayout = Boolean(tabletSplit && splitPane);

  useEffect(() => {
    setMounted(true);
  }, []);
  const swipeEnabled = Boolean((hasPrevious && onPrevious) || (hasNext && onNext));
  // 분할(폴드/태블릿)은 상세 패널에 스와이프를 붙이고, 단일 모달만 다이얼로그에 붙인다.
  const swipeTargetRef = usePopupSwipeNavigation({
    onPrevious,
    onNext,
    hasPrevious,
    hasNext,
    enabled: swipeEnabled && !useSplitLayout,
  });

  useAppBackHandler(open, onClose, backHandlerId);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    // Modal is rendered inside `.site-page-shell`, so do NOT set inert on the shell
    // (that would block the dialog itself — board/partner post selection).
    document.body.classList.add("board-post-popup-open");

    return () => {
      document.body.classList.remove("board-post-popup-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (event.isComposing || isTextEntryActive()) {
          return;
        }
        onClose();
        return;
      }

      if (event.key === "ArrowLeft" && hasPrevious && onPrevious) {
        event.preventDefault();
        onPrevious();
        return;
      }

      if (event.key === "ArrowRight" && hasNext && onNext) {
        event.preventDefault();
        onNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, hasPrevious, hasNext, onPrevious, onNext]);

  if (!open || !mounted || typeof document === "undefined") {
    return null;
  }

  const dialogStyle: CSSProperties | undefined =
    wide && wideMaxWidthRem
      ? ({ ["--board-post-popup-wide-width" as string]: `${wideMaxWidthRem}rem` } as CSSProperties)
      : undefined;

  const dialogBody = useSplitLayout && splitPane ? (
    <TabletSplitLayout
      className="board-post-popup-split"
      master={splitPane.master}
      detail={
        <TabletSplitDetailPane
          ariaLabel={splitPane.detailAriaLabel ?? ariaLabel}
          emptyTitle={splitPane.emptyTitle}
          emptyMessage={splitPane.emptyMessage}
          selected={splitPane.detailSelected}
          onClose={splitPane.onDetailClose}
          onPrevious={onPrevious}
          onNext={onNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          navigationSummary={navigationSummary}
          backHandlerId={backHandlerId}
        >
          {splitPane.detail}
        </TabletSplitDetailPane>
      }
    />
  ) : (
    children
  );

  return createPortal(
    <div ref={overlayRef} className="board-post-popup-overlay" role="presentation">
      <div className="board-post-popup-nav-slot board-post-popup-nav-slot--prev">
        {hasPrevious && onPrevious ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPrevious();
            }}
            className="board-post-popup-nav board-post-popup-nav--prev"
            aria-label="이전"
          >
            <PopupNavChevron direction="prev" />
          </button>
        ) : (
          <span className="board-post-popup-nav-spacer" aria-hidden />
        )}
      </div>

      <div
        ref={swipeTargetRef}
        className={[
          "board-post-popup-dialog",
          wide ? "board-post-popup-dialog--wide" : "",
          useSplitLayout ? "board-post-popup-dialog--tablet-split" : "",
          swipeEnabled && !useSplitLayout ? "board-post-popup-dialog--swipeable" : "",
          dialogClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        style={dialogStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="board-post-popup-header">
          {navigationSummary ? (
            <p
              className={
                useSplitLayout
                  ? "board-post-popup-header__summary"
                  : "board-post-popup-nav-summary board-post-popup-header__summary"
              }
            >
              {navigationSummary}
            </p>
          ) : (
            <span className="board-post-popup-header__spacer" aria-hidden />
          )}
          <button
            type="button"
            onClick={onClose}
            className="board-post-popup-close"
            aria-label="닫기"
          >
            ×
          </button>
        </header>
        <div className="board-post-popup-body">{dialogBody}</div>
      </div>

      <div className="board-post-popup-nav-slot board-post-popup-nav-slot--next">
        {hasNext && onNext ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNext();
            }}
            className="board-post-popup-nav board-post-popup-nav--next"
            aria-label="다음"
          >
            <PopupNavChevron direction="next" />
          </button>
        ) : (
          <span className="board-post-popup-nav-spacer" aria-hidden />
        )}
      </div>
    </div>,
    document.body,
  );
}
