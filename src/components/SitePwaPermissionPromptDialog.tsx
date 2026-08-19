"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useAppBackHandler } from "@/lib/app-back-stack";
import { formatPwaPermissionMessage } from "@/lib/site-pwa-permission-message-format";

type SitePwaPermissionPromptDialogProps = {
  open: boolean;
  title: string;
  message?: string | null;
  primaryLabel: string;
  secondaryLabel?: string;
  busy?: boolean;
  onPrimary: () => void;
  onSecondary?: () => void;
};

export default function SitePwaPermissionPromptDialog({
  open,
  title,
  message,
  primaryLabel,
  secondaryLabel = "닫기",
  busy = false,
  onPrimary,
  onSecondary,
}: SitePwaPermissionPromptDialogProps) {
  const titleId = useId();
  const formattedMessage = formatPwaPermissionMessage(message);

  useAppBackHandler(open, () => onSecondary?.(), "site-pwa-permission-prompt");

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.classList.add("site-pwa-permission-prompt-open");
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.classList.remove("site-pwa-permission-prompt-open");
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="site-pwa-permission-prompt" role="presentation">
      <div
        className="site-pwa-permission-prompt__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <p id={titleId} className="site-pwa-permission-prompt__title">
          {title}
        </p>
        {formattedMessage ? (
          <p className="site-pwa-permission-prompt__desc">{formattedMessage}</p>
        ) : null}
        <div className="site-pwa-permission-prompt__actions">
          {onSecondary ? (
            <button
              type="button"
              className="site-pwa-permission-prompt__secondary"
              onClick={onSecondary}
              disabled={busy}
            >
              {secondaryLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="site-pwa-permission-prompt__primary"
            onClick={onPrimary}
            disabled={busy}
          >
            {busy ? "처리 중..." : primaryLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
