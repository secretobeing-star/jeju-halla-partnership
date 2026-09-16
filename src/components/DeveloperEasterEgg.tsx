"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const TAP_COUNT = 10;
const TAP_WINDOW_MS = 1800;

export const DEVELOPER_EGG_TAP_EVENT = "site-joho-egg-tap";

export function tapDeveloperEasterEgg() {
  window.dispatchEvent(new Event(DEVELOPER_EGG_TAP_EVENT));
}

let developerCreditLogged = false;

export function logDeveloperCredit() {
  if (developerCreditLogged) return;
  developerCreditLogged = true;
  console.log(
    "%c" +
      "  ██╗ ██████╗ ██╗  ██╗ ██████╗      ██████╗        ██████╗ \n" +
      "  ██║██╔═══██╗██║  ██║██╔═══██╗    ██╔═══██╗      ██╔═══██╗\n" +
      "  ██║██║   ██║███████║██║   ██║    ██║   ██║█████╗██║   ██║\n" +
      "  ██║██║   ██║██╔══██║██║   ██║    ██║   ██║╚════╝██║   ██║\n" +
      "████║╚██████╔╝██║  ██║╚██████╔╝    ╚██████╔╝      ╚██████╔╝\n" +
      "╚═══╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝      ╚═════╝        ╚═════╝ \n" +
      "\n%c★ Designed & Built by 김주호 (@joho_o.o)\n" +
      "★ All Rights Reserved. Do not touch this binary.",
    "color: #00ff88; font-family: monospace; font-size: 10px; font-weight: bold;",
    "color: #ffffff; background: #222; font-size: 12px; padding: 4px 8px; border-radius: 4px;",
  );
}

export default function DeveloperEasterEgg() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const win = window as Window & { joho?: () => void };
    win.joho = () => setOpen(true);

    let taps = 0;
    let tapTimer: number | null = null;

    function reveal() {
      setOpen(true);
      taps = 0;
    }

    function onTap() {
      taps += 1;
      if (tapTimer) window.clearTimeout(tapTimer);
      tapTimer = window.setTimeout(() => {
        taps = 0;
      }, TAP_WINDOW_MS);
      if (taps >= TAP_COUNT) {
        reveal();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener(DEVELOPER_EGG_TAP_EVENT, onTap);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      delete win.joho;
      window.removeEventListener(DEVELOPER_EGG_TAP_EVENT, onTap);
      window.removeEventListener("keydown", onKeyDown);
      if (tapTimer) window.clearTimeout(tapTimer);
    };
  }, []);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="개발자 이스터에그"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(8, 8, 16, 0.62)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(96vw, 34rem)",
          borderRadius: "1rem",
          background: "#111",
          padding: "1.1rem 0.9rem 1rem",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
        }}
      >
        <pre
          style={{
            margin: "0 0 0.85rem",
            overflowX: "auto",
            color: "#00ff88",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: "7px",
            fontWeight: 700,
            lineHeight: 1.15,
            textAlign: "left",
          }}
        >
          {`  ██╗ ██████╗ ██╗  ██╗ ██████╗      ██████╗        ██████╗ 
  ██║██╔═══██╗██║  ██║██╔═══██╗    ██╔═══██╗      ██╔═══██╗
  ██║██║   ██║███████║██║   ██║    ██║   ██║█████╗██║   ██║
  ██║██║   ██║██╔══██║██║   ██║    ██║   ██║╚════╝██║   ██║
████║╚██████╔╝██║  ██║╚██████╔╝    ╚██████╔╝      ╚██████╔╝
╚═══╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝      ╚═════╝        ╚═════╝ `}
        </pre>
        <p
          style={{
            margin: 0,
            display: "inline-block",
            borderRadius: "4px",
            background: "#222",
            padding: "4px 8px",
            color: "#fff",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          ★ Designed & Built by 김주호 (@joho_o.o)
          <br />
          ★ All Rights Reserved. Do not touch this binary.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            display: "block",
            width: "100%",
            marginTop: "0.9rem",
            border: 0,
            borderRadius: "0.55rem",
            padding: "0.6rem 0.5rem",
            background: "#00ff88",
            color: "#111",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          닫기
        </button>
      </div>
    </div>,
    document.body,
  );
}
