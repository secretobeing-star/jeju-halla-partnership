"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import SiteNavMenuItemIcon from "@/components/SiteNavMenuItemIcon";
import SiteNavTitleDropdown from "@/components/SiteNavTitleDropdown";
import SitePartnerSearch from "@/components/SitePartnerSearch";
import SiteToast from "@/components/SiteToast";
import { useBoardNavNewBadge } from "@/hooks/useBoardNavNewBadge";
import {
  getSiteNavHint,
  getSiteNavNotifyMessage,
  isBoardPopupNavHref,
  isGiftInboxNavHref,
  isSiteNavActionHref,
  resolveSiteNavBrandTitle,
  type SiteNavLinkItem,
} from "@/lib/site-nav-links";
import { buildSiteNavBackgroundDarkOverlayStyle } from "@/lib/site-nav-background";

type SiteTopNavProps = {
  brandIconUrl?: string | null;
  brandLinkUrl?: string | null;
  brandLinkRefresh?: boolean;
  brandTitle?: string | null;
  brandTitleHidden?: boolean;
  brandTitleImageUrl?: string | null;
  brandIconHidden?: boolean;
  brandChipHidden?: boolean;
  headerTitle?: string | null;
  backgroundEnabled?: boolean;
  backgroundImageUrl?: string | null;
  backgroundDarkEnabled?: boolean;
  backgroundDarkOverlayOpacity?: number | null;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchPlaceholder?: string;
  navLinks?: SiteNavLinkItem[];
  dropdownLinks?: SiteNavLinkItem[];
  hintsEnabled?: boolean;
  notifyEnabled?: boolean;
  onNavAction?: (href: string) => void;
  banner?: ReactNode;
  stickyEnabled?: boolean;
  onNavFixedChange?: (fixed: boolean) => void;
  searchInTopNav?: boolean;
  floatingChipsEnabled?: boolean;
  headerActions?: ReactNode;
  /** 제목 줄 오른쪽 — 설정·다크모드 등 */
  menuActions?: ReactNode;
  /** 게시판과 다른 메뉴 칩 사이 — 이벤트 아이콘 등 */
  menuLeading?: ReactNode;
  searchIconToggle?: boolean;
};

type NavLinkItemProps = {
  link: SiteNavLinkItem;
  hintsEnabled: boolean;
  activeHintId: string | null;
  showNewBadge?: boolean;
  badgeLabel?: string;
  onShowHint: (id: string) => void;
  onHideHint: (id: string) => void;
  onActivate: (link: SiteNavLinkItem) => void;
  onNavAction?: (href: string) => void;
};

