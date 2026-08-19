import {
  isBoardPopupNavHref,
  isFrameInventoryNavHref,
  isGiftInboxNavHref,
} from "@/lib/site-nav-links";

type SiteNavMenuItemIconProps = {
  iconUrl?: string | null;
  label: string;
  href?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

type NavLinkIconPreset = "board" | "partners" | "gift" | "inventory" | "external" | "letter";

function resolveNavLinkIconPreset(href: string | undefined, label: string): NavLinkIconPreset {
  const normalizedHref = href?.trim().toLowerCase() ?? "";

  if (isBoardPopupNavHref(normalizedHref)) {
    return "board";
  }

  if (isGiftInboxNavHref(normalizedHref) || label.includes("선물")) {
    return "gift";
  }

  if (isFrameInventoryNavHref(normalizedHref) || label.includes("보관")) {
    return "inventory";
  }

  if (normalizedHref.includes("partner-list")) {
    return "partners";
  }

  if (
    normalizedHref.startsWith("http://") ||
    normalizedHref.startsWith("https://") ||
    normalizedHref.startsWith("//")
  ) {
    return "external";
  }

  if (label.trim()) {
    return "letter";
  }

  return "letter";
}

function NavLinkPresetIcon({
  preset,
}: {
  preset: Exclude<NavLinkIconPreset, "letter">;
}) {
  if (preset === "board") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-full w-full"
        aria-hidden
      >
        <path d="M15 18H3" />
        <path d="M17 6H3" />
        <path d="M21 12H3" />
      </svg>
    );
  }

  if (preset === "gift") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-full w-full"
        aria-hidden
      >
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M12 8v13" />
        <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
        <path d="M7.5 8a2.5 2.5 0 0 1 0-5C9.5 3 12 8 12 8s2.5-5 4.5-5a2.5 2.5 0 0 1 0 5" />
      </svg>
    );
  }

  if (preset === "inventory") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-full w-full"
        aria-hidden
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    );
  }

  if (preset === "partners") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-full w-full"
        aria-hidden
      >
        <path d="M3 7h18" />
        <path d="M3 12h18" />
        <path d="M3 17h18" />
        <path d="M8 7v10" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
      aria-hidden
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

export default function SiteNavMenuItemIcon({
  iconUrl,
  label,
  href,
  className = "site-nav-menu-item-icon",
  imageClassName = "site-nav-menu-item-icon__image",
  fallbackClassName = "site-nav-menu-item-icon__fallback",
}: SiteNavMenuItemIconProps) {
  const trimmedIconUrl = iconUrl?.trim();

  if (trimmedIconUrl) {
    return (
      <span className={className} aria-hidden>
        <img src={trimmedIconUrl} alt="" className={imageClassName} width={24} height={24} />
      </span>
    );
  }

  const preset = resolveNavLinkIconPreset(href, label);

  if (preset !== "letter") {
    return (
      <span className={`${className} ${fallbackClassName} site-nav-menu-item-icon__preset`} aria-hidden>
        <NavLinkPresetIcon preset={preset} />
      </span>
    );
  }

  const initial = label.trim().charAt(0) || "?";

  return (
    <span className={`${className} ${fallbackClassName}`} aria-hidden>
      {initial}
    </span>
  );
}
