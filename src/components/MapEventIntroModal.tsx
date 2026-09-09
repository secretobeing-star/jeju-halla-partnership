"use client";

import type { MapEvent } from "@/lib/map-events";
import { prepareRichHtmlForDisplay, richTextHasVisibleContent } from "@/lib/rich-text";

type MapEventIntroModalProps = {
  event: MapEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function resolveIntroHtml(event: MapEvent) {
  const description = event.description?.trim() || "";
  if (richTextHasVisibleContent(description)) {
    return description;
  }
  return event.guide_text?.trim() || "";
}

function isHtmlContent(value: string) {
  return /<[a-z][\s\S]*>/i.test(value);
}

export default function MapEventIntroModal({
  event,
  isOpen,
  onClose,
  onConfirm,
}: MapEventIntroModalProps) {
  if (!isOpen || !event) return null;

  const bodyHtml = resolveIntroHtml(event);
  const isHtml = isHtmlContent(bodyHtml);
  const bannerImg =
    event.banner_img?.trim() || (event as { intro_img?: string }).intro_img?.trim() || null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="map-event-intro-overlay"
      onClick={onClose}
    >
      <div className="map-event-intro-card" onClick={(e) => e.stopPropagation()}>
        {bannerImg ? (
          <div className="map-event-intro-banner">
            <img src={bannerImg} alt="" />
          </div>
        ) : null}

        <div className="map-event-intro-scroll">
          <h3 className="map-event-intro-title">{event.title}</h3>

          {bodyHtml ? (
            <div className="map-event-intro-body rich-content">
              {isHtml ? (
                <div dangerouslySetInnerHTML={{ __html: prepareRichHtmlForDisplay(bodyHtml) }} />
              ) : (
                <p>{bodyHtml}</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="map-event-intro-actions">
          <button type="button" className="map-event-intro-confirm" onClick={onConfirm}>
            참여하기
          </button>
        </div>
      </div>
    </div>
  );
}
