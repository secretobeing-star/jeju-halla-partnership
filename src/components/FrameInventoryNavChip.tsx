"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  hideChip?: boolean;
};

export default function FrameInventoryNavChip({
  cardFrames,
  hideChip = false,
}: FrameInventoryNavChipProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [state, setState] = useState<CardFrameUserState>({
    unlockedIds: [],
    activeFrameId: null,
    sources: {},
  });
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const session = getSiteMemberSession();
    setStudentId(session?.student?.studentId?.trim() || "");
    setStudentName(session?.student?.name?.trim() || "학생증");
  }, []);

  const refresh = useCallback(() => {
    const session = getSiteMemberSession();
    const id = session?.student?.studentId?.trim() || "";
    setStudentId(id);
    setStudentName(session?.student?.name?.trim() || "학생증");
    if (!id) {
      setState({ unlockedIds: [], activeFrameId: null, sources: {} });
      setOpen(false);
      return;
    }
    void syncCardFrameUserStateFromRemote(id, cardFrames).then((nextState) => {
      setState(nextState);
      setSelectedFrameId((prev) => prev ?? nextState.activeFrameId ?? null);
    });
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
  }, []);
  useAppBackHandler(open, close, "frame-inventory-modal");

  const unlocked = useMemo(
    () => cardFrames.filter((frame) => state.unlockedIds.includes(frame.id)),
    [cardFrames, state.unlockedIds],
  );

  const currentPreview = useMemo(() => {
    if (!selectedFrameId) return null;
    return unlocked.find((f) => f.id === selectedFrameId) ?? null;
  }, [selectedFrameId, unlocked]);

  const handleApplyFrame = (frameId: string | null) => {
    setState(setActiveCardFrame(studentId, frameId));
    window.dispatchEvent(new Event("site-card-frame-changed"));
  };

  const isCurrentEquipped = state.activeFrameId === (currentPreview?.id ?? null);

  const modal =
    mounted && open
      ? createPortal(
          <div className="site-event-overlay flex items-center justify-center p-3 sm:p-4 bg-black/60 z-50 fixed inset-0" onClick={close}>
            <div
              className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[80vh] border border-gray-100"
              role="dialog"
              aria-modal="true"
              aria-label="코스튬 보관함"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 상단 헤더 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
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

              {/* 본문 2단 구성 */}
              <div className="p-3 sm:p-4 bg-gray-50/50 flex-1 overflow-hidden">
                {!studentId ? (
                  <p className="text-center py-16 text-gray-500 text-xs sm:text-sm">로그인(학번) 후 이용할 수 있습니다.</p>
                ) : unlocked.length === 0 ? (
                  <p className="text-center py-16 text-gray-500 text-xs sm:text-sm">
                    보유한 학생증 코스튬이 없습니다.<br />이벤트 완료나 선물함에서 코스튬을 획득해 보세요!
                  </p>
                ) : (
                  <div className="grid grid-cols-12 gap-3 h-full items-stretch">
                    {/* [좌측] 미니 학생증 미리보기 및 착용 영역 */}
                    <div className="col-span-7 flex flex-col justify-between bg-white border border-gray-200/80 rounded-xl p-3 shadow-xs">
                      {/* 미니 모바일 학생증 프리뷰 카드 */}
                      <div className="flex-1 flex items-center justify-center py-1">
                        <div className="relative w-full max-w-[140px] sm:max-w-[160px] aspect-[1/1.35] rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 p-2.5 text-white shadow-md flex flex-col justify-between overflow-hidden">
                          {/* 코스튬 오버레이 프레임 */}
                          {currentPreview?.imageUrl ? (
                            <img
                              src={currentPreview.imageUrl}
                              alt={currentPreview.name}
                              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
                            />
                          ) : null}

                          {/* 미니 학생증 내부 요소 */}
                          <div className="flex items-center justify-between z-0">
                            <span className="text-[8px] font-bold tracking-wider opacity-80">STUDENT CARD</span>
                            <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                          </div>

                          <div className="flex flex-col items-center my-auto z-0">
                            <div className="w-9 h-9 rounded-full bg-white/25 border border-white/40 flex items-center justify-center text-[10px] font-bold mb-1 shadow-xs">
                              {studentName.slice(0, 1) || "학"}
                            </div>
                            <span className="text-[11px] font-bold tracking-tight">{studentName}</span>
                            <span className="text-[8px] opacity-75">{studentId || "20260000"}</span>
                          </div>

                          <div className="flex justify-between items-center text-[7px] opacity-70 z-0">
                            <span>제주한라대학교</span>
                            <span>{currentPreview ? "CUSTOM" : "STANDARD"}</span>
                          </div>
                        </div>
                      </div>

                      {/* 하단 텍스트 및 버튼 */}
                      <div className="pt-2 border-t border-gray-100 mt-2">
                        <div className="text-center mb-2">
                          <h3 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                            {currentPreview?.name || "기본 학생증"}
                          </h3>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">
                            {currentPreview?.description || "기본 모바일 학생증 디자인"}
                          </p>
                        </div>

                        <button
                          type="button"
                          className={`w-full py-2 px-3 rounded-lg font-semibold text-xs transition-all shadow-xs ${
                            isCurrentEquipped
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-default"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]"
                          }`}
                          onClick={() => handleApplyFrame(currentPreview?.id ?? null)}
                        >
                          {isCurrentEquipped ? "✓ 착용 중" : "학생증에 착용"}
                        </button>
                      </div>
                    </div>

                    {/* [우측] 보유 코스튬 목록 스크롤 뷰 */}
                    <div className="col-span-5 flex flex-col bg-white border border-gray-200/80 rounded-xl p-2.5 shadow-xs overflow-hidden">
                      <div className="flex items-center justify-between mb-2 px-0.5">
                        <span className="text-[11px] font-bold text-gray-700">보유 목록</span>
                        <span className="text-[10px] text-emerald-600 font-semibold">{unlocked.length}개</span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 no-scrollbar">
                        {/* 기본 스타일 */}
                        <button
                          type="button"
                          className={`w-full flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all ${
                            selectedFrameId === null
                              ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-400"
                              : "border-gray-150 bg-gray-50/40 hover:bg-gray-100/60"
                          }`}
                          onClick={() => setSelectedFrameId(null)}
                        >
                          <div className="w-8 h-8 rounded-md bg-gray-150 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                            기본
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-gray-800 truncate leading-tight">기본 스타일</p>
                            {state.activeFrameId === null ? (
                              <span className="text-[9px] font-bold text-emerald-600 leading-none">착용 중</span>
                            ) : (
                              <span className="text-[9px] text-gray-400 leading-none">미착용</span>
                            )}
                          </div>
                        </button>

                        {/* 해금된 코스튬들 */}
                        {unlocked.map((frame) => {
                          const isSelected = selectedFrameId === frame.id;
                          const isWearing = state.activeFrameId === frame.id;
                          return (
                            <button
                              key={frame.id}
                              type="button"
                              className={`w-full flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-400"
                                  : "border-gray-150 bg-gray-50/40 hover:bg-gray-100/60"
                              }`}
                              onClick={() => setSelectedFrameId(frame.id)}
                            >
                              <div className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center p-0.5 overflow-hidden flex-shrink-0">
                                {frame.imageUrl ? (
                                  <img src={frame.imageUrl} alt={frame.name} className="w-full h-full object-contain" />
                                ) : (
                                  <span className="text-[8px] text-gray-400 text-center">프레임</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-gray-800 truncate leading-tight">{frame.name}</p>
                                {isWearing ? (
                                  <span className="text-[9px] font-bold text-emerald-600 leading-none">착용 중</span>
                                ) : (
                                  <span className="text-[9px] text-gray-400 leading-none">보유</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
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