"use client";

import { useEffect, useMemo } from "react";
import type { MapEvent } from "@/lib/map-events";

type MapEventIntroModalProps = {
  event: MapEvent | null;
  isOpen: boolean;
  onClose?: () => void;
  onConfirm: () => void;
};

export default function MapEventIntroModal({
  event,
  isOpen,
  onConfirm,
}: MapEventIntroModalProps) {
  // 디버깅: 브라우저 개발자도구(F12) 콘솔에서 실제 들어온 이벤트 객체 확인용
  useEffect(() => {
    if (isOpen && event) {
      console.log("[MapEventIntroModal] 전달받은 이벤트 데이터:", event);
    }
  }, [isOpen, event]);

  const { imageUrl, description, btnLabel, title } = useMemo(() => {
    if (!event) {
      return { imageUrl: null, description: "", btnLabel: "참여하기", title: "이벤트 안내" };
    }

    const obj = event as unknown as Record<string, unknown>;

    // 1. 이미지 URL: 가능한 모든 키를 확인
    const candidateImg =
      obj.guide_image_url ||
      obj.guideImageUrl ||
      obj.banner_img ||
      obj.bannerImg ||
      obj.thumbnail_url ||
      obj.thumbnailUrl ||
      obj.image_url ||
      obj.imageUrl ||
      obj.stamp_bar_bg_img ||
      "";

    const resolvedImg =
      typeof candidateImg === "string" && candidateImg.trim().startsWith("http")
        ? candidateImg.trim()
        : null;

    // 2. 상세 설명
    const candidateDesc =
      obj.guide_description ||
      obj.guideDescription ||
      event.description ||
      event.guide_text ||
      "";

    // 3. 버튼 라벨
    const candidateBtn =
      obj.guide_btn_label ||
      obj.guideBtnLabel ||
      "참여하기";

    return {
      imageUrl: resolvedImg,
      description: typeof candidateDesc === "string" ? candidateDesc.trim() : "",
      btnLabel: typeof candidateBtn === "string" && candidateBtn.trim() ? candidateBtn.trim() : "참여하기",
      title: event.title || event.tab_name || "이벤트 안내",
    };
  }, [event]);

  if (!isOpen || !event) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* 상단 타이틀 */}
        <div className="flex items-center justify-center border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900 text-center line-clamp-1">{title}</h3>
        </div>

        {/* 본문 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 이미지 영역 */}
          {imageUrl ? (
            <div className="w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={title}
                className="w-full max-h-72 object-contain rounded-xl"
                onError={(e) => {
                  console.error("[MapEventIntroModal] 이미지 로드 실패:", imageUrl);
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : null}

          {/* 설명 문구 영역 */}
          {description ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-line border border-slate-100/80">
              {description}
            </div>
          ) : null}
        </div>

        {/* 하단 단일 버튼 */}
        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] transition-all"
          >
            {btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}