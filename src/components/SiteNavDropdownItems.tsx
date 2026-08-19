"use client";

import Link from "next/link";
import SiteNavMenuItemIcon from "@/components/SiteNavMenuItemIcon";
import { isSiteNavActionHref, type SiteNavLinkItem } from "@/lib/site-nav-links";

function DropdownNavItemLabel({ link }: { link: SiteNavLinkItem }) {
  const menuImageUrl = link.image_url?.trim();

  return (
    <span className="site-title-dropdown__item-inner">
      {menuImageUrl ? (
        <img
          src={menuImageUrl}
          alt=""
          className="site-title-dropdown__item-image"
          width={120}
          height={28}
        />
      ) : (
        <SiteNavMenuItemIcon
          iconUrl={link.icon_url}
          label={link.label}
          href={link.href}
          className="site-title-dropdown__item-icon-wrap"
          imageClassName="site-title-dropdown__item-icon"
          fallbackClassName="site-title-dropdown__item-icon-fallback"
        />
      )}
      <span className="site-title-dropdown__item-label">{link.label}</span>
    </span>
  );
}

function DropdownNavItem({
  link,
  onSelect,
  onNavAction,
}: {
  link: SiteNavLinkItem;
  onSelect: () => void;
  onNavAction?: (href: string) => void;
}) {
  const className = "site-title-dropdown__item";

  function handleClick() {
    onSelect();
    if (isSiteNavActionHref(link.href)) {
      onNavAction?.(link.href);
    }
  }

  if (link.external || link.href.startsWith("http")) {
    return (
      <a
        href={link.href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onSelect}
      >
        <DropdownNavItemLabel link={link} />
      </a>
    );
  }

  if (isSiteNavActionHref(link.href)) {
    return (
      <button type="button" className={className} onClick={handleClick}>
        <DropdownNavItemLabel link={link} />
      </button>
    );
  }

  if (link.href.startsWith("#")) {
    return (
      <a href={link.href} className={className} onClick={onSelect}>
        <DropdownNavItemLabel link={link} />
      </a>
    );
  }

  return (
    <Link href={link.href} className={className} onClick={onSelect}>
      <DropdownNavItemLabel link={link} />
    </Link>
  );
}

export { DropdownNavItem };
