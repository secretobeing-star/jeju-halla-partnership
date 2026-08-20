"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useAppBackHandler } from "@/lib/app-back-stack";
import { getSiteMemberSession, SITE_MEMBER_SESSION_EVENT } from "@/lib/site-member-session";
import { grantCardFrameUnlock } from "@/lib/student-card-frames";
import type { StudentRewardPublic } from "@/lib/student-rewards";
import type { UserGift } from "@/lib/map-events";
import type { PublicCardFrameItem } from "@/data/cardFrames";
import { requestStudentLoginModal } from "@/lib/site-student-auth-settings";

function GiftIcon({ className = "h-5 w-5" }: { className?: string }) {
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
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C9.5 3 12 8 12 8s2.5-5 4.5-5a2.5 2.5 0 0 1 0 5" />
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

type GiftInboxNavChipProps = {
  /** 상단 메뉴에 #gift-inbox 항목이 있으면 칩 UI는 숨기고 모달·배지만 유지 */
  hideChip?: boolean;
};

export default function GiftInboxNavChip({ hideChip = false }: GiftInboxNavChipProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rewards, setRewards] = useState<StudentRewardPublic[]>([]);
  const [eventGifts, setEventGifts] = useState<UserGift[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [swipeState, setSwipeState] = useState<{ itemId: string; startX: number; currentX: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"event" | "admin">("event");
  const touchStartRef = useRef<{ itemId: string; startX: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    // 컴포넌트 마운트 시 즉시 세션 체크
    const session = getSiteMemberSession();
    const id = session?.student?.studentId?.trim() || "";
    setStudentId(id);
  }, []);

  const refresh = useCallback(async () => {
    const session = getSiteMemberSession();
    const id = session?.student?.studentId?.trim() || "";
    setStudentId(id);
    if (!id) {
      setRewards([]);
      setEventGifts([]);
      setPendingCount(0);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const adminRes = await fetch(`/api/student/rewards?studentId=${encodeURIComponent(id)}`);
      const adminPayload = (await adminRes.json()) as {
        rewards?: StudentRewardPublic[];
        pendingCount?: number;
      };
      const adminRewards = adminPayload.rewards ?? [];
      setRewards(adminRewards);

      let gifts: UserGift[] = [];
      let giftPending = 0;
      try {
        const giftRes = await fetch(`/api/gift?userId=${encodeURIComponent(id)}`);
        const giftPayload = (await giftRes.json()) as {
          gifts?: UserGift[];
          pendingCount?: number;
        };
        gifts = giftPayload.gifts ?? [];
        giftPending = giftPayload.pendingCount ?? gifts.filter((item) => !item.is_claimed).length;
      } catch {
        gifts = [];
      }
      setEventGifts(gifts);
      setPendingCount(
        (adminPayload.pendingCount ?? adminRewards.filter((item) => item.status === "pending").length) +
          giftPending,
      );
    } catch {
      setRewards([]);
      setEventGifts([]);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("site-gift-inbox-refresh", onFocus);
    window.addEventListener(SITE_MEMBER_SESSION_EVENT, onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("site-gift-inbox-refresh", onFocus);
      window.removeEventListener(SITE_MEMBER_SESSION_EVENT, onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("site-gift-inbox-pending", {
        detail: { count: pendingCount },
      }),
    );
  }, [pendingCount]);

  useEffect(() => {
    function onOpen() {
      const session = getSiteMemberSession();
      const id = session?.student?.studentId?.trim() || "";
      if (!id) {
        requestStudentLoginModal();
        return;
      }
      setOpen(true);
      void refresh();
    }
    window.addEventListener("site-gift-inbox-open", onOpen);
    return () => window.removeEventListener("site-gift-inbox-open", onOpen);
  }, [refresh]);

  const close = useCallback(() => setOpen(false), []);
  useAppBackHandler(open, close, "gift-inbox-modal");

  async function claimEventGift(gift: UserGift) {
    if (!studentId || gift.is_claimed) {
      return;
    }
    setBusyId(gift.id);
    setMessage(null);
    try {
      const response = await fetch("/api/gift/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: studentId, studentId, giftId: gift.id }),
      });
      const payload = (await response.json()) as {
        error?: string;
        frameId?: string | null;
        alreadyClaimed?: boolean;
      };
      if (!response.ok) {
        setMessage(payload.error || "수령에 실패했습니다.");
        return;
      }
      if (payload.frameId) {
        grantCardFrameUnlock(studentId, payload.frameId, "event", { activate: true });
      }
      setMessage(
        payload.alreadyClaimed
          ? "이미 수령한 보상입니다."
          : "보상을 수령했습니다. 코스튬 보관함에서 확인할 수 있습니다.",
      );
      await refresh();
      window.dispatchEvent(new Event("site-frame-inventory-refresh"));
    } catch {
      setMessage("수령에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function claim(reward: StudentRewardPublic) {
    if (!studentId || reward.status === "claimed") {
      return;
    }
    setBusyId(reward.id);
    setMessage(null);
    try {
      const response = await fetch("/api/student/rewards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, rewardId: reward.id }),
      });
      const payload = (await response.json()) as {
        error?: string;
        frame?: PublicCardFrameItem | null;
        alreadyClaimed?: boolean;
      };
      if (!response.ok) {
        setMessage(payload.error || "수령에 실패했습니다.");
        return;
      }
      if (payload.frame?.id) {
        grantCardFrameUnlock(studentId, payload.frame.id, "admin", {
          activate: true,
        });
      }
      setMessage(
        payload.alreadyClaimed
          ? "이미 수령한 보상입니다."
          : "보상을 수령했습니다. 코스튬 보관함에서 확인할 수 있습니다.",
      );
      await refresh();
      window.dispatchEvent(new Event("site-frame-inventory-refresh"));
    } catch {
      setMessage("수령에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteReward(rewardId: string) {
    if (!studentId) {
      return;
    }
    setDeletingId(rewardId);
    setMessage(null);
    try {
      const response = await fetch(`/api/student/rewards?studentId=${encodeURIComponent(studentId)}&rewardId=${encodeURIComponent(rewardId)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as {
        error?: string;
        ok?: boolean;
      };
      if (!response.ok || payload.error) {
        setMessage(payload.error || "삭제에 실패했습니다.");
        return;
      }
      setMessage("선물이 삭제되었습니다.");
      setDeleteConfirmId(null);
      await refresh();
    } catch {
      setMessage("삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteEventGift(giftId: string) {
    if (!studentId) {
      return;
    }
    setDeletingId(giftId);
    setMessage(null);
    try {
      const response = await fetch(`/api/gift?userId=${encodeURIComponent(studentId)}&giftId=${encodeURIComponent(giftId)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as {
        error?: string;
        ok?: boolean;
      };
      if (!response.ok || payload.error) {
        setMessage(payload.error || "삭제에 실패했습니다.");
        return;
      }
      setMessage("선물이 삭제되었습니다.");
      setDeleteConfirmId(null);
      await refresh();
    } catch {
      setMessage("삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent, itemId: string) => {
    const touch = e.touches[0];
    touchStartRef.current = { itemId, startX: touch.clientX };
  };

  const handleTouchMove = (e: React.TouchEvent, itemId: string) => {
    if (!touchStartRef.current || touchStartRef.current.itemId !== itemId) return;
    
    const touch = e.touches[0];
    const diff = touch.clientX - touchStartRef.current.startX;
    
    // Only allow right swipe (positive diff)
    if (diff > 0) {
      setSwipeState({ itemId, startX: touchStartRef.current.startX, currentX: diff });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, itemId: string) => {
    if (!swipeState || swipeState.itemId !== itemId) {
      setSwipeState(null);
      touchStartRef.current = null;
      return;
    }

    // If swipe distance > 100px, trigger delete
    if (swipeState.currentX > 100) {
      const gift = eventGifts.find(g => g.id === itemId);
      if (gift) {
        setDeleteConfirmId(itemId);
      } else {
        const reward = rewards.find(r => r.id === itemId);
        if (reward) {
          setDeleteConfirmId(itemId);
        }
      }
    }

    setSwipeState(null);
    touchStartRef.current = null;
  };

  const handleDeleteClick = (itemId: string) => {
    const gift = eventGifts.find(g => g.id === itemId);
    if (gift) {
      setDeleteConfirmId(itemId);
    } else {
      const reward = rewards.find(r => r.id === itemId);
      if (reward) {
        setDeleteConfirmId(itemId);
      }
    }
  };

  const modal =
    mounted && open
      ? createPortal(
          <div className="site-event-overlay" onClick={close}>
            <div
              className="site-event-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="선물함"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="site-event-dialog__header">
                <h2 className="site-event-dialog__title">선물함</h2>
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    className={`px-3 py-1 text-sm rounded-lg ${activeTab === "event" ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700"}`}
                    onClick={() => setActiveTab("event")}
                  >
                    이벤트
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 text-sm rounded-lg ${activeTab === "admin" ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700"}`}
                    onClick={() => setActiveTab("admin")}
                  >
                    관리자
                  </button>
                  <button type="button" className="site-event-close" onClick={close} aria-label="닫기">
                    <CloseIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="site-event-tab-body gift-inbox">
                {!studentId ? (
                  <p className="site-event-tab-empty">로그인(학번) 후 이용할 수 있습니다.</p>
                ) : loading ? (
                  <p className="site-event-tab-empty">불러오는 중...</p>
                ) : (activeTab === "event" ? eventGifts : rewards).length === 0 ? (
                  <p className="site-event-tab-empty">받은 선물이 없습니다.</p>
                ) : (
                  <ul className="gift-inbox__list">
                    {activeTab === "event" ? eventGifts.map((gift) => (
                      <li 
                        key={`event-${gift.id}`} 
                        className="gift-inbox__item"
                        onTouchStart={(e) => handleTouchStart(e, gift.id)}
                        onTouchMove={(e) => handleTouchMove(e, gift.id)}
                        onTouchEnd={(e) => handleTouchEnd(e, gift.id)}
                        style={{
                          transform: swipeState?.itemId === gift.id ? `translateX(${swipeState.currentX}px)` : 'translateX(0)',
                          transition: swipeState ? 'none' : 'transform 0.2s ease-out'
                        }}
                      >
                        <div className="gift-inbox__card">
                          {gift.reward_img ? (
                            <img src={gift.reward_img} alt="" className="gift-inbox__thumb" />
                          ) : (
                            <span className="gift-inbox__thumb gift-inbox__thumb--empty">
                              <GiftIcon className="h-6 w-6" />
                            </span>
                          )}
                          <div className="gift-inbox__body">
                            <p className="gift-inbox__title">{gift.reward_name}</p>
                            {gift.frame_css_value ? (
                              <p className="gift-inbox__description" style={{ whiteSpace: "pre-line" }}>
                                코스튬 프레임이 포함되어 있습니다.
                              </p>
                            ) : null}
                            <p className="gift-inbox__msg">이벤트 보상 · 코스튬 보관함으로 수령</p>
                            <p className="gift-inbox__meta">
                              {gift.is_claimed ? "수령 완료" : "미수령"} ·{" "}
                              {new Date(gift.created_at).toLocaleDateString("ko-KR")}
                            </p>
                          </div>
                          <div className="gift-inbox__actions">
                            {!gift.is_claimed ? (
                              <button
                                type="button"
                                className="gift-inbox__claim"
                                disabled={busyId === gift.id}
                                onClick={() => void claimEventGift(gift)}
                              >
                                {busyId === gift.id ? "..." : "받기"}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="gift-inbox__delete"
                              disabled={deletingId === gift.id}
                              onClick={() => handleDeleteClick(gift.id)}
                              title="삭제"
                            >
                              {deletingId === gift.id ? "..." : "×"}
                            </button>
                          </div>
                        </div>
                      </li>
                    )) : rewards.map((reward) => (
                      <li 
                        key={reward.id} 
                        className="gift-inbox__item"
                        onTouchStart={(e) => handleTouchStart(e, reward.id)}
                        onTouchMove={(e) => handleTouchMove(e, reward.id)}
                        onTouchEnd={(e) => handleTouchEnd(e, reward.id)}
                        style={{
                          transform: swipeState?.itemId === reward.id ? `translateX(${swipeState.currentX}px)` : 'translateX(0)',
                          transition: swipeState ? 'none' : 'transform 0.2s ease-out'
                        }}
                      >
                        <div className="gift-inbox__card">
                          {reward.frameImageUrl ? (
                            <img
                              src={reward.frameImageUrl}
                              alt=""
                              className="gift-inbox__thumb"
                            />
                          ) : (
                            <span className="gift-inbox__thumb gift-inbox__thumb--empty">
                              <GiftIcon className="h-6 w-6" />
                            </span>
                          )}
                          <div className="gift-inbox__body">
                            <p className="gift-inbox__title">{reward.title}</p>
                            {reward.message ? (
                              <p className="gift-inbox__description" style={{ whiteSpace: "pre-line" }}>
                                {reward.message}
                              </p>
                            ) : null}
                            <p className="gift-inbox__meta">
                              {reward.status === "claimed" ? "수령 완료" : "미수령"} ·{" "}
                              {new Date(reward.createdAt).toLocaleDateString("ko-KR")}
                            </p>
                          </div>
                          <div className="gift-inbox__actions">
                            {reward.status === "pending" ? (
                              <button
                                type="button"
                                className="gift-inbox__claim"
                                disabled={busyId === reward.id}
                                onClick={() => void claim(reward)}
                              >
                                {busyId === reward.id ? "..." : "받기"}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="gift-inbox__delete"
                              disabled={deletingId === reward.id}
                              onClick={() => handleDeleteClick(reward.id)}
                              title="삭제"
                            >
                              {deletingId === reward.id ? "..." : "×"}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {message ? <p className="gift-inbox__feedback">{message}</p> : null}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const deleteConfirmModal = deleteConfirmId ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-white p-6 shadow-lg max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">선물 삭제</h3>
        <p className="text-sm text-gray-600 mb-4">
          이 선물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteConfirmId(null)}
            disabled={deletingId !== null}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              const gift = eventGifts.find(g => g.id === deleteConfirmId);
              if (gift) {
                void deleteEventGift(deleteConfirmId);
              } else {
                void deleteReward(deleteConfirmId);
              }
            }}
            disabled={deletingId !== null}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {deletingId ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      {mounted && !hideChip && studentId ? (
        <div className="site-top-nav__link-item group relative site-top-nav__link-item--custom-visual">
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              void refresh();
            }}
            className="site-top-nav__link site-events-nav-chip inline-flex items-center gap-2.5"
            aria-label={pendingCount ? `선물함 새 선물 ${pendingCount}개` : "선물함"}
          >
            <span className="site-top-nav__link-icon-wrap">
              <span className="site-top-nav__link-icon-fallback text-emerald-700">
                <GiftIcon className="h-full w-full" />
              </span>
            </span>
            <span className="site-top-nav__link-label site-top-nav__link-label--sr-only">
              선물함
            </span>
          </button>
          {pendingCount > 0 ? (
            <span className="site-top-nav__new-badge" aria-hidden>
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          ) : null}
        </div>
      ) : null}
      {modal}
      {deleteConfirmModal}
    </>
  );
}
