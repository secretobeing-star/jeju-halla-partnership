"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAppBackHandler } from "@/lib/app-back-stack";
import { getSiteMemberSession } from "@/lib/site-member-session";
import { requestStudentLoginModal } from "@/lib/site-student-auth-settings";
import { useSeasonPassClient } from "@/hooks/useSeasonPassClient";
import SeasonPassModalBody from "@/components/partnership/SeasonPassModal";

function TicketIcon({ className = "h-5 w-5" }: { className?: string }) {
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
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4z" />
      <path d="M9 7v10" />
    </svg>
  );
}

type SeasonPassNavChipProps = {
  hideChip?: boolean;
};

export default function SeasonPassNavChip({ hideChip = false }: SeasonPassNavChipProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"pass" | "quest">("pass");
  const client = useSeasonPassClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const openModal = useCallback(() => {
    const id = getSiteMemberSession()?.student?.studentId?.trim() || "";
    if (!id) {
      requestStudentLoginModal();
      return;
    }
    setTab("pass");
    setOpen(true);
    void client.load();
  }, [client]);

  useEffect(() => {
    function onOpen() {
      openModal();
    }
    window.addEventListener("site-season-pass-open", onOpen);
    return () => window.removeEventListener("site-season-pass-open", onOpen);
  }, [openModal]);

  const close = useCallback(() => setOpen(false), []);
  useAppBackHandler(open, close, "season-pass-modal");

  const modal =
    mounted && open
      ? createPortal(
          <div className="site-event-overlay season-pass-kart-overlay" onClick={close}>
            <div
              className="season-pass-kart-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="시즌패스"
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" className="season-pass-kart__close" onClick={close} aria-label="닫기">
                ×
              </button>
              <SeasonPassModalBody client={client} tab={tab} onTabChange={setTab} />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {hideChip ? null : (
        <div className="site-top-nav__link-item group relative site-top-nav__link-item--custom-visual">
          <button
            type="button"
            className="site-top-nav__link site-events-nav-chip inline-flex items-center gap-2.5"
            onClick={openModal}
            aria-label="시즌패스"
          >
            <span className="site-top-nav__link-icon-wrap">
              <span className="site-top-nav__link-icon-fallback text-emerald-700">
                <TicketIcon />
              </span>
            </span>
            <span className="site-top-nav__link-label site-top-nav__link-label--sr-only">시즌패스</span>
          </button>
        </div>
      )}
      {modal}
    </>
  );
}
