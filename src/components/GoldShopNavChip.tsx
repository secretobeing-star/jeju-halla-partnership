"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAppBackHandler } from "@/lib/app-back-stack";
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
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const client = useSeasonPassClient();
  const price = client.state.season?.premium_gold_price ?? 0;
  const gold = client.state.progress?.gold ?? 0;
  const shopEnabled = isGoldShopEnabled(client.state.season);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openModal = useCallback(() => {
    const id = getSiteMemberSession()?.student?.studentId?.trim() || "";
    if (!id) {
      requestStudentLoginModal();
      return;
    }
    if (!isGoldShopEnabled(client.state.season)) {
      return;
    }
    setOpen(true);
    void client.load();
  }, [client]);

  useEffect(() => {
    function onOpen() {
      openModal();
    }
    window.addEventListener("site-gold-shop-open", onOpen);
    return () => window.removeEventListener("site-gold-shop-open", onOpen);
  }, [openModal]);

  const close = useCallback(() => setOpen(false), []);
  useAppBackHandler(open, close, "gold-shop-modal");

  const modal =
    mounted && open
      ? createPortal(
          <div className="site-event-overlay" onClick={close}>
            <div
              className="site-event-dialog gold-shop-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="골드 상점"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="site-event-dialog__header">
                <h2 className="site-event-dialog__title">골드 상점</h2>
                <button type="button" className="site-event-close" onClick={close} aria-label="닫기">
                  ×
                </button>
              </div>
              <div className="site-event-tab-body">
                <p className="gold-shop__balance">보유 골드 {gold}</p>
                <div className="gold-shop__card">
                  <p className="gold-shop__name">프리미엄 패스</p>
                  <p className="gold-shop__price">{price > 0 ? `${price} 골드` : "판매가가 아직 없습니다"}</p>
                  {client.state.isPremium ? (
                    <p className="gold-shop__owned">보유 중</p>
                  ) : (
                    <button
                      type="button"
                      className="gold-shop__buy"
                      disabled={client.busy !== null || price <= 0}
                      onClick={() => void client.buyPremium()}
                    >
                      구입
                    </button>
                  )}
                </div>
                {client.message ? <p className="gold-shop__msg">{client.message}</p> : null}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {hideChip || !shopEnabled ? null : (
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
      )}
      {modal}
    </>
  );
}
