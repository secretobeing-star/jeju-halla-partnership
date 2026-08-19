"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppBackHandler } from "@/lib/app-back-stack";
import { useDialogFocusTrap } from "@/lib/use-dialog-focus-trap";
import type { SiteMemberLoginDisplay } from "@/lib/site-member-settings";

type SiteLoginModalProps = {
  open: boolean;
  onClose: () => void;
  loginDisplay: SiteMemberLoginDisplay;
  loggedInName?: string | null;
  onLoginPreview?: (name: string) => Promise<void>;
  onStudentIdLogin?: (studentId: string) => Promise<void>;
  onLogout?: () => void;
  loading?: boolean;
  statusMessage?: string | null;
  showStudentAuth?: boolean;
  studentAuthButtonLabel?: string;
  onStartStudentAuth?: () => void;
  studentIdLabel?: string;
  /** 학번 로그인 모드 (학생증 기능 ON) */
  studentIdLoginEnabled?: boolean;
};

export default function SiteLoginModal({
  open,
  onClose,
  loginDisplay,
  loggedInName = null,
  onLoginPreview,
  onStudentIdLogin,
  onLogout,
  loading = false,
  statusMessage = null,
  showStudentAuth = false,
  studentAuthButtonLabel = "제주한라대 인증하기",
  onStartStudentAuth,
  studentIdLabel = "학번",
  studentIdLoginEnabled = false,
}: SiteLoginModalProps) {
  const [mounted, setMounted] = useState(false);
  const overlayRef = useDialogFocusTrap(open, ".site-login-modal__close");
  const previewNameRef = useRef<HTMLInputElement>(null);
  const studentIdRef = useRef<HTMLInputElement>(null);

  useAppBackHandler(open, onClose, "site-login-modal");

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

    const shells = Array.from(document.querySelectorAll(".site-page-shell"));
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.classList.add("site-login-open");
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    for (const shell of shells) {
      shell.setAttribute("inert", "");
    }

    return () => {
      document.body.classList.remove("site-login-open");
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;

      for (const shell of shells) {
        shell.removeAttribute("inert");
      }
    };
  }, [open]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="site-login-modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-login-modal-title"
        className="site-login-modal__dialog w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="site-login-modal-title" className="text-lg font-bold text-gray-900">
            {loginDisplay.modalTitle}
          </h2>
          <button
            type="button"
            className="site-login-modal__close rounded-md px-2 py-1 text-xl leading-none text-gray-500 hover:bg-gray-100"
            aria-label="닫기"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {loggedInName ? (
          <div className="mt-5 space-y-4">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <span className="font-semibold">{loggedInName}</span>님으로 로그인되어 있습니다.
            </p>
            {showStudentAuth && onStartStudentAuth ? (
              <button
                type="button"
                disabled={loading}
                onClick={onStartStudentAuth}
                className="w-full rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
              >
                {studentAuthButtonLabel}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onLogout}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <>
            {loginDisplay.noticeLine1 || loginDisplay.noticeLine2 ? (
              <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3.5 text-sm leading-relaxed text-gray-700">
                <ul className="list-disc space-y-2 pl-5">
                  {loginDisplay.noticeLine1 ? <li>{loginDisplay.noticeLine1}</li> : null}
                  {loginDisplay.noticeLine2 ? <li>{loginDisplay.noticeLine2}</li> : null}
                </ul>
              </div>
            ) : null}

            {statusMessage ? (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-900">
                {statusMessage}
              </p>
            ) : null}

            {studentIdLoginEnabled && onStudentIdLogin ? (
              <form
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const studentId = studentIdRef.current?.value.trim() ?? "";
                  if (studentId) {
                    void onStudentIdLogin(studentId);
                  }
                }}
              >
                <label className="block text-sm font-medium text-gray-700">
                  {studentIdLabel}
                  <input
                    ref={studentIdRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="username"
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {loading ? "처리 중..." : loginDisplay.providerLabel}
                </button>
              </form>
            ) : null}

            {!studentIdLoginEnabled && loginDisplay.previewEnabled ? (
              <form
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = previewNameRef.current?.value.trim() ?? "";
                  if (name && onLoginPreview) {
                    void onLoginPreview(name);
                  }
                }}
              >
                <label className="block text-sm font-medium text-gray-700">
                  미리보기 이름
                  <input
                    ref={previewNameRef}
                    type="text"
                    maxLength={30}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {loading ? "처리 중..." : "미리보기 로그인"}
                </button>
              </form>
            ) : null}

            {!studentIdLoginEnabled ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => void onLoginPreview?.("")}
                className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loginDisplay.providerLabel}
              </button>
            ) : null}

            {showStudentAuth && onStartStudentAuth ? (
              <button
                type="button"
                disabled={loading}
                onClick={onStartStudentAuth}
                className="mt-3 w-full rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
              >
                {studentAuthButtonLabel}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
