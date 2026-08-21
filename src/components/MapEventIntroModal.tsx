"use client";

import type { MapEvent } from "@/lib/map-events";

type MapEventIntroModalProps = {
  event: MapEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
};

export default function MapEventIntroModal({
  event,
  isOpen,
  onClose,
  onConfirm,
}: MapEventIntroModalProps) {
  if (!isOpen || !event) return null;

  const extra = event as unknown as {
    guide_image_url?: string;
    guide_description?: string;
    guide_btn_label?: string;
    image_url?: string;
    description?: string;
  };

  const title = event.title || "";
  const desc = extra.guide_description || extra.description || "";
  const imageUrl = extra.guide_image_url || extra.image_url || null;
  const btnLabel = extra.guide_btn_label || "확인";

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden bg-white rounded-2xl shadow-2xl transition-all transform scale-100 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
          aria-label="닫기"
        >
          ✕
        </button>

        {imageUrl && (
          <div className="w-full h-48 bg-slate-100 overflow-hidden relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-5 text-center">
          {title && (
            <h3 className="text-lg font-bold text-slate-800 break-keep">
              {title}
            </h3>
          )}
          {desc && (
            <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto text-left bg-slate-50 p-3 rounded-xl border border-slate-100">
              {desc}
            </p>
          )}

          <div className="mt-6 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              닫기
            </button>
            <button
              onClick={() => {
                onConfirm?.();
                onClose();
              }}
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all"
            >
              {btnLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}