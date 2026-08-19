"use client";

import type { ReactNode } from "react";
import {
  partnerInstagramLinkLabel,
  partnerMapLinkLabel,
} from "@/lib/a11y-labels";

type PartnerDetailTitleActionsProps = {
  partnerName: string;
  favoritesEnabled?: boolean;
  favoritesTerm?: string;
  favorited?: boolean;
  onFavoriteToggle?: () => void;
  instagramUrl?: string | null;
  mapOpenUrl?: string | null;
};

function ActionIconButton({
  label,
  href,
  onClick,
  favorited,
  children,
  className = "",
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  favorited?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const sharedClassName = [
    "partner-detail-title-action inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
    className,
  ].join(" ");

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={sharedClassName}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={favorited}
      onClick={onClick}
      className={sharedClassName}
    >
      {children}
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      aria-hidden
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default function PartnerDetailTitleActions({
  partnerName,
  favoritesEnabled = false,
  favoritesTerm = "즐겨찾기",
  favorited = false,
  onFavoriteToggle,
  instagramUrl = null,
  mapOpenUrl = null,
}: PartnerDetailTitleActionsProps) {
  const showFavorite = favoritesEnabled && onFavoriteToggle;
  const showInstagram = Boolean(instagramUrl);
  const showMap = Boolean(mapOpenUrl);

  if (!showFavorite && !showInstagram && !showMap) {
    return null;
  }

  return (
    <div className="partner-detail-title-actions flex shrink-0 items-center gap-1.5">
      {showFavorite ? (
        <ActionIconButton
          label={
            favorited
              ? `${partnerName} ${favoritesTerm} 해제`
              : `${partnerName} ${favoritesTerm} 추가`
          }
          favorited={favorited}
          onClick={onFavoriteToggle}
          className={
            favorited
              ? "border-pink-400 bg-pink-50 text-pink-500 hover:bg-pink-100"
              : "border-gray-300 bg-white text-gray-500 hover:border-pink-300 hover:text-pink-500"
          }
        >
          <HeartIcon filled={favorited} />
        </ActionIconButton>
      ) : null}
      {showInstagram ? (
        <ActionIconButton
          label={partnerInstagramLinkLabel(partnerName)}
          href={instagramUrl!}
          className="border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100"
        >
          <InstagramIcon />
        </ActionIconButton>
      ) : null}
      {showMap ? (
        <ActionIconButton
          label={partnerMapLinkLabel(partnerName)}
          href={mapOpenUrl!}
          className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        >
          <MapIcon />
        </ActionIconButton>
      ) : null}
    </div>
  );
}
