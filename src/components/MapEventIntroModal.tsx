"use client";

import type { MapEvent } from "@/lib/map-events";

type MapEventIntroModalProps = {
  event: MapEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function MapEventIntroModal({
  event,
  isOpen,
  onClose,
  onConfirm,
}: MapEventIntroModalProps) {
  if (!isOpen || !event) return null;

  // HTML 태그가 포함되어 있는지 확인
  const guideHtml = event.guide_text?.trim() || "";
  const isHtml = /<[a-z][\s\S]*>/i.test(guideHtml);

  // 배너 또는 인트로 이미지 추출
  const bannerImg = event.banner_img?.trim() || (event as { intro_img?: string }).intro_img?.trim() || null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        padding: "16px",
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "380px",
          overflow: "hidden",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "85vh",
          animation: "modalFadeIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 이벤트 배너/설명 이미지 */}
        {bannerImg ? (
          <div style={{ width: "100%", maxHeight: "200px", overflow: "hidden", backgroundColor: "#f3f4f6" }}>
            <img
              src={bannerImg}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        ) : null}

        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          {/* 이벤트 타이틀 */}
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "700",
              color: "#111827",
              textAlign: "center",
              marginBottom: "14px",
              lineHeight: 1.4,
            }}
          >
            {event.title}
          </h3>

          {/* 이벤트 설명 본문 (HTML 파싱 지원) */}
          {guideHtml ? (
            <div
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: "12px",
                padding: "14px 16px",
                fontSize: "14px",
                color: "#374151",
                lineHeight: 1.6,
                border: "1px solid #f3f4f6",
                wordBreak: "break-word",
              }}
            >
              {isHtml ? (
                <div
                  dangerouslySetInnerHTML={{ __html: guideHtml }}
                  style={{ all: "inherit" }}
                />
              ) : (
                <p style={{ margin: 0, whiteSpace: "pre-line" }}>{guideHtml}</p>
              )}
            </div>
          ) : null}
        </div>

        {/* 하단 참여하기 버튼 */}
        <div style={{ padding: "0 20px 20px 20px" }}>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: "#3b82f6",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "700",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              transition: "background-color 0.2s",
            }}
          >
            참여하기
          </button>
        </div>
      </div>
    </div>
  );
}