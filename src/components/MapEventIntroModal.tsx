"use client";

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
  const extra = event as unknown as {
    guide_image_url?: string | null;
    guide_description?: string | null;
    guide_btn_label?: string | null;
  };

  const imageUrl = extra?.guide_image_url || event?.banner_img || null;
  const description = extra?.guide_description || event?.description || event?.guide_text || "";
  const btnLabel = extra?.guide_btn_label?.trim() || "참여하기";
  const title = event?.title || event?.tab_name || "이벤트 안내";

  if (!isOpen || !event) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* 팝업 컨테이너: 시원한 너비(max-w-lg) 및 화면 비율 맞춤 */}
      <div className="relative flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* 상단 타이틀 헤더 */}
        <div className="flex items-center justify-center border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900 text-center line-clamp-1">{title}</h3>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 대표 안내 이미지 */}
          {imageUrl && (
            <div className="w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={title}
                className="w-full max-h-72 object-contain rounded-xl"
              />
            </div>
          )}

          {/* 상세 설명 문구 */}
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