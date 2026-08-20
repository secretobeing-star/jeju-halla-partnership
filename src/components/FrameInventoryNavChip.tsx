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

const STORAGE_KEY_PAGE_SIZE = "halla_costume_page_size";

type FrameInventoryNavChipProps = {
  cardFrames: PublicCardFrameItem[];
  hideChip?: boolean;
  /** 기본 노출 개수: 5개 설정 */
  defaultPageSize?: number;
};

export default function FrameInventoryNavChip({
  cardFrames,
  hideChip = false,
  defaultPageSize = 5,
}: FrameInventoryNavChipProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [department, setDepartment] = useState("");
  const [effectivePageSize, setEffectivePageSize] = useState(defaultPageSize);

  const [state, setState] = useState<CardFrameUserState>({
    unlockedIds: [],
    activeFrameId: null,
    sources: {},
  });
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // 스와이프 제스처 ref
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // 관리자 설정된 페이지 크기 동기화
  const loadAdminPageSize = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PAGE_SIZE);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) {
          setEffectivePageSize(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    setEffectivePageSize(defaultPageSize);
  }, [defaultPageSize]);

  useEffect(() => {
    setMounted(true);
    const session = getSiteMemberSession();
    setStudentId(session?.student?.studentId?.trim() || "");
    setStudentName(session?.student?.name?.trim() || "김주호");
    setDepartment(session?.student?.department?.trim() || "유아교육과");
    loadAdminPageSize();
  }, [loadAdminPageSize]);

  const refresh = useCallback(() => {
    const session = getSiteMemberSession();
    const id = session?.student?.studentId?.trim() || "";
    setStudentId(id);
    setStudentName(session?.student?.name?.trim() || "김주호");
    setDepartment(session?.student?.department?.trim() || "유아교육과");
    loadAdminPageSize();

    if (!id) {
      setState({ unlockedIds: [], activeFrameId: null, sources: {} });
      setOpen(false);
      return;
    }
    void syncCardFrameUserStateFromRemote(id, cardFrames).then((nextState) => {
      setState(nextState);
      setSelectedFrameId((prev) => prev ?? nextState.activeFrameId ?? null);
    });
  }, [cardFrames, loadAdminPageSize]);

  useEffect(() => {
    refresh();
    const onRefresh = () => refresh();
    window.addEventListener("site-frame-inventory-refresh", onRefresh);
    window.addEventListener("site-frame-settings-updated", onRefresh);
    window.addEventListener("focus", onRefresh);
    window.addEventListener(SITE_MEMBER_SESSION_EVENT, onRefresh);
    return () => {
      window.removeEventListener("site-frame-inventory-refresh", onRefresh);
      window.removeEventListener("site-frame-settings-updated", onRefresh);
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
  }, []);
  useAppBackHandler(open, close, "frame-inventory-modal");

  const unlocked = useMemo(
    () => cardFrames.filter((frame) => state.unlockedIds.includes(frame.id)),
    [cardFrames, state.unlockedIds],
  );

  const allDisplayItems = useMemo(() => {
    return [
      { id: null, name: "기본 스타일", isDefault: true },
      ...unlocked.map((frame) => ({
        ...frame,
        isDefault: false,
      })),
    ];
  }, [unlocked]);

  // 페이지 연산 (기본 5개 단위)
  const totalPages = Math.max(1, Math.ceil(allDisplayItems.length / effectivePageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * effectivePageSize;
    return allDisplayItems.slice(start, start + effectivePageSize);
  }, [allDisplayItems, currentPage, effectivePageSize]);

  const currentPreview = useMemo(() => {
    if (!selectedFrameId) return null;
    return unlocked.find((f) => f.id === selectedFrameId) ?? null;
  }, [selectedFrameId, unlocked]);

  const handleApplyFrame = (frameId: string | null) => {
    setState(setActiveCardFrame(studentId, frameId));
    window.dispatchEvent(new Event("site-card-frame-changed"));
  };

  const handlePrev = useCallback(() => {
    const currentIndex = allDisplayItems.findIndex((item) => item.id === selectedFrameId);
    if (currentIndex > 0) {
      const prevItem = allDisplayItems[currentIndex - 1];
      setSelectedFrameId(prevItem.id);
      setCurrentPage(Math.floor((currentIndex - 1) / effectivePageSize) + 1);
    }
  }, [allDisplayItems, selectedFrameId, effectivePageSize]);

  const handleNext = useCallback(() => {
    const currentIndex = allDisplayItems.findIndex((item) => item.id === selectedFrameId);
    if (currentIndex < allDisplayItems.length - 1) {
      const nextItem = allDisplayItems[currentIndex + 1];
      setSelectedFrameId(nextItem.id);
      setCurrentPage(Math.floor((currentIndex + 1) / effectivePageSize) + 1);
    }
  }, [allDisplayItems, selectedFrameId, effectivePageSize]);

  const onTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    touchStartXRef.current = clientX;
    touchStartYRef.current = clientY;
  };

  const onTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const clientX = "changedTouches" in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = "changedTouches" in e ? e.changedTouches[0].clientY : e.clientY;

    const diffX = touchStartXRef.current - clientX;
    const diffY = touchStartYRef.current - clientY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const isCurrentEquipped = state.activeFrameId === (currentPreview?.id ?? null);

  const modal =
    mounted && open
      ? createPortal(
          <div 
            className="site-event-overlay fixed inset-0 flex items-center justify-center p-4 bg-black/60 z-50 overflow-y-auto" 
            onClick={close}
          >
            <div
              className="bg-white rounded-3xl w-full max-w-sm md:max-w-xl overflow-hidden shadow-2xl flex flex-col border border-gray-100 animate-in fade-in zoom-in-95 duration-150 m-auto"
              role="dialog"
              aria-modal="true"
              aria-label="코스튬 보관함"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 상단 헤더 */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <FrameBoxIcon className="w-5 h-5 text-emerald-600" />
                  코스튬 보관함
                </h2>
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  onClick={close}
                  aria-label="닫기"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              {/* 본문 영역 */}
              <div className="p-3.5 sm:p-4 bg-gray-50/60 flex flex-col gap-2.5 items-center">
                {!studentId ? (
                  <p className="text-center py-8 text-gray-500 text-sm w-full">로그인(학번) 후 이용할 수 있습니다.</p>
                ) : unlocked.length === 0 ? (
                  <p className="text-center py-8 text-gray-500 text-sm w-full">
                    보유한 학생증 코스튬이 없습니다.<br />이벤트 완료나 선물함에서 코스튬을 획득해 보세요!
                  </p>
                ) : (
                  <>
                    {/* [상단 카드] 중앙 정렬 학생증 카드 영역 */}
                    <div 
                      className="w-full flex flex-col items-center justify-center bg-white border border-gray-200/90 rounded-2xl p-3 shadow-xs select-none touch-pan-y"
                      onTouchStart={onTouchStart}
                      onTouchEnd={onTouchEnd}
                      onMouseDown={onTouchStart}
                      onMouseUp={onTouchEnd}
                    >
                      {/* 가로형 학생증 카드 디자인 */}
                      <div className="relative w-full aspect-[1.62/1] max-w-[340px] rounded-2xl bg-white border border-gray-200/90 shadow-sm p-3.5 text-gray-800 flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing mx-auto">
                        {currentPreview?.imageUrl ? (
                          <img
                            src={currentPreview.imageUrl}
                            alt={currentPreview.name}
                            className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10"
                          />
                        ) : null}

                        <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-emerald-50/20 to-white/95 z-0 pointer-events-none" />

                        <div className="relative z-0 flex h-full gap-3 items-center justify-center">
                          <div className="w-[30%] aspect-[3/4] rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-xs font-medium flex-shrink-0">
                            사진
                          </div>

                          <div className="flex-1 flex flex-col justify-center min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-[10px] font-bold text-emerald-800 tracking-tight">제주한라대학교</span>
                            </div>

                            <h3 className="text-base font-black text-gray-900 tracking-tight mb-1.5 truncate">
                              {studentName}
                            </h3>

                            <div className="space-y-0.5 text-[11px]">
                              <div className="flex items-center text-gray-600">
                                <span className="w-9 text-gray-400 font-medium">학과</span>
                                <span className="font-semibold text-gray-800 truncate">{department}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <span className="w-9 text-gray-400 font-medium">학번</span>
                                <span className="font-mono font-semibold text-gray-800">{studentId || "202427055"}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <span className="w-9 text-gray-400 font-medium">상태</span>
                                <span className="font-semibold text-gray-800">재학</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 프레임 정보 및 착용 버튼 */}
                      <div className="w-full pt-2.5 mt-2 border-t border-gray-100 text-center">
                        <div className="mb-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <h4 className="font-bold text-gray-900 text-xs sm:text-sm">
                              {currentPreview?.name || "기본 학생증"}
                            </h4>
                            {currentPreview && state.sources[currentPreview.id] ? (
                              <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                                {state.sources[currentPreview.id] === "event" ? "이벤트" : "지급"}
                              </span>
                            ) : null}
                          </div>
                          {currentPreview?.description ? (
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">
                              {currentPreview.description}
                            </p>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs ${
                            isCurrentEquipped
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-default"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]"
                          }`}
                          onClick={() => handleApplyFrame(currentPreview?.id ?? null)}
                        >
                          {isCurrentEquipped ? "✓ 착용 중" : "학생증에 착용하기"}
                        </button>
                      </div>
                    </div>

                    {/* [하단 목록 영역] 5개 단위 페이지네이션 */}
                    <div className="w-full flex flex-col bg-white border border-gray-200/90 rounded-2xl p-3 shadow-xs">
                      <div className="flex items-center justify-between mb-2 px-0.5">
                        <p className="text-xs font-bold text-gray-700">
                          보유 코스튬 ({unlocked.length})
                        </p>
                        {totalPages > 1 ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                            <button
                              type="button"
                              className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={currentPage <= 1}
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            >
                              ◀
                            </button>
                            <span>{currentPage} / {totalPages}</span>
                            <button
                              type="button"
                              className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={currentPage >= totalPages}
                              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            >
                              ▶
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-1.5 pr-0.5">
                        {paginatedItems.map((item) => {
                          const isSelected = selectedFrameId === item.id;
                          const isWearing = state.activeFrameId === item.id;

                          return (
                            <button
                              key={item.id ?? "default-style"}
                              type="button"
                              className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-500/30"
                                  : "border-gray-200 bg-gray-50/50 hover:bg-gray-100/70"
                              }`}
                              onClick={() => setSelectedFrameId(item.id)}
                            >
                              {/* 썸네일 아이콘 */}
                              {item.isDefault ? (
                                <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-600 flex-shrink-0">
                                  기본
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center p-0.5 overflow-hidden flex-shrink-0">
                                  {(item as PublicCardFrameItem).imageUrl ? (
                                    <img
                                      src={(item as PublicCardFrameItem).imageUrl}
                                      alt={item.name}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <span className="text-[8px] text-gray-400 text-center line-clamp-1">{item.name}</span>
                                  )}
                                </div>
                              )}

                              {/* 아이템 이름 및 상태 */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-800 truncate leading-tight">
                                  {item.name}
                                </p>
                                {isWearing ? (
                                  <span className="text-[10px] font-bold text-emerald-600 leading-none">착용 중</span>
                                ) : (
                                  <span className="text-[10px] text-gray-400 leading-none">
                                    {item.isDefault ? "미착용" : "보유"}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
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