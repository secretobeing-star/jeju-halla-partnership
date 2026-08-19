"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DropdownNavItem } from "@/components/SiteNavDropdownItems";
import type { SiteNavLinkItem } from "@/lib/site-nav-links";

type SiteNavTitleDropdownProps = {
  title: string;
  titleImageUrl?: string | null;
  iconUrl?: string | null;
  iconHidden?: boolean;
  chipHidden?: boolean;
  brandLinkUrl?: string | null;
  brandLinkRefresh?: boolean;
  navLinks: SiteNavLinkItem[];
  onNavAction?: (href: string) => void;
  variant?: "nav" | "hero";
  iconOnly?: boolean;
  flat?: boolean;
};

function refreshCurrentPage() {
  window.location.reload();
}

function BrandIconContent({
  iconUrl,
  iconHidden,
}: {
  iconUrl?: string | null;
  iconHidden: boolean;
}) {
  if (iconHidden) {
    return null;
  }

  if (iconUrl) {
    return (
      <img src={iconUrl} alt="" className="site-title-dropdown__icon" width={32} height={32} />
    );
  }

  return (
    <span aria-hidden className="site-title-dropdown__icon-fallback">
      H
    </span>
  );
}

function BrandMark({
  title,
  titleImageUrl,
  iconUrl,
  iconHidden,
  iconOnly,
}: {
  title: string;
  titleImageUrl?: string | null;
  iconUrl?: string | null;
  iconHidden: boolean;
  iconOnly: boolean;
}) {
  return (
    <span className="site-title-dropdown__brand-mark">
      <BrandIconContent iconUrl={iconUrl} iconHidden={iconHidden} />
      <BrandTitleContent title={title} titleImageUrl={titleImageUrl} iconOnly={iconOnly} />
    </span>
  );
}

function BrandTitleContent({
  title,
  titleImageUrl,
  iconOnly,
}: {
  title: string;
  titleImageUrl?: string | null;
  iconOnly: boolean;
}) {
  if (iconOnly) {
    return null;
  }

  const imageUrl = titleImageUrl?.trim();
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={title.trim() || "사이트 제목"}
        className="site-title-dropdown__title-image"
      />
    );
  }

  if (!title.trim()) {
    return null;
  }

  return <span className="site-title-dropdown__title">{title}</span>;
}

function buildRootClassName(options: {
  variant: "nav" | "hero";
  flat: boolean;
  iconOnly: boolean;
  open: boolean;
  staticMode: boolean;
  hasTitleImage: boolean;
  chipHidden: boolean;
  iconHidden: boolean;
  brandLinkRefresh: boolean;
}) {
  return [
    "site-title-dropdown",
    `site-title-dropdown--${options.variant}`,
    options.staticMode ? "site-title-dropdown--static" : "",
    options.flat && options.variant === "nav" ? "site-title-dropdown--flat" : "",
    options.chipHidden && options.variant === "nav" ? "site-title-dropdown--plain-chip" : "",
    options.brandLinkRefresh && options.variant === "nav" ? "site-title-dropdown--brand-refresh" : "",
    options.iconOnly ? "site-title-dropdown--icon-only" : "",
    options.iconHidden ? "site-title-dropdown--icon-hidden" : "",
    options.open ? "site-title-dropdown--open" : "",
    options.hasTitleImage ? "site-title-dropdown--title-image" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function SiteNavTitleDropdown({
  title,
  titleImageUrl = null,
  iconUrl = null,
  iconHidden = false,
  chipHidden = false,
  brandLinkUrl = null,
  brandLinkRefresh = false,
  navLinks,
  onNavAction,
  variant = "nav",
  iconOnly = false,
  flat = variant === "nav",
}: SiteNavTitleDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const hasTitleImage = Boolean(titleImageUrl?.trim());
  const hasTitleText = Boolean(title.trim());
  const hasTitleContent = !iconOnly && (hasTitleImage || hasTitleText);
  const triggerLabel =
    iconOnly || (!hasTitleContent && iconHidden) ? "메뉴" : title.trim() || "사이트 제목";

  const brandMark = (
    <BrandMark
      title={title}
      titleImageUrl={titleImageUrl}
      iconUrl={iconUrl}
      iconHidden={iconHidden}
      iconOnly={iconOnly}
    />
  );

  const trigger = <span className="site-title-dropdown__trigger">{brandMark}</span>;

  if (navLinks.length === 0) {
    const linkUrl = brandLinkUrl?.trim();
    const rootClassName = buildRootClassName({
      variant,
      flat,
      iconOnly,
      open: false,
      staticMode: true,
      hasTitleImage,
      chipHidden,
      iconHidden,
      brandLinkRefresh,
    });

    if (brandLinkRefresh) {
      return (
        <div className={rootClassName}>
          <button
            type="button"
            className="site-title-dropdown__brand-link site-title-dropdown__brand-refresh-btn"
            aria-label="페이지 새로고침"
            onClick={refreshCurrentPage}
          >
            {trigger}
          </button>
        </div>
      );
    }

    if (linkUrl) {
      const external =
        linkUrl.startsWith("http://") ||
        linkUrl.startsWith("https://") ||
        linkUrl.startsWith("//");

      return (
        <div className={rootClassName}>
          <a
            href={linkUrl}
            className="site-title-dropdown__brand-link"
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {trigger}
          </a>
        </div>
      );
    }

    return <div className={rootClassName}>{trigger}</div>;
  }

  return (
    <div
      ref={rootRef}
      className={buildRootClassName({
        variant,
        flat,
        iconOnly,
        open,
        staticMode: false,
        hasTitleImage,
        chipHidden,
        iconHidden,
        brandLinkRefresh,
      })}
    >
      <div className="site-title-dropdown__shell">
        {brandLinkRefresh ? (
          <div className="site-title-dropdown__trigger site-title-dropdown__trigger--with-refresh">
            <button
              type="button"
              className="site-title-dropdown__brand-refresh-btn"
              aria-label="페이지 새로고침"
              onClick={refreshCurrentPage}
            >
              {brandMark}
            </button>
            {iconOnly ? null : (
              <button
                type="button"
                className="site-title-dropdown__menu-toggle-btn"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuId}
                aria-label={triggerLabel}
                onClick={() => setOpen((prev) => !prev)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="site-title-dropdown__chevron"
                  aria-hidden
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="site-title-dropdown__trigger"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={triggerLabel}
            onClick={() => setOpen((prev) => !prev)}
          >
            {brandMark}
            {iconOnly ? null : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="site-title-dropdown__chevron"
                aria-hidden
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            )}
          </button>
        )}

        {open ? (
          <div id={menuId} role="menu" className="site-title-dropdown__menu">
            {navLinks.map((link) => (
              <DropdownNavItem
                key={`${link.id}-${link.href}`}
                link={link}
                onNavAction={onNavAction}
                onSelect={() => setOpen(false)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
