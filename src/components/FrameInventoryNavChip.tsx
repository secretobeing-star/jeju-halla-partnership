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
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
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
    void syncCardFrameUserStateFromRemote(id, cardFrames).then((nextState) => {
      setState(nextState);
      // 현재 착용 중인 프레임을 기본 선택, 없으면 첫 번째 해금 프레임 선택
      setSelectedFrameId((prev) => prev ?? nextState.activeFrameId ?? nextState.unlockedIds[0] ?? null);
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

  // 현재 상세 뷰에 띄워진 선택 프레임
  const currentPreview = useMemo(() => {
    if (!selectedFrameId) return null;
    return unlocked.find((f) => f.id === selectedFrameId) ?? null;
  }, [selectedFrameId, unlocked]);

  const handleApplyFrame = (frameId: string | null) => {
    setState(setActiveCardFrame(studentId, frameId));
    window.dispatchEvent(new Event("site-card-frame-changed"));
  };

  const modal =
    mounted && open
      ? createPortal(
          <div className="site-event-overlay flex items-center justify-center p-4 bg-black/60 z-50 fixed inset-0" onClick={close}>
            <div
              className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              role="dialog"
              aria-modal="true"
              aria-label="코스튬 보관함"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 모달 상단 헤더 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FrameBoxIcon className="w-5 h-5 text-emerald-600" />
                  코스튬 보관함
                </h2>
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  onClick={close}
                  aria-label="닫기"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              {/* 본문 레이아웃: 모바일=세로형(상단미리보기/하단목록) | PC/태블릿=좌우2단(좌측미리보기/우측목록) */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {!studentId ? (
                  <p className="text-center py-16 text-gray-500 text-sm">로그인(학번) 후 이용할 수 있습니다.</p>
                ) : unlocked.length === 0 ? (
                  <p className="text-center py-16 text-gray-500 text-sm">
                    보유한 학생증 코스튬이 없습니다.<br />이벤트 완료나 선물함에서 코스튬을 해금해 보세요!
                  </p>
                ) : (
                  <div className="flex flex-col md:flex-row gap-5 h-full">
                    {/* [메인 영역] 선택된 코스튬 큰 이미지 + 제목/설명/적용 버튼 */}
                    <div className="flex-1 flex flex-col items-center bg-gray-50/70 border border-gray-100 rounded-xl p-5 text-center">
                      <div className="w-full max-w-[220px] aspect-square rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden mb-4 p-2">
                        {currentPreview?.imageUrl ? (
                          <img
                            src={currentPreview.imageUrl}
                            alt={currentPreview.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <span className="text-2xl mb-1">🎭</span>
                            <span className="text-xs">{currentPreview?.name || "기본 프레임"}</span>
                          </div>
                        )}
                      </div>

                      <div className="w-full mb-4">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 text-base">
                            {currentPreview?.name || "기본 학생증"}
                          </h3>
                          {currentPreview && state.sources[currentPreview.id] ? (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                              {state.sources[currentPreview.id] === "event" ? "이벤트 보상" : "특별 지급"}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-gray-500 min-h-[36px] line-clamp-2 px-2 whitespace-pre-line">
                          {currentPreview?.description || "코스튬이 적용되지 않은 기본 학생증 스타일입니다."}
                        </p>
                      </div>

                      <button
                        type="button"
                        className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all shadow-sm ${
                          state.activeFrameId === (currentPreview?.id ?? null)
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold cursor-default"
                            : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]"
                        }`}
                        onClick={() => handleApplyFrame(currentPreview?.id ?? null)}
                      >
                        {state.activeFrameId === (currentPreview?.id ?? null) ? "✓ 착용 중" : "학생증에 착용하기"}
                      </button>
                    </div>

                    {/* [목록 영역] 모바일: 하단 가로 스크롤 썸네일 | PC/태블릿: 우측 세로 스크롤 그리드 */}
                    <div className="md:w-64 flex flex-col">
                      <p className="text-xs font-semibold text-gray-400 mb-2 px-1 text-left">보유 코스튬 ({unlocked.length})</p>
                      <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 md:max-h-[380px] no-scrollbar">
                        {/* 기본 프레임(해제) 버튼 */}
                        <button
                          type="button"
                          className={`flex-shrink-0 flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                            selectedFrameId === null
                              ? "border-emerald-500 bg-emerald-50/50 shadow-sm"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                          onClick={() => setSelectedFrameId(null)}
                        >
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-200">
                            기본
                          </div>
                          <div className="hidden md:block flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">기본 스타일</p>
                            <p className="text-[11px] text-gray-400 truncate">효과 없음</p>
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
                              className={`flex-shrink-0 relative flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                              }`}
                              onClick={() => setSelectedFrameId(frame.id)}
                            >
                              <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center p-1 overflow-hidden">
                                {frame.imageUrl ? (
                                  <img src={frame.imageUrl} alt={frame.name} className="w-full h-full object-contain" />
                                ) : (
                                  <span className="text-[10px] text-gray-400 text-center line-clamp-1">{frame.name}</span>
                                )}
                              </div>
                              <div className="hidden md:block flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-800 truncate">{frame.name}</p>
                                {isWearing ? (
                                  <span className="inline-block text-[10px] font-bold text-emerald-600">착용 중</span>
                                ) : (
                                  <span className="text-[10px] text-gray-400 truncate">보유 중</span>
                                )}
                              </div>
                              {isWearing ? (
                                <span className="md:hidden absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                              ) : null}
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