import { useEffect, useRef, useState, type ReactNode } from "react";
import { PARTNER_IMAGE_COMPACT_ASPECT_CLASS, PARTNER_IMAGE_DISPLAY_ASPECT_CLASS } from "@/lib/partner-image-size";

type PartnerCardImageProps = {
  src: string;
  alt: string;
  className?: string;
  overlay?: ReactNode;
  onDetailClick?: () => void;
  detailAriaLabel?: string;
  variant?: "default" | "compact";
};

export default function PartnerCardImage({
  src,
  alt,
  className = "",
  overlay = null,
  onDetailClick,
  detailAriaLabel,
  variant = "default",
}: PartnerCardImageProps) {
  const isCompact = variant === "compact";
  const aspectClass = isCompact ? PARTNER_IMAGE_COMPACT_ASPECT_CLASS : PARTNER_IMAGE_DISPLAY_ASPECT_CLASS;
  const [loaded, setLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    if (imageRef.current?.complete) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div
      className={`${aspectClass} relative isolate w-full shrink-0 overflow-hidden bg-gray-100 ${onDetailClick ? "cursor-pointer" : ""} ${className}`.trim()}
    >
      {loaded && !isCompact && (
        <img
          src={src}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover opacity-40 blur-md"
        />
      )}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`relative z-10 h-full w-full transition-opacity duration-200 ${
          isCompact ? "object-cover" : "object-contain"
        } ${loaded ? "opacity-100" : "opacity-0"}`}
      />
      {onDetailClick ? (
        <button
          type="button"
          onClick={onDetailClick}
          className="absolute inset-0 z-[15] cursor-pointer border-0 bg-transparent p-0 text-left transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          aria-label={detailAriaLabel ?? alt}
        />
      ) : null}
      {overlay ? (
        <div className="partner-card-image__overlay pointer-events-none absolute inset-0 z-20">
          {overlay}
        </div>
      ) : null}
    </div>
  );
}
