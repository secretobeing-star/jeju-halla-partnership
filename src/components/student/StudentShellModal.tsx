"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAppBackHandler } from "@/lib/app-back-stack";
import { useDialogFocusTrap } from "@/lib/use-dialog-focus-trap";

type StudentShellModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  backHandlerId: string;
  children: ReactNode;
  footer?: ReactNode;
  dialogClassName?: string;
};

export default function StudentShellModal({
  open,
  onClose,
  title,
  backHandlerId,
  children,
  footer,
  dialogClassName = "",
}: StudentShellModalProps) {
  const [mounted, setMounted] = useState(false);
  const overlayRef = useDialogFocusTrap(open, ".student-shell-modal__close");

  useAppBackHandler(open, onClose, backHandlerId);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.classList.add("student-id-modal-open");
    document.body.style.overflow = "hidden";

    return () => {
      document.body.classList.remove("student-id-modal-open");
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="student-shell-modal"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={["student-shell-modal__dialog", dialogClassName].filter(Boolean).join(" ")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="student-shell-modal__header">
          <h2 className="student-shell-modal__title">{title}</h2>
          <button
            type="button"
            className="student-shell-modal__close"
            aria-label="닫기"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="student-shell-modal__body">{children}</div>
        {footer ? <div className="student-shell-modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
