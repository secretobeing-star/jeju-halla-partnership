"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { getSiteMemberSession } from "@/lib/site-member-session";

interface UserGiftItem {
  id: string;
  reward_name: string;
  reward_img?: string | null;
  event_title?: string | null;
  created_at?: string;
}

export default function SiteGiftInboxModal() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [gifts, setGifts] = useState<UserGiftItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const student = getSiteMemberSession()?.student;
  const userId = student?.studentId?.trim() || "";

  // 선물함 데이터 조회
  const loadGifts = useCallback(async () => {
    if (!userId) {
      setGifts([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/gift/list?userId=${encodeURIComponent(userId)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { gifts?: UserGiftItem[] };
      setGifts(data.gifts ?? []);
    } catch {
      setGifts([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 전역 이벤트 리스너 등록 (선물함 열기 및 실시간 갱신)
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      void loadGifts();
    };
    const handleRefresh = () => {
      void loadGifts();
    };

    window.addEventListener("site-gift-inbox-open", handleOpen);
    window.addEventListener("site-gift-inbox-refresh", handleRefresh);

    return () => {
      window.removeEventListener("site-gift-inbox-open", handleOpen);
      window.removeEventListener("site-gift-inbox-refresh", handleRefresh);
    };
  }, [loadGifts]);

  // 선물 아이템 삭제 핸들러
  const handleDeleteGift = async (giftId: string, giftName: string) => {
    const confirmed = window.confirm(
      `'${giftName}' 아이템을 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`,
    );
    if (!confirmed) return;

    try {
      const response = await fetch("/api/gift/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId, userId }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "삭제에 실패했습니다.");
      }

      setGifts((prev) => prev.filter((item) => item.id !== giftId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 처리 중 오류가 발생했습니다.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      role="dialog"
      aria-modal="true"
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "85vh",
        }}
        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* 모달 상단 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>🎁</span>
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              내 선물함
            </h3>
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setIsOpen(false)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              borderRadius: "6px",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: "20px", height: "20px" }}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 선물 목록 영역 */}
        <div style={{ padding: "16px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <p
              style={{
                textAlign: "center",
                color: "#6b7280",
                margin: "40px 0",
                fontSize: "14px",
              }}
            >
              선물 목록을 불러오는 중...
            </p>
          ) : gifts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "#9ca3af",
              }}
            >
              <span
                style={{
                  fontSize: "36px",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                📭
              </span>
              <p style={{ margin: 0, fontSize: "14px" }}>보유한 선물이 없습니다.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {gifts.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    backgroundColor: "#f9fafb",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {/* 선물 정보 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      minWidth: 0,
                    }}
                  >
                    {item.reward_img ? (
                      <img
                        src={item.reward_img}
                        alt=""
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "8px",
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "8px",
                          backgroundColor: "#e5e7eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "20px",
                          flexShrink: 0,
                        }}
                      >
                        🎁
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#111827",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.reward_name}
                      </p>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: "12px",
                          color: "#6b7280",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.event_title || "이벤트 보상"}
                      </p>
                    </div>
                  </div>

                  {/* X자 SVG 벡터 아이콘 삭제 버튼 */}
                  <button
                    type="button"
                    title="선물 삭제"
                    aria-label="선물 삭제"
                    onClick={() => handleDeleteGift(item.id, item.reward_name)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "30px",
                      height: "30px",
                      padding: 0,
                      backgroundColor: "transparent",
                      border: "none",
                      borderRadius: "50%",
                      color: "#9ca3af",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "background-color 0.15s ease, color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#fee2e2";
                      e.currentTarget.style.color = "#ef4444";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#9ca3af";
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: "16px", height: "16px" }}
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 모달 하단 닫기 버튼 */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #f3f4f6",
            backgroundColor: "#ffffff",
          }}
        >
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{
              width: "100%",
              padding: "10px 0",
              backgroundColor: "#f3f4f6",
              color: "#4b5563",
              border: "none",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}