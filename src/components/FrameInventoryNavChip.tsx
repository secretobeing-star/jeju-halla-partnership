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
  const [department, setDepartment] = useState("");
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
    setStudentName(session?.student?.name?.trim() || "학생");
    setDepartment(session?.student?.department?.trim() || "제주한라대학교");
  }, []);

  const refresh = useCallback(() => {
    const session = getSiteMemberSession();
    const id = session?.student?.studentId?.trim() || "";
    setStudentId(id);
    setStudentName(session?.student?.name?.trim() || "학생");
    setDepartment(session?.student?.department?.trim() || "제주한라대학교");
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
              className="bg-white rounded-3xl w-full max-w-md md:max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-gray-100"
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
              <div className="p-4 sm:p-5 flex-1 overflow-y-auto bg-gray-50/50">
                {!studentId ? (
                  <p className="text-center py-16 text-gray-500 text-sm">로그인(학번) 후 이용할 수 있습니다.</p>
                ) : unlocked.length === 0 ? (
                  <p className="text-center py-16 text-gray-500 text-sm">
                    보유한 학생증 코스튬이 없습니다.<br />이벤트 완료나 선물함에서 코스튬을 획득해 보세요!
                  </p>
                ) : (
                  <div className="flex flex-col md:flex-row gap-4 h-full">
                    {/* [메인 프리뷰 영역] 실제 모바일 학생증 카드 */}
                    <div className="flex-1 flex flex-col items-center bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                      {/* 학생증 카드 미니어처 */}
                      <div className="relative w-[180px] sm:w-[210px] aspect-[1/1.42] rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-900 p-3.5 text-white shadow-md flex flex-col justify-between overflow-hidden my-auto">
                        {/* 착용 프레임 이미지 오버레이 */}
                        {currentPreview?.imageUrl ? (
                          <img
                            src={currentPreview.imageUrl}
                            alt={currentPreview.name}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
                          />
                        ) : null}

                        {/* 카드 상단 로고 & 칩 */}
                        <div className="flex items-center justify-between z-0">
                          <span className="text-[9px] font-black tracking-wider opacity-90">STUDENT CARD</span>
                          <div className="w-3 h-3 rounded-full bg-white/20 border border-white/30" />
                        </div>

                        {/* 카드 중앙 인적사항 */}
                        <div className="flex flex-col items-center my-auto z-0 text-center">
                          <div className="w-12 h-12 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-sm font-bold mb-1.5 shadow-xs">
                            {studentName.slice(0, 1) || "학"}
                          </div>
                          <span className="text-sm font-extrabold tracking-tight drop-shadow-xs">{studentName}</span>
                          <span className="text-[10px] opacity-85 font-mono">{studentId || "20260000"}</span>
                          <span className="text-[9px] opacity-75 mt-0.5 max-w-[140px] truncate">{department}</span>
                        </div>

                        {/* 카드 하단 정보 */}
                        <div className="flex justify-between items-end text-[8px] opacity-70 z-0 font-medium">
                          <span>제주한라대학교</span>
                          <span>{currentPreview ? "CUSTOM" : "STANDARD"}</span>
                        </div>
                      </div>

                      {/* 프레임 정보 및 착용 버튼 */}
                      <div className="w-full pt-3 mt-3 border-t border-gray-100 text-center">
                        <div className="mb-2.5">
                          <div className="flex items-center justify-center gap-1.5 mb-0.5">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                              {currentPreview?.name || "기본 학생증"}
                            </h3>
                            {currentPreview && state.sources[currentPreview.id] ? (
                              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                                {state.sources[currentPreview.id] === "event" ? "이벤트" : "지급"}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {currentPreview?.description || "코스튬이 적용되지 않은 기본 학생증 스타일입니다."}
                          </p>
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

                    {/* [목록 영역] 크기를 대폭 키운 썸네일 리스트 (모바일 가로 / PC 세로) */}
                    <div className="md:w-64 flex flex-col flex-shrink-0 bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-xs">
                      <p className="text-xs font-bold text-gray-700 mb-2.5 px-1 text-left">
                        보유 코스튬 ({unlocked.length})
                      </p>
                      <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto pb-1 md:pb-0 md:max-h-[380px] no-scrollbar">
                        {/* 기본 스타일 선택 */}
                        <button
                          type="button"
                          className={`flex-shrink-0 flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all min-w-[130px] md:min-w-0 ${
                            selectedFrameId === null
                              ? "border-emerald-500 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-500/20"
                              : "border-gray-200 bg-gray-50/50 hover:bg-gray-100/70"
                          }`}
                          onClick={() => setSelectedFrameId(null)}
                        >
                          <div className="w-12 h-12 rounded-xl bg-gray-200/80 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                            기본
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">기본 스타일</p>
                            {state.activeFrameId === null ? (
                              <span className="text-[11px] font-bold text-emerald-600">착용 중</span>
                            ) : (
                              <span className="text-[11px] text-gray-400">미착용</span>
                            )}
                          </div>
                        </button>

                        {/* 해금된 코스튬 목록 */}
                        {unlocked.map((frame) => {
                          const isSelected = selectedFrameId === frame.id;
                          const isWearing = state.activeFrameId === frame.id;
                          return (
                            <button
                              key={frame.id}
                              type="button"
                              className={`flex-shrink-0 relative flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all min-w-[140px] md:min-w-0 ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-500/20"
                                  : "border-gray-200 bg-gray-50/50 hover:bg-gray-100/70"
                              }`}
                              onClick={() => setSelectedFrameId(frame.id)}
                            >
                              <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
                                {frame.imageUrl ? (
                                  <img src={frame.imageUrl} alt={frame.name} className="w-full h-full object-contain" />
                                ) : (
                                  <span className="text-[10px] text-gray-400 text-center line-clamp-1">{frame.name}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-800 truncate">{frame.name}</p>
                                {isWearing ? (
                                  <span className="text-[11px] font-bold text-emerald-600">착용 중</span>
                                ) : (
                                  <span className="text-[11px] text-gray-400">보유</span>
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