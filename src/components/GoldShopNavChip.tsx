"use client";

import { useCallback, useEffect, useState } from "react";
import { getSiteMemberSession } from "@/lib/site-member-session";
import { requestStudentLoginModal } from "@/lib/site-student-auth-settings";
import { isGoldShopEnabled } from "@/lib/season-pass";
import { useSeasonPassClient } from "@/hooks/useSeasonPassClient";

function CoinIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M9.5 9.5c.7-.8 1.6-1.2 2.5-1.2 1.7 0 3 1 3 2.4 0 3-6 1.6-6 4.4 0 1.4 1.4 2.4 3.2 2.4 1 0 1.9-.4 2.6-1.1" />
    </svg>
  );
}

type GoldShopNavChipProps = {
  hideChip?: boolean;
};

export default function GoldShopNavChip({ hideChip = false }: GoldShopNavChipProps) {
  const client = useSeasonPassClient();
  const shopEnabled = isGoldShopEnabled(client.state.season);

  const openModal = useCallback(() => {
    const id = getSiteMemberSession()?.student?.studentId?.trim() || "";
    if (!id) {
      requestStudentLoginModal();
      return;
    }
    if (!isGoldShopEnabled(client.state.season)) {
      return;
    }
    window.dispatchEvent(new Event("site-gold-shop-open"));
  }, [client.state.season]);

  useEffect(() => {
    void client.load();
  }, [client.load]);

  if (hideChip || !shopEnabled) {
    return null;
  }

  return (
    <div className="site-top-nav__link-item group relative site-top-nav__link-item--custom-visual">
      <button
        type="button"
        className="site-top-nav__link site-events-nav-chip inline-flex items-center gap-2.5"
        onClick={openModal}
        aria-label="골드상점"
      >
        <span className="site-top-nav__link-icon-wrap">
          <span className="site-top-nav__link-icon-fallback text-amber-700">
            <CoinIcon />
          </span>
        </span>
        <span className="site-top-nav__link-label site-top-nav__link-label--sr-only">골드상점</span>
      </button>
    </div>
  );
}
