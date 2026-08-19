"use client";

import PartnerFavoriteHeartIcon from "@/components/PartnerFavoriteHeartIcon";

type PartnerFavoriteButtonProps = {
  favorited: boolean;
  label: string;
  onToggle: () => void;
  className?: string;
  placement?: "overlay" | "edge";
  favoritesTerm?: string;
};

export default function PartnerFavoriteButton({
  favorited,
  label,
  onToggle,
  className = "",
  placement = "overlay",
  favoritesTerm = "즐겨찾기",
}: PartnerFavoriteButtonProps) {
  return (
    <button
      type="button"
      className={[
        "partner-favorite-button pointer-events-auto z-20 inline-flex shrink-0 items-center justify-center rounded-full border shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
        placement === "edge"
          ? "partner-favorite-button--edge h-9 w-9"
          : "absolute right-2 top-2 h-11 w-11",
        favorited
          ? "border-pink-400 bg-pink-50 text-pink-500 hover:bg-pink-100"
          : "border-gray-300/90 bg-white/95 text-gray-500 shadow-black/15 hover:border-pink-300 hover:text-pink-500",
        className,
      ].join(" ")}
      aria-label={favorited ? `${label} ${favoritesTerm} 해제` : `${label} ${favoritesTerm} 추가`}
      aria-pressed={favorited}
      title={favorited ? `${favoritesTerm} 해제` : favoritesTerm}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      <PartnerFavoriteHeartIcon
        filled={favorited}
        className={placement === "edge" ? "h-4 w-4" : "h-5 w-5"}
      />
    </button>
  );
}
