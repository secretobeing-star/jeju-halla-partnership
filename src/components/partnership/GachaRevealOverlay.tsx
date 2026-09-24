"use client";

import { useEffect, useRef } from "react";
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
  remainingPulls?: number;
  againLabel?: string;
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
    layoutCount?: number;
  },
  box: { id: string; name: string; layout_count?: number },
  options?: { remainingPulls?: number; againLabel?: string },
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
  const burstImageUrl = String(result.burstImageUrl ?? "").trim() || null;
  const fxOn = result.fxEnabled !== false && Boolean(burstImageUrl);
  return {
    stage: fxOn ? "tap" : "result",
    prizes,
    bulkCount: Math.max(1, Number(box.layout_count) || Number(result.layoutCount) || 1),
    boxId: box.id,
    boxName: box.name,
    held: Boolean(result.held),
    gifted: Boolean(result.gifted) || prizes.some((item) => item.gifted),
    fxEnabled: fxOn,
    idleImageUrl: result.idleImageUrl ?? null,
    burstImageUrl,
    burstSrc: burstImageUrl,
    remainingPulls: options?.remainingPulls,
    againLabel: options?.againLabel,
  };
}

type GachaRevealOverlayProps = {
  play: GachaRevealState;
  onChange: (next: GachaRevealState) => void;
  onClose: () => void;
  onPullAgain?: (count: number) => void;
};

export default function GachaRevealOverlay({ play, onChange, onClose, onPullAgain }: GachaRevealOverlayProps) {
  const playRef = useRef(play);
  playRef.current = play;

  useEffect(() => {
    if (play.stage !== "tap" || !play.burstImageUrl) return;
    const img = new Image();
    img.src = play.burstImageUrl;
  }, [play.stage, play.burstImageUrl]);

  useEffect(() => {
    if (play.stage !== "burst") return;
    const burst = play.burstSrc || play.burstImageUrl;
    if (!burst) {
      onChange({ ...playRef.current, stage: "result" });
      return;
    }
    let cancelled = false;
    let timer = 0;
    const finish = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!cancelled) onChange({ ...playRef.current, stage: "result" });
      }, delay);
    };
    const img = new Image();
    img.onload = () => finish(800);
    img.onerror = () => finish(0);
    img.src = burst;
    if (img.complete) {
      img.onload = null;
      finish(img.naturalWidth > 0 ? 800 : 0);
    }
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [play.stage, play.burstSrc, play.burstImageUrl, onChange]);

  if (typeof document === "undefined") {
    return null;
  }
  const bulk = Math.max(2, play.bulkCount);
  const again = play.againLabel?.trim() || "사용";
  const remaining = play.remainingPulls;
  const canAgain = Boolean(onPullAgain) && (remaining == null || remaining >= 1);
  const canBulk = Boolean(onPullAgain) && play.bulkCount > 1 && (remaining == null || remaining >= play.bulkCount);

  return createPortal(
    <div className="season-pass-claim-overlay season-pass-gacha-overlay" role="presentation">
      {play.stage === "result" ? (
        <div className="season-pass-gacha-multi" role="dialog" aria-modal="true" aria-label="뽑기 결과">
          <div className="season-pass-gacha-multi__glow" aria-hidden />
          <ul className="season-pass-gacha-multi__prizes">
            {play.prizes.map((prize, index) => (
              <li key={`${prize.name}-${index}`} className={`is-${prize.kind || "item"}`}>
                <span className="season-pass-gacha-multi__art">
                  {prize.imageUrl ? (
                    <img src={prize.imageUrl} alt="" />
                  ) : (
                    <span>
                      {prize.kind === "gold" && prize.goldAmount > 0
                        ? prize.goldAmount.toLocaleString("ko-KR")
                        : prize.name.slice(0, 1)}
                    </span>
                  )}
                </span>
                <strong>{prize.name.trim() || play.boxName}</strong>
                <em>
                  {prize.kind === "gold"
                    ? `골드 ${Math.max(0, prize.goldAmount).toLocaleString("ko-KR")}개`
                    : prize.kind === "coupon"
                      ? "쿠폰"
                      : "코스튬"}
                  {prize.gifted ? " · 선물함 지급" : ""}
                </em>
              </li>
            ))}
          </ul>
          <div className="season-pass-gacha-multi__actions">
            {canAgain ? (
              <>
                <button type="button" className="is-use" onClick={() => onPullAgain?.(1)}>
                  1개 {again}
                </button>
                {canBulk ? (
                  <button type="button" className="is-use" onClick={() => onPullAgain?.(bulk)}>
                    {bulk}개 {again}
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
                  if (!play.burstImageUrl) {
                    onChange({ ...play, stage: "result" });
                    return;
                  }
                  onChange({ ...play, stage: "burst", burstSrc: play.burstImageUrl });
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
