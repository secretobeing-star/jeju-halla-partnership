"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export type GachaPrizeView = {
  name: string;
  imageUrl: string | null;
  kind: string;
  goldAmount: number;
  gifted: boolean;
  rareRank?: number;
};

export type GachaRevealState = {
  stage: "wait" | "tap" | "burst" | "result";
  prizes: GachaPrizeView[];
  bulkCount: number;
  boxId: string;
  boxName: string;
  held: boolean;
  gifted: boolean;
  fxEnabled: boolean;
  idleImageUrl: string | null;
  burstImageUrl: string | null;
  rare1FxUrl: string | null;
  rare2FxUrl: string | null;
  burstSrc: string | null;
  remainingPulls?: number;
  againLabel?: string;
};

function gachaFxUrls(source: {
  rare1_fx_url?: string | null;
  rare2_fx_url?: string | null;
  rare1FxUrl?: string | null;
  rare2FxUrl?: string | null;
}) {
  return {
    rare1FxUrl: String(source.rare1FxUrl ?? source.rare1_fx_url ?? "").trim() || null,
    rare2FxUrl: String(source.rare2FxUrl ?? source.rare2_fx_url ?? "").trim() || null,
  };
}

function sparkUrlForRank(play: Pick<GachaRevealState, "rare1FxUrl" | "rare2FxUrl">, rank?: number) {
  if (rank === 1) return play.rare1FxUrl || play.rare2FxUrl;
  if (rank === 2) return play.rare2FxUrl || play.rare1FxUrl;
  return null;
}

export function gachaRevealOpening(
  box: {
    id: string;
    name: string;
    layout_count?: number;
    fx_enabled?: boolean;
    idle_image_url?: string | null;
    burst_image_url?: string | null;
    rare1_fx_url?: string | null;
    rare2_fx_url?: string | null;
  },
  options?: { remainingPulls?: number; againLabel?: string },
): GachaRevealState {
  const burstImageUrl = String(box.burst_image_url ?? "").trim() || null;
  const fxOn = box.fx_enabled !== false && Boolean(burstImageUrl);
  return {
    stage: fxOn ? "tap" : "wait",
    prizes: [],
    bulkCount: Math.max(1, Number(box.layout_count) || 1),
    boxId: box.id,
    boxName: box.name,
    held: false,
    gifted: false,
    fxEnabled: fxOn,
    idleImageUrl: box.idle_image_url ?? null,
    burstImageUrl,
    ...gachaFxUrls(box),
    burstSrc: burstImageUrl,
    remainingPulls: options?.remainingPulls,
    againLabel: options?.againLabel,
  };
}

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
    rare1FxUrl?: string | null;
    rare2FxUrl?: string | null;
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
            rareRank: 0,
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
    ...gachaFxUrls(result),
    burstSrc: burstImageUrl,
    remainingPulls: options?.remainingPulls,
    againLabel: options?.againLabel,
  };
}

