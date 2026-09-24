"use client";

import { createPortal } from "react-dom";

export type GachaRevealState = {
  stage: "tap" | "burst" | "result";
  name: string;
  imageUrl: string | null;
  gifted: boolean;
  goldAmount: number;
  kind: string;
  idleImageUrl: string | null;
  burstImageUrl: string | null;
  burstSrc: string | null;
};

export function gachaRevealFromPull(
  result: {
    name?: string;
    imageUrl?: string | null;
    gifted?: boolean;
    goldAmount?: number;
    kind?: string;
    fxEnabled?: boolean;
    idleImageUrl?: string | null;
    burstImageUrl?: string | null;
  },
  fallbackName: string,
): GachaRevealState {
  const fxOn = result.fxEnabled !== false && Boolean(result.idleImageUrl || result.burstImageUrl);
  return {
    stage: fxOn ? "tap" : "result",
    name: result.name?.trim() || fallbackName,
    imageUrl: result.imageUrl ?? null,
    gifted: Boolean(result.gifted),
    goldAmount: Number(result.goldAmount) || 0,
    kind: result.kind || "",
    idleImageUrl: result.idleImageUrl ?? null,
    burstImageUrl: result.burstImageUrl ?? null,
    burstSrc: null,
  };
}

type GachaRevealOverlayProps = {
  play: GachaRevealState;
  onChange: (next: GachaRevealState) => void;
  onClose: () => void;
};

export default function GachaRevealOverlay({ play, onChange, onClose }: GachaRevealOverlayProps) {
  if (typeof document === "undefined") {
    return null;
  }
  return createPortal(
    <div className="season-pass-claim-overlay" role="presentation">
      <div
        className="season-pass-gacha"
        role="dialog"
        aria-modal="true"
        aria-label="뽑기"
        onClick={(event) => event.stopPropagation()}
      >
        {play.stage === "tap" ? (
          <>
            <p className="season-pass-gacha__hint">상자를 터치하면 열립니다</p>
            <button
              type="button"
              className="season-pass-gacha__tap"
              onClick={() => {
                const burst = play.burstImageUrl
                  ? `${play.burstImageUrl}${play.burstImageUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
                  : null;
                onChange({ ...play, stage: burst ? "burst" : "result", burstSrc: burst });
                if (burst) {
                  window.setTimeout(() => {
                    onChange({ ...play, stage: "result", burstSrc: burst });
                  }, 1800);
                }
              }}
            >
              {play.idleImageUrl ? <img src={play.idleImageUrl} alt="터치해서 열기" /> : <span>터치</span>}
            </button>
          </>
        ) : null}
        {play.stage === "burst" ? (
          <div className="season-pass-gacha__burst">
            {play.burstSrc ? <img src={play.burstSrc} alt="" /> : null}
          </div>
        ) : null}
        {play.stage === "result" ? (
          <>
            <h3>구입이 완료되었습니다.</h3>
            {play.imageUrl ? <img src={play.imageUrl} alt="" /> : null}
            <p>
              {play.kind === "gold" && play.goldAmount > 0
                ? `${play.name} ${play.goldAmount.toLocaleString("ko-KR")}골드`
                : play.name}
            </p>
            <p className="season-pass-gacha__sub">
              {play.gifted
                ? "상품은 선물함으로 보냈습니다. 선물함에서 받아 주세요."
                : "골드는 바로 지급되었습니다."}
            </p>
            <div className="season-pass-gacha__actions">
              {play.gifted ? (
                <button
                  type="button"
                  className="is-primary"
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new Event("site-season-pass-close"));
                    window.dispatchEvent(new Event("site-gift-inbox-open"));
                  }}
                >
                  선물함 열기
                </button>
              ) : null}
              <button type="button" onClick={onClose}>
                확인
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
