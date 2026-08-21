"use client";

import { useMemo } from "react";
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
  const { description, btnLabel, title } = useMemo(() => {
    if (!event) {
      return { description: "", btnLabel: "참여하기", title: "이벤트 안내" };
    }

    const obj = event as Record<string, unknown>;

    // 상세 설명 문구
    const rawDesc =
      (obj.guide_description as string) ||
      (obj.guideDescription as string) ||
      event.description ||
      event.guide_text ||
      "";

    // 버튼 문구
    const rawBtn =
      (obj.guide_btn_label as string) ||
      (obj.guideBtnLabel as string) ||
      "참여하기";

    return {
      description: typeof rawDesc === "string" ? rawDesc.trim() : "",
      btnLabel: typeof rawBtn === "string" && rawBtn.trim().length > 0 ? rawBtn.trim() : "참여하기",
      title: event.title || event.tab_name || "이벤트 안내",
    };
  }, [event]);

  if (!isOpen || !event) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      {/* 팝업 컨테이너: 가로폭 넉넉하게 확장 (max-w-lg) */}
      <div className="relative flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        
        {/* 상단 타이틀 헤더 */}
        <div className="flex items-center justify-center border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900 text-center line-clamp-1">{title}</h3>
        </div>

        {/* 본문 콘텐츠 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 상세 설명 텍스트 */}
          {description ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-line border border-slate-100/80">
              {description}
            </div>
          ) : null}
        </div>

        {/* 하단 참여하기 단일 버튼 */}
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