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
  if (!isOpen || !event) return null;

  const extra = event as Record<string, unknown>;

  // 가능한 모든 이미지 필드명을 우선순위대로 탐색
  const rawImageUrl =
    (extra.guide_image_url as string) ||
    (extra.guideImageUrl as string) ||
    (extra.banner_img as string) ||
    (extra.bannerImg as string) ||
    (extra.image_url as string) ||
    (extra.imageUrl as string) ||
    (extra.thumbnail_url as string) ||
    (extra.thumbnailUrl as string) ||
    "";

  const imageUrl = typeof rawImageUrl === "string" && rawImageUrl.trim().length > 0 ? rawImageUrl.trim() : null;

  // 설명 문구 탐색
  const rawDescription =
    (extra.guide_description as string) ||
    (extra.guideDescription as string) ||
    event.description ||
    event.guide_text ||
    "";
  const description = typeof rawDescription === "string" ? rawDescription.trim() : "";

  // 버튼 라벨 탐색
  const rawBtnLabel =
    (extra.guide_btn_label as string) ||
    (extra.guideBtnLabel as string) ||
    "참여하기";
  const btnLabel = typeof rawBtnLabel === "string" && rawBtnLabel.trim().length > 0 ? rawBtnLabel.trim() : "참여하기";

  const title = event.title || event.tab_name || "이벤트 안내";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* 타이틀 헤더 */}
        <div className="flex items-center justify-center border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900 text-center line-clamp-1">{title}</h3>
        </div>

        {/* 본문 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 이미지 영역 */}
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