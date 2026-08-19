"use client";

import { useCallback, useEffect, useState } from "react";
import PartnerCardImage from "@/components/PartnerCardImage";
import PopupNavChevron from "@/components/PopupNavChevron";
import { PARTNER_IMAGE_PLACEHOLDER_ASPECT_CLASS } from "@/lib/partner-image-size";

type PartnerPhotoGalleryProps = {
  images: string[];
  alt: string;
};

export default function PartnerPhotoGallery({ images, alt }: PartnerPhotoGalleryProps) {
  const [index, setIndex] = useState(0);
  const total = images.length;

  useEffect(() => {
    setIndex(0);
  }, [images]);

  const goPrev = useCallback(() => {
    setIndex((current) => (current <= 0 ? total - 1 : current - 1));
  }, [total]);

  const goNext = useCallback(() => {
    setIndex((current) => (current >= total - 1 ? 0 : current + 1));
  }, [total]);

  if (total === 0) {
    return (
      <div
        className={`${PARTNER_IMAGE_PLACEHOLDER_ASPECT_CLASS} flex w-full items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-400`}
      >
        이미지 없음
      </div>
    );
  }

  const currentSrc = images[index] ?? images[0];

  return (
    <div className="partner-photo-gallery">
      <div className="partner-photo-gallery__stage">
        <PartnerCardImage src={currentSrc} alt={`${alt} ${index + 1}`} />

        {total > 1 ? (
          <>
            <button
              type="button"
              className="board-post-popup-nav partner-photo-gallery__nav partner-photo-gallery__nav--prev"
              aria-label="이전 사진"
              onClick={goPrev}
            >
              <PopupNavChevron direction="prev" />
            </button>
            <button
              type="button"
              className="board-post-popup-nav partner-photo-gallery__nav partner-photo-gallery__nav--next"
              aria-label="다음 사진"
              onClick={goNext}
            >
              <PopupNavChevron direction="next" />
            </button>
          </>
        ) : null}
      </div>

      {total > 1 ? (
        <p className="partner-photo-gallery__counter" aria-live="polite">
          {index + 1} / {total}
        </p>
      ) : null}

      {total > 1 ? (
        <div className="partner-photo-gallery__thumbs" aria-label="사진 미리보기">
          {images.map((src, thumbIndex) => (
            <button
              key={`${src}-${thumbIndex}`}
              type="button"
              className={`partner-photo-gallery__thumb${thumbIndex === index ? " partner-photo-gallery__thumb--active" : ""}`}
              aria-label={`${thumbIndex + 1}번째 사진 보기`}
              aria-current={thumbIndex === index ? "true" : undefined}
              onClick={() => setIndex(thumbIndex)}
            >
              <img src={src} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