function NavLinkItem({
  link,
  hintsEnabled,
  activeHintId,
  showNewBadge = false,
  badgeLabel = "N",
  onShowHint,
  onHideHint,
  onActivate,
  onNavAction,
}: NavLinkItemProps) {
  const className =
    "site-top-nav__link inline-flex items-center gap-2.5 whitespace-nowrap text-sm text-gray-700 transition hover:text-emerald-600";

  const hint = getSiteNavHint(link);
  const hintVisible = hintsEnabled && activeHintId === link.id;
  const ariaLabel = showNewBadge ? `${link.label} 새 글` : link.label;

  function handleActivate() {
    onActivate(link);
  }

  const hasCustomVisual = Boolean(link.image_url?.trim() || link.icon_url?.trim());

  const content = link.image_url?.trim() ? (
    <>
      <img
        src={link.image_url.trim()}
        alt=""
        className="site-top-nav__link-image"
        width={120}
        height={32}
      />
      <span className="site-top-nav__link-label">{link.label}</span>
    </>
  ) : (
    <>
      <SiteNavMenuItemIcon
        iconUrl={link.icon_url}
        label={link.label}
        href={link.href}
        className="site-top-nav__link-icon-wrap"
        imageClassName="site-top-nav__link-icon"
        fallbackClassName="site-top-nav__link-icon-fallback"
      />
      <span className="site-top-nav__link-label">{link.label}</span>
    </>
  );

  const interactionProps = hintsEnabled
    ? {
        onMouseEnter: () => onShowHint(link.id),
        onMouseLeave: () => onHideHint(link.id),
        onFocus: () => onShowHint(link.id),
        onBlur: () => onHideHint(link.id),
        "aria-describedby": `site-nav-hint-${link.id}`,
      }
    : {};

  let control: React.ReactNode;

  if (link.external || link.href.startsWith("http")) {
    control = (
      <a
        href={link.href}
        className={className}
        aria-label={ariaLabel}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleActivate}
        {...interactionProps}
      >
        {content}
      </a>
    );
  } else if (isSiteNavActionHref(link.href)) {
    control = (
      <button
        type="button"
        className={className}
        aria-label={ariaLabel}
        onClick={() => {
          handleActivate();
          onNavAction?.(link.href);
        }}
        {...interactionProps}
      >
        {content}
      </button>
    );
  } else if (link.href.startsWith("#")) {
    control = (
      <a
        href={link.href}
        className={className}
        aria-label={ariaLabel}
        onClick={handleActivate}
        {...interactionProps}
      >
        {content}
      </a>
    );
  } else {
    control = (
      <Link
        href={link.href}
        className={className}
        aria-label={ariaLabel}
        onClick={handleActivate}
        {...interactionProps}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={[
        "site-top-nav__link-item group relative",
        hasCustomVisual ? "site-top-nav__link-item--custom-visual" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {control}
      {showNewBadge ? (
        <span className="site-top-nav__new-badge" aria-hidden>
          {badgeLabel}
        </span>
      ) : null}
      {hintsEnabled ? (
        <span
          id={`site-nav-hint-${link.id}`}
          role="tooltip"
          className={[
            "site-top-nav__link-hint pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white shadow-md transition",
            hintVisible
              ? "visible translate-y-0 opacity-100"
              : "invisible translate-y-1 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100",
          ].join(" ")}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export default function SiteTopNav({
  brandIconUrl = null,
  brandLinkUrl = null,
  brandLinkRefresh = false,
  brandTitle = null,
  brandTitleHidden = false,
  brandTitleImageUrl = null,
  brandIconHidden = false,
  brandChipHidden = false,
  headerTitle = null,
  backgroundEnabled = false,
  backgroundImageUrl = null,
  backgroundDarkEnabled = false,
  backgroundDarkOverlayOpacity = null,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder = "업체명, 주소, 혜택으로 검색",
  navLinks = [],
  dropdownLinks = [],
  hintsEnabled = true,
  notifyEnabled = true,
  onNavAction,
  banner = null,
  stickyEnabled = true,
  onNavFixedChange,
  searchInTopNav = true,
  floatingChipsEnabled = false,
  headerActions = null,
  menuActions = null,
  menuLeading = null,
  searchIconToggle = false,
}: SiteTopNavProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const [navFixed, setNavFixed] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeHintId, setActiveHintId] = useState<string | null>(null);
  const [giftPendingCount, setGiftPendingCount] = useState(0);
  const boardNavHasNewPosts = useBoardNavNewBadge(
    navLinks.some((link) => isBoardPopupNavHref(link.href)),
  );

  useEffect(() => {
    function onGiftPending(event: Event) {
      const detail = (event as CustomEvent<{ count?: number }>).detail;
      setGiftPendingCount(
        typeof detail?.count === "number" && Number.isFinite(detail.count)
          ? Math.max(0, Math.floor(detail.count))
          : 0,
      );
    }
    window.addEventListener("site-gift-inbox-pending", onGiftPending);
    return () => window.removeEventListener("site-gift-inbox-pending", onGiftPending);
  }, []);

  const dismissToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  function showHint(id: string) {
    if (!hintsEnabled) {
      return;
    }

    setActiveHintId(id);
  }

  function hideHint(id: string) {
    setActiveHintId((current) => (current === id ? null : current));
  }

  function handleActivate(link: SiteNavLinkItem) {
    const notifyMessage = getSiteNavNotifyMessage(link, notifyEnabled);
    if (notifyMessage) {
      setToastMessage(notifyMessage);
    }

    if (hintsEnabled) {
      setActiveHintId(link.id);
      window.setTimeout(() => {
        setActiveHintId((current) => (current === link.id ? null : current));
      }, 1600);
    }
  }

  const dropdownTitle = resolveSiteNavBrandTitle({
    brandTitle,
    brandTitleHidden,
    headerTitle,
  });
  const titleBrandIconUrl = brandIconUrl?.trim() || null;
  const titleBrandImageUrl = brandTitleHidden ? null : brandTitleImageUrl?.trim() || null;

  const boardNavLinks = navLinks.filter((link) => isBoardPopupNavHref(link.href));
  const inlineNavLinks = navLinks.filter((link) => !isBoardPopupNavHref(link.href));
  const showBackground =
    backgroundEnabled && Boolean(backgroundImageUrl?.trim());

  useEffect(() => {
    if (!stickyEnabled) {
      setNavFixed(false);
      return;
    }

    const navEl = navRef.current;
    if (!navEl) {
      return;
    }

    const updateNavHeight = () => {
      setNavHeight(navEl.offsetHeight);
    };

    updateNavHeight();

    const updatePinned = () => {
      const bannerEl = bannerRef.current;

      if (!bannerEl) {
        setNavFixed(window.scrollY > 0);
        return;
      }

      const bannerHeight = bannerEl.offsetHeight;
      const bannerDisplayed =
        bannerHeight >= 48 &&
        typeof window !== "undefined" &&
        window.getComputedStyle(bannerEl).display !== "none";

      if (!bannerDisplayed) {
        setNavFixed(window.scrollY > 0);
        return;
      }

      const bannerBottom = bannerEl.getBoundingClientRect().bottom;
      setNavFixed(bannerBottom <= 0);
    };

    updatePinned();

    window.addEventListener("scroll", updatePinned, { passive: true });
    window.addEventListener("resize", updatePinned);

    const resizeObserver = new ResizeObserver(() => {
      updateNavHeight();
      updatePinned();
    });
    resizeObserver.observe(navEl);
    if (bannerRef.current) {
      resizeObserver.observe(bannerRef.current);
    }

    return () => {
      window.removeEventListener("scroll", updatePinned);
      window.removeEventListener("resize", updatePinned);
      resizeObserver.disconnect();
    };
  }, [stickyEnabled, banner]);

  useEffect(() => {
    onNavFixedChange?.(stickyEnabled && navFixed);
  }, [navFixed, onNavFixedChange, stickyEnabled]);

  const showNavSearch = searchInTopNav && !(stickyEnabled && navFixed);
  const showNavSpacer = stickyEnabled && navFixed && navHeight > 0;
  const showMenuContent =
    boardNavLinks.length > 0 ||
    inlineNavLinks.length > 0 ||
    showNavSearch ||
    Boolean(menuLeading);
  const showMenuRow = showMenuContent || Boolean(headerActions);
  const showBrandTrailing = Boolean(menuActions);

  const navLinkItemProps = {
    hintsEnabled,
    activeHintId,
    onShowHint: showHint,
    onHideHint: hideHint,
    onActivate: handleActivate,
    onNavAction,
  };

  const navInner = (
    <>
      {showBackground ? (
        <div
          className="site-top-nav__background"
          aria-hidden
          style={{ backgroundImage: `url("${backgroundImageUrl!.trim()}")` }}
        />
      ) : null}
      <div
        className={[
          "site-top-nav__inner",
          headerActions || menuActions ? "site-top-nav__inner--with-header-actions" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="site-top-nav__brand-row">
          <SiteNavTitleDropdown
            title={dropdownTitle}
            titleImageUrl={titleBrandImageUrl}
            iconUrl={titleBrandIconUrl}
            iconHidden={brandIconHidden}
            chipHidden={brandChipHidden}
            brandLinkUrl={brandLinkUrl}
            brandLinkRefresh={brandLinkRefresh}
            navLinks={dropdownLinks}
            onNavAction={onNavAction}
            variant="nav"
            flat={brandChipHidden}
          />
          {showBrandTrailing ? (
            <div className="site-top-nav__brand-trailing">
              <div className="site-top-nav__menu-actions">{menuActions}</div>
            </div>
          ) : null}
        </div>

        {showMenuRow &&
        (boardNavLinks.length > 0 || inlineNavLinks.length > 0 || menuLeading) ? (
          <div className="site-top-nav__divider" aria-hidden />
        ) : null}

        {showMenuRow ? (
          <div className="site-top-nav__menu-row">
            {boardNavLinks.length > 0 || inlineNavLinks.length > 0 || menuLeading ? (
              <div className="site-top-nav__menu-group">
                <nav aria-label="주요 메뉴" className="site-top-nav__links site-top-nav__links--inline">
                  {boardNavLinks.map((link) => (
                    <NavLinkItem
                      key={`${link.label}-${link.href}`}
                      link={link}
                      showNewBadge={boardNavHasNewPosts && isBoardPopupNavHref(link.href)}
                      {...navLinkItemProps}
                    />
                  ))}
                  {menuLeading ? (
                    <div className="site-top-nav__menu-leading">{menuLeading}</div>
                  ) : null}
                  {inlineNavLinks.map((link) => {
                    const giftBadge =
                      isGiftInboxNavHref(link.href) && giftPendingCount > 0;
                    return (
                      <NavLinkItem
                        key={`${link.label}-${link.href}`}
                        link={link}
                        showNewBadge={giftBadge}
                        badgeLabel={
                          giftPendingCount > 9 ? "9+" : String(giftPendingCount)
                        }
                        {...navLinkItemProps}
                      />
                    );
                  })}
                </nav>
              </div>
            ) : null}
            {showNavSearch ? (
              <div className="site-top-nav__search-wrap">
                <SitePartnerSearch
                  iconToggle={searchIconToggle}
                  searchQuery={searchQuery}
                  onSearchQueryChange={onSearchQueryChange}
                  placeholder={searchPlaceholder}
                  inputId="site-partner-search"
                  inputClassName="site-top-nav__search"
                />
              </div>
            ) : null}
            {headerActions ? (
              <div className="site-top-nav__header-actions">{headerActions}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );

  const navClassName = [
    "site-top-nav",
    banner ? " site-top-nav--with-banner" : "",
    showBackground ? " site-top-nav--has-background" : "",
    showBackground && backgroundDarkEnabled ? " site-top-nav--background-dark" : "",
    floatingChipsEnabled ? " site-top-nav--floating-chips" : "",
    stickyEnabled && navFixed ? " site-top-nav--fixed" : "",
    stickyEnabled && !navFixed && !banner ? " site-top-nav--sticky" : "",
  ].join("");

  const navOverlayStyle =
    showBackground && backgroundDarkEnabled
      ? buildSiteNavBackgroundDarkOverlayStyle(backgroundDarkOverlayOpacity)
      : undefined;

  return (
    <>
      <header className="site-page-header">
        {showNavSpacer ? (
          <div
            className="site-top-nav__spacer"
            style={{ height: navHeight }}
            aria-hidden
          />
        ) : null}
        <div
          className={`site-top-nav-shell${banner ? " site-top-nav-shell--with-banner" : ""}`}
        >
          {banner ? (
            <div ref={bannerRef} className="site-top-nav__banner" id="site-header">
              {banner}
            </div>
          ) : null}
          <div ref={navRef} className={navClassName} style={navOverlayStyle}>
            {navInner}
          </div>
        </div>
      </header>
      <SiteToast message={toastMessage} onDismiss={dismissToast} />
    </>
  );
}
