"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useAppBackHandler } from "@/lib/app-back-stack";
import { getSiteMemberSession, SITE_MEMBER_SESSION_EVENT } from "@/lib/site-member-session";
import {
  setActiveCardFrame,
  syncCardFrameUserStateFromRemote,
  type CardFrameUserState,
  type PublicCardFrameItem,
} from "@/lib/student-card-frames";
import { requestStudentLoginModal } from "@/lib/site-student-auth-settings";

function FrameBoxIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function CloseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

type FrameInventoryNavChipProps = {
  cardFrames: PublicCardFrameItem[];
  /** 상단 메뉴에 #frame-inventory 항목이 있으면 칩 UI는 숨기고 모달만 유지 */
  hideChip?: boolean;
};

export default function FrameInventoryNavChip({
  cardFrames,
  hideChip = false,
}: FrameInventoryNavChipProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [state, setState] = useState<CardFrameUserState>({
    unlockedIds: [],
    activeFrameId: null,
    sources: {},
  });
  const [swipeState, setSwipeState] = useState<{ frameId: string; startX: number; currentX: number } | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "detail">("grid");
  const [selectedFrame, setSelectedFrame] = useState<PublicCardFrameItem | null>(null);
  const touchStartRef = useRef<{ frameId: string; startX: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    // 컴포넌트 마운트 시 즉시 세션 체크
    const session = getSiteMemberSession();
    const id = session?.student?.studentId?.trim() || "";
    setStudentId(id);
  }, []);

  const refresh = useCallback(() => {
    const session = getSiteMemberSession();
    const id = session?.student?.studentId?.trim() || "";
    setStudentId(id);
    if (!id) {
      setState({ unlockedIds: [], activeFrameId: null, sources: {} });
      setOpen(false);
      return;
    }
    void syncCardFrameUserStateFromRemote(id, cardFrames).then(setState);
  }, [cardFrames]);

  useEffect(() => {
    refresh();
    const onRefresh = () => refresh();
    window.addEventListener("site-frame-inventory-refresh", onRefresh);
    window.addEventListener("focus", onRefresh);
    window.addEventListener(SITE_MEMBER_SESSION_EVENT, onRefresh);
    return () => {
      window.removeEventListener("site-frame-inventory-refresh", onRefresh);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener(SITE_MEMBER_SESSION_EVENT, onRefresh);
    };
  }, [refresh]);

  useEffect(() => {
    function onOpen() {
      const session = getSiteMemberSession();
      const id = session?.student?.studentId?.trim() || "";
      if (!id) {
        requestStudentLoginModal();
        return;
      }
      setOpen(true);
      refresh();
    }
    window.addEventListener("site-frame-inventory-open", onOpen);
    return () => window.removeEventListener("site-frame-inventory-open", onOpen);
  }, [refresh]);

  const close = useCallback(() => {
    setOpen(false);
    setViewMode("grid");
    setSelectedFrame(null);
  }, []);
  useAppBackHandler(open, close, "frame-inventory-modal");

  const unlocked = useMemo(
    () => cardFrames.filter((frame) => state.unlockedIds.includes(frame.id)),
    [cardFrames, state.unlockedIds],
  );

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent, frameId: string) => {
    const touch = e.touches[0];
    touchStartRef.current = { frameId, startX: touch.clientX };
  };

  const handleTouchMove = (e: React.TouchEvent, frameId: string) => {
    if (!touchStartRef.current || touchStartRef.current.frameId !== frameId) return;
    
    const touch = e.touches[0];
    const diff = touch.clientX - touchStartRef.current.startX;
    
    // Allow both left and right swipe
    setSwipeState({ frameId, startX: touchStartRef.current.startX, currentX: diff });
  };

  const handleTouchEnd = (e: React.TouchEvent, frameId: string) => {
    if (!swipeState || swipeState.frameId !== frameId) {
      setSwipeState(null);
      touchStartRef.current = null;
      return;
    }

    // Swipe right to select, swipe left to go back to grid
    if (Math.abs(swipeState.currentX) > 100) {
      if (viewMode === "grid") {
        const frame = unlocked.find(f => f.id === frameId);
        if (frame) {
          setSelectedFrame(frame);
          setViewMode("detail");
        }
      } else {
        setViewMode("grid");
        setSelectedFrame(null);
      }
    }

    setSwipeState(null);
    touchStartRef.current = null;
  };

  const handleFrameClick = (frame: PublicCardFrameItem) => {
    setSelectedFrame(frame);
    setViewMode("detail");
  };

  const handleBackToGrid = () => {
    setViewMode("grid");
    setSelectedFrame(null);
  };

  const modal =
    mounted && open
      ? createPortal(
          <div className="site-event-overlay" onClick={close}>
            <div
              className="site-event-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="코스튬 보관함"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="site-event-dialog__header">
                <h2 className="site-event-dialog__title">코스튬 보관함</h2>
                {viewMode === "detail" && selectedFrame ? (
                  <button
                    type="button"
                    className="px-3 py-1 text-sm rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                    onClick={handleBackToGrid}
                  >
                    ← 목록
                  </button>
                ) : null}
                <button type="button" className="site-event-close ml-auto" onClick={close} aria-label="닫기">
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="site-event-tab-body frame-inventory">
                {!studentId ? (
                  <p className="site-event-tab-empty">로그인(학번) 후 이용할 수 있습니다.</p>
                ) : unlocked.length === 0 ? (
                  <p className="site-event-tab-empty">
                    보유한 학생증 코스튬이 없습니다. 선물함이나 시크릿 코드로 해금해 주세요.
                  </p>
                ) : viewMode === "detail" && selectedFrame ? (
                  <div className="frame-inventory__detail">
                    <div className="frame-inventory__detail-card">
                      {selectedFrame.imageUrl ? (
                        <img 
                          src={selectedFrame.imageUrl} 
                          alt={selectedFrame.name}
                          className="frame-inventory__detail-image"
                        />
                      ) : (
                        <div className="frame-inventory__detail-image frame-inventory__detail-image--empty">
                          <span>{selectedFrame.name}</span>
                        </div>
                      )}
                      <div className="frame-inventory__detail-info">
                        <h3 className="frame-inventory__detail-title">{selectedFrame.name}</h3>
                        {selectedFrame.description ? (
                          <p className="frame-inventory__detail-description" style={{ whiteSpace: "pre-line" }}>
                            {selectedFrame.description}
                          </p>
                        ) : null}
                        <p className="frame-inventory__detail-meta">
                          {state.sources[selectedFrame.id] ? (
                            <span className="text-emerald-600">
                              {state.sources[selectedFrame.id] === "event" ? "이벤트 보상" : "관리자 지급"}
                            </span>
                          ) : null}
                        </p>
                        <button
                          type="button"
                          className={[
                            "frame-inventory__detail-activate",
                            state.activeFrameId === selectedFrame.id
                              ? "frame-inventory__detail-activate--active"
                              : "",
                          ]
                          .filter(Boolean)
                          .join(" ")}
                          onClick={() => {
                            setState(setActiveCardFrame(studentId, selectedFrame.id));
                          }}
                        >
                          {state.activeFrameId === selectedFrame.id ? "적용 중" : "적용하기"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="frame-inventory__grid">
                    <button
                      type="button"
                      className={[
                        "frame-inventory__chip",
                        !state.activeFrameId ? "frame-inventory__chip--active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        setState(setActiveCardFrame(studentId, null));
                      }}
                    >
                      없음
                    </button>
                    {unlocked.map((frame) => (
                      <button
                        key={frame.id}
                        type="button"
                        className={[
                          "frame-inventory__chip",
                          state.activeFrameId === frame.id
                            ? "frame-inventory__chip--active"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onTouchStart={(e) => handleTouchStart(e, frame.id)}
                        onTouchMove={(e) => handleTouchMove(e, frame.id)}
                        onTouchEnd={(e) => handleTouchEnd(e, frame.id)}
                        onClick={() => handleFrameClick(frame)}
                        style={{
                          transform: swipeState?.frameId === frame.id ? `translateX(${swipeState.currentX}px)` : 'translateX(0)',
                          transition: swipeState ? 'none' : 'transform 0.2s ease-out'
                        }}
                      >
                        {frame.imageUrl ? (
                          <img src={frame.imageUrl} alt={frame.name} />
                        ) : (
                          <span>{frame.name}</span>
                        )}
                        <div className="frame-inventory__chip-info">
                          <span className="frame-inventory__chip-title">{frame.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {mounted && !hideChip && studentId ? (
        <div className="site-top-nav__link-item group relative site-top-nav__link-item--custom-visual">
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              refresh();
            }}
            className="site-top-nav__link site-events-nav-chip inline-flex items-center gap-2.5"
            aria-label="코스튬 보관함"
          >
            <span className="site-top-nav__link-icon-wrap">
              <span className="site-top-nav__link-icon-fallback text-emerald-700">
                <FrameBoxIcon className="h-full w-full" />
              </span>
            </span>
            <span className="site-top-nav__link-label site-top-nav__link-label--sr-only">
              코스튬 보관함
            </span>
          </button>
        </div>
      ) : null}
      {modal}
    </>
  );
}
