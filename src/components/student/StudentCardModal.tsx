"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppBackHandler } from "@/lib/app-back-stack";
import { getStorageErrorMessage, uploadPartnershipImage } from "@/lib/storage";
import { useDialogFocusTrap } from "@/lib/use-dialog-focus-trap";
import type { SiteMemberStudentProfile } from "@/lib/site-member-session";
import type { SiteStudentUiLabels } from "@/lib/site-student-auth-settings";
import {
  grantCardFrameUnlock,
  syncCardFrameUserStateFromRemote,
  type CardFrameUserState,
  type PublicCardFrameItem,
} from "@/lib/student-card-frames";

const DISMISS_THRESHOLD_PX = 110;
/** 스와이프 속도 +120% (기존 대비 2.2배) */
const SWIPE_SPEED_MULTIPLIER = 2.2;
const OPACITY_STORAGE_KEY = "student-card-opacity";
const DEFAULT_CARD_OPACITY = 0.92;

export type StudentCardBrandDisplay = {
  schoolLogoUrl: string | null;
  schoolName: string;
  centerImageUrl: string | null;
  centerImageOpacity: number;
  backgroundUrl: string | null;
  backgroundOpacity: number;
};

type StudentCardModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  student: SiteMemberStudentProfile;
  labels: SiteStudentUiLabels;
  brand?: StudentCardBrandDisplay;
  cardFrames?: PublicCardFrameItem[];
  onPhotoChange?: (photoUrl: string) => void | Promise<void>;
};

const DEFAULT_BRAND: StudentCardBrandDisplay = {
  schoolLogoUrl: null,
  schoolName: "",
  centerImageUrl: null,
  centerImageOpacity: 0.28,
  backgroundUrl: null,
  backgroundOpacity: 0.45,
};

