"use client";

import { useCallback, useState } from "react";
import SiteToast from "@/components/SiteToast";
import { externalLinkAriaLabel } from "@/lib/a11y-labels";
import {
  getFooterSocialHint,
  getFooterSocialNotifyMessage,
  type FooterSocialLinkItem,
} from "@/lib/footer-social-links";

type SiteFooterSocialLinksProps = {
  items: FooterSocialLinkItem[];
  darkBackground?: boolean;
  hintsEnabled?: boolean;
  notifyEnabled?: boolean;
};

export default function SiteFooterSocialLinks({
  items,
  darkBackground = false,
  hintsEnabled = true,
  notifyEnabled = true,
}: SiteFooterSocialLinksProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeHintId, setActiveHintId] = useState<string | null>(null);

  const dismissToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  if (items.length === 0) {
    return null;
  }

  function showHint(id: string) {
    if (!hintsEnabled) {
      return;
    }

    setActiveHintId(id);
  }

  function hideHint(id: string) {
    setActiveHintId((current) => (current === id ? null : current));
  }

  function handleActivate(item: FooterSocialLinkItem) {
    const notifyMessage = getFooterSocialNotifyMessage(item, notifyEnabled);
    if (notifyMessage) {
      setToastMessage(notifyMessage);
    }

    if (hintsEnabled) {
      setActiveHintId(item.id);
      window.setTimeout(() => {
        setActiveHintId((current) => (current === item.id ? null : current));
      }, 1600);
    }
  }

  return (
    <>
      <div className="site-footer-social flex flex-wrap items-center justify-center gap-3 sm:justify-end">
        {items.map((item) => {
          const hint = getFooterSocialHint(item);
          const hintVisible = hintsEnabled && activeHintId === item.id;

          return (
            <div key={item.id} className="site-footer-social-item group relative">
              <a
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                aria-label={externalLinkAriaLabel(item.label, item.external)}
                aria-describedby={hintsEnabled ? `footer-social-hint-${item.id}` : undefined}
                onMouseEnter={() => showHint(item.id)}
                onMouseLeave={() => hideHint(item.id)}
                onFocus={() => showHint(item.id)}
                onBlur={() => hideHint(item.id)}
                onClick={() => handleActivate(item)}
                className={[
                  "site-footer-social-link inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                  hintVisible ? "site-footer-social-link--hint-visible" : "",
                ].join(" ")}
              >
                <img
                  src={item.icon_url!}
                  alt=""
                  className="site-footer-social-icon h-7 w-7 object-contain"
                />
              </a>

              {hintsEnabled ? (
                <span
                  id={`footer-social-hint-${item.id}`}
                  role="tooltip"
                  className={[
                    "site-footer-social-hint pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium shadow-md transition",
                    darkBackground
                      ? "bg-gray-950 text-gray-100 ring-1 ring-gray-700"
                      : "bg-gray-900 text-white",
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
        })}
      </div>

      <SiteToast message={toastMessage} onDismiss={dismissToast} />
    </>
  );
}
