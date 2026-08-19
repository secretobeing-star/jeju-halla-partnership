"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAppBackHandler } from "@/lib/app-back-stack";

type DeleteAccountConfirmDialogProps = {
  open: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteAccountConfirmDialog({
  open,
  busy = false,
  onCancel,
  onConfirm,
}: DeleteAccountConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useAppBackHandler(open, onCancel, "delete-account-confirm");

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }
    document.body.classList.add("delete-account-confirm-open");
    return () => {
      document.body.classList.remove("delete-account-confirm-open");
    };
  }, [open]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      className="delete-account-confirm-overlay"
      role="presentation"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <div
        className="delete-account-confirm-overlay__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="delete-account-confirm-title" className="text-lg font-semibold text-gray-900 mb-2">
          회원 탈퇴
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없으며 모든 데이터가 삭제됩니다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "탈퇴 중..." : "탈퇴하기"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