export default function StudentCardModal({
  open,
  onClose,
  title,
  student,
  labels,
  brand = DEFAULT_BRAND,
  cardFrames = [],
  onPhotoChange,
}: StudentCardModalProps) {
  const [mounted, setMounted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [opacity, setOpacity] = useState(DEFAULT_CARD_OPACITY);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [frameState, setFrameState] = useState<CardFrameUserState>({
    unlockedIds: [],
    activeFrameId: null,
    sources: {},
  });
  const [frameCode, setFrameCode] = useState("");
  const [frameUnlockBusy, setFrameUnlockBusy] = useState(false);
  const [frameMessage, setFrameMessage] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ y: number; offset: number } | null>(null);
  const overlayRef = useDialogFocusTrap(open, ".student-card-modal__close");

  useAppBackHandler(open, onClose, "student-card-modal");

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(OPACITY_STORAGE_KEY);
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed) && parsed >= 0.4 && parsed <= 1) {
        setOpacity(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setSettingsOpen(false);
      setPhotoError(null);
      setFrameCode("");
      setFrameMessage(null);
      setDragOffset(0);
      setDragging(false);
      dragStartRef.current = null;
      return;
    }

    if (student.studentId) {
      void syncCardFrameUserStateFromRemote(student.studentId, cardFrames).then(
        setFrameState,
      );
    }

    const previousOverflow = document.body.style.overflow;
    document.body.classList.add("student-id-modal-open");
    document.body.style.overflow = "hidden";

    return () => {
      document.body.classList.remove("student-id-modal-open");
      document.body.style.overflow = previousOverflow;
    };
  }, [open, student.studentId, cardFrames]);

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

  function onSheetTouchStart(event: React.TouchEvent) {
    if (settingsOpen || event.touches.length !== 1) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, button, a, label")) {
      return;
    }
    dragStartRef.current = { y: event.touches[0].clientY, offset: dragOffset };
    setDragging(true);
  }

  function onSheetTouchMove(event: React.TouchEvent) {
    if (!dragStartRef.current || event.touches.length !== 1) {
      return;
    }
    const delta =
      (event.touches[0].clientY - dragStartRef.current.y) * SWIPE_SPEED_MULTIPLIER;
    const next = Math.max(0, dragStartRef.current.offset + delta);
    setDragOffset(next);
  }

  function onSheetTouchEnd() {
    if (!dragStartRef.current) {
      return;
    }
    const shouldClose = dragOffset >= DISMISS_THRESHOLD_PX;
    dragStartRef.current = null;
    setDragging(false);
    if (shouldClose) {
      setDragOffset(0);
      onClose();
      return;
    }
    setDragOffset(0);
  }

  async function handlePhotoFile(file: File | null) {
    if (!file || !onPhotoChange) {
      return;
    }

    setUploading(true);
    setPhotoError(null);
    try {
      const url = await uploadPartnershipImage(file, "student-photos");
      await onPhotoChange(url);
    } catch (error) {
      setPhotoError(getStorageErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  async function handleUnlockFrameCode() {
    const code = frameCode.trim();
    if (!code || !student.studentId) {
      return;
    }

    setFrameUnlockBusy(true);
    setFrameMessage(null);
    try {
      const response = await fetch("/api/student/frames/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, studentId: student.studentId }),
      });
      const payload = (await response.json()) as {
        error?: string;
        frame?: PublicCardFrameItem;
      };
      if (!response.ok || !payload.frame) {
        throw new Error(payload.error || "코드 해금에 실패했습니다.");
      }

      setFrameState(
        grantCardFrameUnlock(student.studentId, payload.frame.id, "code", {
          activate: true,
        }),
      );
      // 서버 저장분 반영 (다른 기기 동기화)
      void syncCardFrameUserStateFromRemote(student.studentId, cardFrames).then(
        setFrameState,
      );
      setFrameCode("");
      setFrameMessage(`「${payload.frame.name}」 코스튬이 해금되어 적용되었습니다.`);
      window.dispatchEvent(new Event("site-frame-inventory-refresh"));
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "코드 해금에 실패했습니다.");
    } finally {
      setFrameUnlockBusy(false);
    }
  }

  const activeFrame =
    cardFrames.find((frame) => frame.id === frameState.activeFrameId) ?? null;

  if (!open || !mounted) {
    return null;
  }

  const graduationLabel =
    student.graduationStatus === "graduated" ? labels.graduated : labels.enrolled;
  const dismissProgress = Math.min(1, dragOffset / DISMISS_THRESHOLD_PX);
  const schoolName = brand.schoolName.trim() || labels.cardSchool;
  const centerOpacity = Math.min(1, Math.max(0, brand.centerImageOpacity));
  const backgroundOpacity = Math.min(1, Math.max(0, brand.backgroundOpacity));

  return createPortal(
    <div
      ref={overlayRef}
      className={[
        "student-card-modal",
        "student-card-modal--pay",
        dragging ? "student-card-modal--dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ["--student-card-opacity" as string]: String(opacity),
        ["--student-card-dismiss" as string]: String(dismissProgress),
      }}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={sheetRef}
        className="student-card-modal__sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          transform: `translate3d(0, ${dragOffset}px, 0)`,
          transition: dragging ? "none" : "transform 0.28s ease",
        }}
        onClick={(event) => event.stopPropagation()}
        onTouchStart={onSheetTouchStart}
        onTouchMove={onSheetTouchMove}
        onTouchEnd={onSheetTouchEnd}
        onTouchCancel={onSheetTouchEnd}
      >
        <div className="student-card-modal__pay-handle" aria-hidden>
          <span />
        </div>

        <header className="student-card-modal__header">
          <button
            type="button"
            className="student-card-modal__icon-btn"
            aria-label="학생증 설정"
            onClick={() => setSettingsOpen((value) => !value)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
            </svg>
          </button>
          <h2 className="student-card-modal__title">{title}</h2>
          <button
            type="button"
            className="student-card-modal__close"
            aria-label="닫기"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {settingsOpen ? (
          <div className="student-card-modal__settings">
            <div className="student-card-modal__photo-setting">
              <p className="student-card-modal__photo-label">
                {labels.photo} (3.5×4.5cm)
              </p>
              <div className="student-card-modal__photo-row">
                <div className="student-card-modal__photo-preview">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt="" />
                  ) : (
                    <span>{labels.cardPhotoEmpty}</span>
                  )}
                </div>
                <div className="student-card-modal__photo-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={uploading || !onPhotoChange}
                    onChange={(e) => {
                      void handlePhotoFile(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className="student-card-modal__photo-btn"
                    disabled={uploading || !onPhotoChange}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? labels.uploading : student.photoUrl ? "사진 변경" : "사진 넣기"}
                  </button>
                </div>
              </div>
              {photoError ? (
                <p className="student-card-modal__photo-error">{photoError}</p>
              ) : null}
            </div>

            {cardFrames.some((frame) => !frame.isDefaultUnlocked) ? (
              <div className="student-card-modal__photo-setting">
                <p className="student-card-modal__photo-label">시크릿 코드</p>
                <div className="student-card-modal__frame-unlock">
                  <input
                    type="text"
                    value={frameCode}
                    onChange={(e) => setFrameCode(e.target.value)}
                    placeholder="시크릿 코드 입력"
                    autoComplete="off"
                    disabled={frameUnlockBusy}
                  />
                  <button
                    type="button"
                    className="student-card-modal__photo-btn"
                    disabled={frameUnlockBusy || !frameCode.trim()}
                    onClick={() => {
                      void handleUnlockFrameCode();
                    }}
                  >
                    {frameUnlockBusy ? "확인 중..." : "해금"}
                  </button>
                </div>
                <p className="student-card-modal__frame-hint">
                  코드를 입력하면 학생증 코스튬이 해금되며, 다른 기기에서도 동일하게 보입니다.
                </p>
                {frameMessage ? (
                  <p className="student-card-modal__frame-message">{frameMessage}</p>
                ) : null}
              </div>
            ) : null}

            <label>
              {labels.opacityLabel}
              <input
                type="range"
                min={0.4}
                max={1}
                step={0.02}
                value={opacity}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setOpacity(next);
                  try {
                    localStorage.setItem(OPACITY_STORAGE_KEY, String(next));
                  } catch {
                    // ignore
                  }
                }}
              />
            </label>

            <p className="student-card-modal__frame-hint">
              장착 코스튬은 상단 메뉴 보관함에서 변경할 수 있습니다.
            </p>
          </div>
        ) : null}

        <div className="student-card-modal__body">
          <article
            className={[
              "student-id-card",
              activeFrame ? "student-id-card--framed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              activeFrame?.cssBorder
                ? { border: activeFrame.cssBorder }
                : undefined
            }
          >
            {brand.backgroundUrl ? (
              <img
                className="student-id-card__background"
                src={brand.backgroundUrl}
                alt=""
                aria-hidden
                style={{ opacity: backgroundOpacity }}
              />
            ) : null}
            {brand.centerImageUrl ? (
              <img
                className="student-id-card__center-image"
                src={brand.centerImageUrl}
                alt=""
                aria-hidden
                style={{ opacity: centerOpacity }}
              />
            ) : null}
            {activeFrame?.imageUrl ? (
              <img
                className="student-id-card__frame"
                src={activeFrame.imageUrl}
                alt=""
                aria-hidden
              />
            ) : null}
            <div className="student-id-card__photo">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt="" />
              ) : (
                <span>{labels.cardPhotoEmpty}</span>
              )}
            </div>
            <div className="student-id-card__info">
              <div className="student-id-card__school-row">
                {brand.schoolLogoUrl ? (
                  <img
                    className="student-id-card__school-logo"
                    src={brand.schoolLogoUrl}
                    alt=""
                  />
                ) : null}
                <p className="student-id-card__school">{schoolName}</p>
              </div>
              <p className="student-id-card__name">{student.name}</p>
              <dl className="student-id-card__meta">
                <div>
                  <dt>{labels.cardDepartment}</dt>
                  <dd>{student.department}</dd>
                </div>
                <div>
                  <dt>{labels.cardStudentId}</dt>
                  <dd>{student.studentId}</dd>
                </div>
                <div>
                  <dt>{labels.cardStatus}</dt>
                  <dd>{graduationLabel}</dd>
                </div>
              </dl>
            </div>
          </article>
        </div>
      </div>
    </div>,
    document.body,
  );
}
