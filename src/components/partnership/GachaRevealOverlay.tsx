"use client";

import { createPortal } from "react-dom";

export type GachaPrizeView = {
  name: string;
  imageUrl: string | null;
  kind: string;
  goldAmount: number;
  gifted: boolean;
};

export type GachaRevealState = {
  stage: "tap" | "burst" | "result";
  prizes: GachaPrizeView[];
  bulkCount: number;
  boxId: string;
  boxName: string;
  held: boolean;
  gifted: boolean;
  fxEnabled: boolean;
  idleImageUrl: string | null;
  burstImageUrl: string | null;
  burstSrc: string | null;
};

export function gachaRevealFromPull(
  result: {
    prizes?: GachaPrizeView[];
    name?: string;
    imageUrl?: string | null;
    gifted?: boolean;
    goldAmount?: number;
    kind?: string;
    fxEnabled?: boolean;
    idleImageUrl?: string | null;
    burstImageUrl?: string | null;
    held?: boolean;
    count?: number;
  },
  box: { id: string; name: string; layout_count?: number },
): GachaRevealState {
  const prizes =
    result.prizes && result.prizes.length > 0
      ? result.prizes
      : [
          {
            name: result.name?.trim() || box.name,
            imageUrl: result.imageUrl ?? null,
            kind: result.kind || "",
            goldAmount: Number(result.goldAmount) || 0,
            gifted: Boolean(result.gifted),
          },
        ];
  const fxOn = result.fxEnabled !== false && Boolean(result.idleImageUrl || result.burstImageUrl);
  return {
    stage: fxOn ? "tap" : "result",
    prizes,
    bulkCount: Math.max(1, Number(box.layout_count) || Number(result.count) || 1),
    boxId: box.id,
    boxName: box.name,
    held: Boolean(result.held),
    gifted: Boolean(result.gifted) || prizes.some((item) => item.gifted),
    fxEnabled: fxOn,
    idleImageUrl: result.idleImageUrl ?? null,
    burstImageUrl: result.burstImageUrl ?? null,
    burstSrc: null,
  };
}

type GachaRevealOverlayProps = {
  play: GachaRevealState;
  onChange: (next: GachaRevealState) => void;
  onClose: () => void;
  onPullAgain?: (count: number) => void;
};

export default function GachaRevealOverlay({ play, onChange, onClose, onPullAgain }: GachaRevealOverlayProps) {
  if (typeof document === "undefined") {
    return null;
  }
  const bulk = Math.max(2, play.bulkCount);
  return createPortal(
    <div className="season-pass-claim-overlay season-pass-gacha-overlay" role="presentation">
      {play.stage === "result" ? (
        <div className="season-pass-gacha-multi" role="dialog" aria-modal="true" aria-label="뽑기 결과">
          <div className="season-pass-gacha-multi__glow" aria-hidden />
          <ul className="season-pass-gacha-multi__prizes">
            {play.prizes.map((prize, index) => (
              <li key={`${prize.name}-${index}`} className={`is-${prize.kind || "item"}`}>
                {prize.imageUrl ? <img src={prize.imageUrl} alt="" /> : <span>{prize.name.slice(0, 1)}</span>}
              </li>
            ))}
          </ul>
          <div className="season-pass-gacha-multi__actions">
            {onPullAgain ? (
              <>
                <button type="button" className="is-use" onClick={() => onPullAgain(1)}>
                  1개 사용
                </button>
                {play.bulkCount > 1 ? (
                  <button type="button" className="is-use" onClick={() => onPullAgain(bulk)}>
                    {bulk}개 사용
                  </button>
                ) : null}
              </>
            ) : null}
            <button type="button" className="is-ok" onClick={onClose}>
              확인
            </button>
          </div>
        </div>
      ) : (
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
                    }, 1400);
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
        </div>
      )}
    </div>,
    document.body,
  );
}
