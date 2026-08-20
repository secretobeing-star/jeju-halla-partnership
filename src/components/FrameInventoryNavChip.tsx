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
    setStudentName(session?.student?.name?.trim() || "김주호");
    setDepartment(session?.student?.department?.trim() || "유아교육과");
  }, []);

  const refresh = useCallback(() => {
    const session = getSiteMemberSession();
    const id = session?.student?.studentId?.trim() || "";
    setStudentId(id);
    setStudentName(session?.student?.name?.trim() || "김주호");
    setDepartment(session?.student?.department?.trim() || "유아교육과");
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
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
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
              <div className="p-4 flex flex-col gap-3.5 bg-gray-50/60">
                {!studentId ? (
                  <p className="text-center py-12 text-gray-500 text-sm">로그인(학번) 후 이용할 수 있습니다.</p>
                ) : unlocked.length === 0 ? (
                  <p className="text-center py-12 text-gray-500 text-sm">
                    보유한 학생증 코스튬이 없습니다.<br />이벤트 완료나 선물함에서 코스튬을 획득해 보세요!
                  </p>
                ) : (
                  <>
                    {/* [상단 카드] 실제 모바일 학생증 가로형 프리뷰 */}
                    <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs flex flex-col items-center">
                      {/* 가로형 학생증 카드 디자인 */}
                      <div className="relative w-full aspect-[1.58/1] rounded-2xl bg-white border border-gray-200/90 shadow-sm p-4 text-gray-800 flex flex-col justify-between overflow-hidden">
                        {/* 착용 프레임 이미지 오버레이 */}
                        {currentPreview?.imageUrl ? (
                          <img
                            src={currentPreview.imageUrl}
                            alt={currentPreview.name}
                            className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10"
                          />
                        ) : null}

                        {/* 학교 워터마크 배경 */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-emerald-50/20 to-white/90 z-0 pointer-events-none" />

                        {/* 학생증 내부 컨텐츠 */}
                        <div className="relative z-0 flex h-full gap-3.5 items-center">
                          {/* 증명사진 박스 */}
                          <div className="w-[32%] aspect-[3/4] rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-xs font-medium flex-shrink-0">
                            사진
                          </div>

                          {/* 인적사항 목록 */}
                          <div className="flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-[11px] font-bold text-emerald-800 tracking-tight">제주한라대학교</span>
                            </div>

                            <h3 className="text-base font-black text-gray-900 tracking-tight mb-2">
                              {studentName}
                            </h3>

                            <div className="space-y-1 text-xs">
                              <div className="flex items-center text-gray-600">
                                <span className="w-10 text-gray-400 font-medium text-[11px]">학과</span>
                                <span className="font-semibold text-gray-800 text-[11px] truncate">{department}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <span className="w-10 text-gray-400 font-medium text-[11px]">학번</span>
                                <span className="font-mono font-semibold text-gray-800 text-[11px]">{studentId || "202427055"}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <span className="w-10 text-gray-400 font-medium text-[11px]">상태</span>
                                <span className="font-semibold text-gray-800 text-[11px]">재학</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 프레임 정보 및 착용 버튼 */}
                      <div className="w-full pt-3 mt-3 border-t border-gray-100 text-center">
                        <div className="mb-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <h4 className="font-bold text-gray-900 text-sm">
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

                    {/* [하단 가로 스크롤 목록] 큼직하고 컴팩트한 사각 칩 */}
                    <div className="bg-white border border-gray-200/90 rounded-2xl p-3.5 shadow-xs">
                      <p className="text-xs font-bold text-gray-700 mb-2 px-0.5 text-left">
                        보유 코스튬 ({unlocked.length})
                      </p>
                      <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                        {/* 기본 프레임 선택 버튼 */}
                        <button
                          type="button"
                          className={`flex-shrink-0 flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all min-w-[130px] ${
                            selectedFrameId === null
                              ? "border-emerald-500 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-500/20"
                              : "border-gray-200 bg-gray-50/50 hover:bg-gray-100/70"
                          }`}
                          onClick={() => setSelectedFrameId(null)}
                        >
                          <div className="w-10 h-10 rounded-lg bg-gray-200/80 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                            기본
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">기본 스타일</p>
                            {state.activeFrameId === null ? (
                              <span className="text-[10px] font-bold text-emerald-600">착용 중</span>
                            ) : (
                              <span className="text-[10px] text-gray-400">미착용</span>
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
                              className={`flex-shrink-0 relative flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all min-w-[140px] ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-500/20"
                                  : "border-gray-200 bg-gray-50/50 hover:bg-gray-100/70"
                              }`}
                              onClick={() => setSelectedFrameId(frame.id)}
                            >
                              <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center p-0.5 overflow-hidden flex-shrink-0">
                                {frame.imageUrl ? (
                                  <img src={frame.imageUrl} alt={frame.name} className="w-full h-full object-contain" />
                                ) : (
                                  <span className="text-[9px] text-gray-400 text-center line-clamp-1">{frame.name}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-800 truncate">{frame.name}</p>
                                {isWearing ? (
                                  <span className="text-[10px] font-bold text-emerald-600">착용 중</span>
                                ) : (
                                  <span className="text-[10px] text-gray-400">보유</span>
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