export function applyGachaPullResult(current: GachaRevealState | null, next: GachaRevealState): GachaRevealState {
  if (!current) {
    return { ...next, stage: next.fxEnabled ? "tap" : "result" };
  }
  if (current.stage === "tap" || current.stage === "burst") {
    return {
      ...current,
      prizes: next.prizes,
      gifted: next.gifted,
      remainingPulls: next.remainingPulls,
      bulkCount: next.bulkCount,
      againLabel: next.againLabel ?? current.againLabel,
      rare1FxUrl: next.rare1FxUrl ?? current.rare1FxUrl,
      rare2FxUrl: next.rare2FxUrl ?? current.rare2FxUrl,
    };
  }
  return { ...next, stage: "result" };
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
  const rareHit = play.prizes.some((item) => item.rareRank === 1 || item.rareRank === 2);
  const rareTop = play.prizes.some((item) => item.rareRank === 1);

  function skipFx() {
    const current = playRef.current;
    onChange({ ...current, stage: current.prizes.length > 0 ? "result" : "wait" });
  }

  useEffect(() => {
    if (play.stage !== "tap" || !play.burstImageUrl) return;
    const img = new Image();
    img.src = play.burstImageUrl;
  }, [play.stage, play.burstImageUrl]);

  useEffect(() => {
    if (play.stage !== "burst") return;
    const burst = play.burstSrc || play.burstImageUrl;
    if (!burst) {
      onChange({ ...playRef.current, stage: playRef.current.prizes.length > 0 ? "result" : "wait" });
      return;
    }
    let cancelled = false;
    let timer = 0;
    const finish = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (cancelled) return;
        const current = playRef.current;
        if (current.prizes.length === 0) {
          onChange({ ...current, stage: "wait" });
          return;
        }
        onChange({ ...current, stage: "result" });
      }, delay);
    };
    const rare = playRef.current.prizes.some((item) => item.rareRank === 1 || item.rareRank === 2);
    const top = playRef.current.prizes.some((item) => item.rareRank === 1);
    const playMs = rare ? (top ? 1400 : 1100) : 800;
    const img = new Image();
    img.onload = () => finish(playRef.current.prizes.length > 0 ? playMs : 0);
    img.onerror = () => finish(0);
    img.src = burst;
    if (img.complete) {
      img.onload = null;
      finish(img.naturalWidth > 0 && playRef.current.prizes.length > 0 ? playMs : 0);
    }
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [play.stage, play.burstSrc, play.burstImageUrl, onChange]);

  useEffect(() => {
    if (play.stage === "wait" && play.prizes.length > 0) {
      onChange({ ...play, stage: "result" });
    }
  }, [play, onChange]);
  const bulk = Math.max(2, play.bulkCount);
  const again = play.againLabel?.trim() || "사용";
  const remaining = play.remainingPulls;
  const canAgain = Boolean(onPullAgain) && (remaining == null || remaining >= 1);
  const canBulk = Boolean(onPullAgain) && play.bulkCount > 1 && (remaining == null || remaining >= play.bulkCount);

  return createPortal(
    <div
      className={`season-pass-claim-overlay season-pass-gacha-overlay${play.stage === "result" ? " is-result" : ""}`}
      role="presentation"
    >
      {play.stage === "result" ? (
        <div className="season-pass-gacha-multi" role="dialog" aria-modal="true" aria-label="뽑기 결과">
          <div className="season-pass-gacha-multi__glow" aria-hidden />
          <ul className="season-pass-gacha-multi__prizes">
            {play.prizes.map((prize, index) => {
              const sparkUrl = sparkUrlForRank(play, prize.rareRank);
              return (
              <li
                key={`${prize.name}-${index}`}
                className={`is-${prize.kind || "item"}${prize.rareRank === 1 ? " is-rare-1" : prize.rareRank === 2 ? " is-rare-2" : ""}`}
              >
                <span className="season-pass-gacha-multi__art">
                  {prize.rareRank === 1 || prize.rareRank === 2 ? (
                    sparkUrl ? (
                      <img className="season-pass-gacha-multi__fx" src={sparkUrl} alt="" />
                    ) : (
                      <i className="season-pass-gacha-multi__spark" aria-hidden />
                    )
                  ) : null}
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
              );
            })}
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
          className={`season-pass-gacha${rareHit ? " is-rare" : ""}${rareTop ? " is-rare-top" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="뽑기"
          onClick={(event) => event.stopPropagation()}
        >
          {play.stage === "wait" ? (
            <>
              <p className="season-pass-gacha__hint">뽑는 중...</p>
              <div className="season-pass-gacha__tap">
                {play.idleImageUrl ? <img src={play.idleImageUrl} alt="" /> : <span>뽑는 중</span>}
              </div>
            </>
          ) : null}
          {play.stage === "tap" ? (
            <>
              <p className="season-pass-gacha__hint">상자를 터치하면 열립니다</p>
              <button
                type="button"
                className="season-pass-gacha__tap"
                onClick={() => {
                  if (!play.burstImageUrl) {
                    skipFx();
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
            <div className={`season-pass-gacha__burst${rareHit ? " is-spark" : ""}`}>
              {rareHit ? <i className="season-pass-gacha__sparkle" aria-hidden /> : null}
              {play.burstSrc ? <img src={play.burstSrc} alt="" /> : null}
            </div>
          ) : null}
          {play.stage === "tap" || play.stage === "burst" ? (
            <button type="button" className="season-pass-gacha__skip" onClick={skipFx}>
              스킵
            </button>
          ) : null}
        </div>
      )}
    </div>,
    document.body,
  );
}

