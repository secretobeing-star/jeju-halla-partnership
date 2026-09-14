"use client";

import type { RewardItem, SeasonPassTrack, SeasonPassWidgetState } from "@/lib/season-pass";
import { seasonPassQuestTypeLabel } from "@/lib/season-pass";
import { useSeasonPassClient } from "@/hooks/useSeasonPassClient";

function remainingDays(endsAt: string | null) {
  if (!endsAt) return null;
  const ms = Date.parse(endsAt) - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function rewardQty(reward?: RewardItem | null) {
  if (!reward) return 0;
  return Math.max(0, Number(reward.metadata.gold_amount ?? reward.metadata.amount ?? 0));
}

function RewardCell({
  reward,
  claimed,
  reached,
  locked,
  busy,
  hideText,
  onClaim,
}: {
  reward?: RewardItem | null;
  claimed: boolean;
  reached: boolean;
  locked: boolean;
  busy: boolean;
  hideText: boolean;
  onClaim: () => void;
}) {
  if (!reward) {
    return <div className="season-pass-kart__cell season-pass-kart__cell--empty" />;
  }
  const qty = rewardQty(reward);
  const showName = !hideText && !reward.image_url;
  return (
    <div className={`season-pass-kart__cell ${claimed ? "is-claimed" : ""} ${reached && !claimed ? "is-ready" : ""}`}>
      {reward.image_url ? (
        <img src={reward.image_url} alt="" className="season-pass-kart__reward-img" />
      ) : showName ? (
        <span className="season-pass-kart__reward-name">{reward.name}</span>
      ) : (
        <span className="season-pass-kart__reward-spacer" aria-hidden />
      )}
      {qty > 0 && !hideText ? <span className="season-pass-kart__qty">{qty}개</span> : null}
      {claimed ? (
        <span className="season-pass-kart__check" aria-hidden>
          ✓
        </span>
      ) : (
        <button
          type="button"
          className="season-pass-kart__claim"
          disabled={!reached || locked || busy}
          onClick={onClaim}
        >
          {locked ? "잠김" : "받기"}
        </button>
      )}
    </div>
  );
}

export default function SeasonPassModalBody({
  client,
  tab,
  onTabChange,
}: {
  client: ReturnType<typeof useSeasonPassClient>;
  tab: "pass" | "quest";
  onTabChange: (tab: "pass" | "quest") => void;
}) {
  const { userId, state, busy, message, percent, claim, claimAll, checkIn } = client;
  const season = state.season;
  const hideSeasonText = Boolean(season?.ui_image_url || season?.bg_image_url || season?.track_image_url);
  const days = remainingDays(season?.ends_at ?? null);
  const lastLevel = state.levels[state.levels.length - 1] ?? null;
  const nextLevel = Math.min(lastLevel?.level ?? state.currentLevel, state.currentLevel + 1);

  if (!season) {
    return <p className="season-pass-kart__empty">진행 중인 시즌패스가 없습니다.</p>;
  }

  const hasBannerImages = Boolean(season.ui_image_url || season.premium_badge_url || season.track_image_url);

  return (
    <div
      className={`season-pass-kart ${hideSeasonText ? "has-images" : ""}`}
      style={
        season.bg_image_url
          ? {
              backgroundImage: `linear-gradient(180deg, rgba(8,18,40,0.55), rgba(8,18,40,0.82)), url(${JSON.stringify(season.bg_image_url)})`,
            }
          : undefined
      }
    >
      <div className="season-pass-kart__banners">
        {season.ui_image_url ? <img src={season.ui_image_url} alt="" /> : null}
        {season.premium_badge_url ? <img src={season.premium_badge_url} alt="" /> : null}
        {season.track_image_url ? <img src={season.track_image_url} alt="" /> : null}
        {!hasBannerImages && !hideSeasonText ? (
          <div className="season-pass-kart__banner-fallback">{season.title}</div>
        ) : null}
      </div>

      <div className="season-pass-kart__tabs">
        <button type="button" className={tab === "pass" ? "is-active" : ""} onClick={() => onTabChange("pass")}>
          시즌패스
        </button>
        <button type="button" className={tab === "quest" ? "is-active" : ""} onClick={() => onTabChange("quest")}>
          제휴 퀘스트
        </button>
        {days != null ? (
          <span className="season-pass-kart__remain">
            남은 기간
            <strong>
              {days}
              <em>일</em>
            </strong>
          </span>
        ) : null}
      </div>

      {tab === "quest" ? (
        <div className="season-pass-kart__quests">
          <button
            type="button"
            className="season-pass-kart__attend"
            disabled={!userId || state.attendedToday || busy !== null}
            onClick={() => void checkIn()}
          >
            {state.attendedToday ? "오늘 출석 완료" : "출석 체크"}
          </button>
          {state.quests.length === 0 ? (
            <p>등록된 퀘스트가 없습니다.</p>
          ) : (
            <ul>
              {state.quests.map((quest) => (
                <li key={quest.id}>
                  {seasonPassQuestTypeLabel(quest.quest_type)} · {quest.title} ({quest.progress}/{quest.target_count})
                  {quest.is_completed ? " 완료" : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="season-pass-kart__progress">
            <span className="season-pass-kart__lv">LV {userId ? state.currentLevel : "-"}</span>
            <div className="season-pass-kart__bar-wrap">
              <div className="season-pass-kart__bar">
                <div style={{ width: `${userId ? percent : 0}%` }} />
              </div>
              <p>
                {userId
                  ? `필요한 패스 포인트 ${state.expIntoLevel} / ${state.expForLevel}`
                  : "로그인 후 진행도가 표시됩니다"}
              </p>
            </div>
            <span className="season-pass-kart__lv">LV {userId ? nextLevel : "-"}</span>
            <span className="season-pass-kart__gold">골드 {state.progress?.gold ?? 0}</span>
          </div>

          <div className="season-pass-kart__board">
            <div className="season-pass-kart__level-labels">
              <div className="season-pass-kart__side-spacer" />
              {state.levels.map((level, index) => (
                <div
                  key={`label-${level.id}`}
                  className={`season-pass-kart__lv-tag ${state.currentLevel === level.level ? "is-now" : ""} ${
                    index === state.levels.length - 1 ? "is-final" : ""
                  }`}
                >
                  {index === state.levels.length - 1
                    ? `최종 보상 [LV ${level.level}]`
                    : `LV ${level.level}`}
                </div>
              ))}
            </div>
            <div className="season-pass-kart__track">
              <div className="season-pass-kart__collect">
                <button type="button" disabled={busy !== null} onClick={() => void claimAll("free")}>
                  보상 모두 받기
                </button>
              </div>
              <TrackRow
                state={state}
                userId={userId}
                track="free"
                busy={busy !== null}
                hideText={hideSeasonText}
                onClaim={claim}
              />
            </div>
            <div className="season-pass-kart__track">
              <div className="season-pass-kart__collect season-pass-kart__collect--premium">
                <button
                  type="button"
                  disabled={busy !== null || !state.isPremium}
                  onClick={() => void claimAll("premium")}
                >
                  보상 모두 받기
                </button>
              </div>
              <TrackRow
                state={state}
                userId={userId}
                track="premium"
                busy={busy !== null}
                hideText={hideSeasonText}
                onClaim={claim}
              />
            </div>
          </div>
        </>
      )}
      {message ? <p className="season-pass-kart__msg">{message}</p> : null}
    </div>
  );
}

function TrackRow({
  state,
  userId,
  track,
  busy,
  hideText,
  onClaim,
}: {
  state: SeasonPassWidgetState;
  userId: string;
  track: SeasonPassTrack;
  busy: boolean;
  hideText: boolean;
  onClaim: (level: number, track: SeasonPassTrack) => void | Promise<void>;
}) {
  const lastId = state.levels[state.levels.length - 1]?.id;
  return (
    <div className={`season-pass-kart__row season-pass-kart__row--${track}`}>
      {state.levels.map((level) => {
        const isFinal = level.id === lastId;
        const reward = track === "premium" ? level.premium_reward : level.free_reward;
        const claimed = state.claims.some((claim) => claim.level === level.level && claim.track === track);
        const reached = Boolean(userId) && state.currentLevel >= level.level;
        const locked = track === "premium" && !state.isPremium;
        return (
          <div key={`${track}-${level.id}`} className={isFinal ? "is-final-cell" : ""}>
            <RewardCell
              reward={reward}
              claimed={claimed}
              reached={reached}
              locked={locked}
              busy={busy}
              hideText={hideText}
              onClaim={() => void onClaim(level.level, track)}
            />
          </div>
        );
      })}
    </div>
  );
}
