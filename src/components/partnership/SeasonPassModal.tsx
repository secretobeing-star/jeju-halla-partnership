"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { GoldShopItem, RewardItem, SeasonPassTrack, SeasonPassWidgetState } from "@/lib/season-pass";
import { isGoldShopEnabled, seasonPassQuestTypeLabel } from "@/lib/season-pass";
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
  goldIconUrl,
  checkImageUrl,
  onClaim,
}: {
  reward?: RewardItem | null;
  claimed: boolean;
  reached: boolean;
  locked: boolean;
  busy: boolean;
  hideText: boolean;
  goldIconUrl?: string | null;
  checkImageUrl?: string | null;
  onClaim: () => void;
}) {
  if (!reward) {
    return <div className="season-pass-kart__cell season-pass-kart__cell--empty" />;
  }
  const qty = rewardQty(reward);
  const imageUrl = reward.image_url || (reward.item_type === "gold" ? goldIconUrl : null) || null;
  const isCostume = reward.item_type === "costume";
  const showName = isCostume
    ? Boolean(reward.name.trim())
    : !hideText && !imageUrl;
  const showQty = qty > 0 && (reward.item_type === "gold" || !hideText);
  return (
    <div className={`season-pass-kart__cell ${claimed ? "is-claimed" : ""} ${reached && !claimed ? "is-ready" : ""}`}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="season-pass-kart__reward-img" />
      ) : showName ? null : (
        <span className="season-pass-kart__reward-spacer" aria-hidden />
      )}
      {showName ? (
        <span className={`season-pass-kart__reward-name ${isCostume ? "is-costume" : ""}`}>
          {reward.name}
        </span>
      ) : null}
      {showQty ? (
        <span className={`season-pass-kart__qty ${reward.item_type === "gold" ? "is-gold" : ""}`}>{qty}개</span>
      ) : null}
      {claimed ? (
        checkImageUrl ? (
          <img src={checkImageUrl} alt="" className="season-pass-kart__check-img" />
        ) : (
          <span className="season-pass-kart__check" aria-hidden>
            ✓
          </span>
        )
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
  tab: "pass" | "quest" | "shop";
  onTabChange: (tab: "pass" | "quest" | "shop") => void;
}) {
  const { userId, state, busy, message, percent, claim, claimAll, claimPopup, clearClaimPopup } = client;
  const season = state.season;
  const passEnabled = Boolean(state.passEnabled);
  const shopEnabled = isGoldShopEnabled(season) || state.shopItems.length > 0;
  const hideSeasonText = Boolean(season?.ui_image_url || season?.bg_image_url || season?.track_image_url);
  const days = passEnabled ? remainingDays(season?.ends_at ?? null) : null;
  const lastLevel = state.levels[state.levels.length - 1] ?? null;
  const nextLevel = Math.min(lastLevel?.level ?? state.currentLevel, state.currentLevel + 1);

  if (!season) {
    return <p className="season-pass-kart__empty">진행 중인 시즌패스가 없습니다.</p>;
  }

  const hasBannerImages = Boolean(season.ui_image_url || season.premium_badge_url || season.track_image_url);

  return (
    <div
      className={`season-pass-kart ${hideSeasonText ? "has-images" : ""} ${tab !== "pass" ? "is-chrome-top" : ""}`}
      style={
        season.bg_image_url
          ? {
              backgroundImage: `linear-gradient(180deg, rgba(8,18,40,0.55), rgba(8,18,40,0.82)), url(${JSON.stringify(season.bg_image_url)})`,
            }
          : undefined
      }
    >
      {tab === "pass" && passEnabled ? (
      <div className="season-pass-kart__banners">
        {season.ui_image_url ? <img src={season.ui_image_url} alt="" /> : null}
        {season.premium_badge_url ? <img src={season.premium_badge_url} alt="" /> : null}
        {season.track_image_url ? <img src={season.track_image_url} alt="" /> : null}
        {!hasBannerImages && !hideSeasonText ? (
          <div className="season-pass-kart__banner-fallback">{season.title}</div>
        ) : null}
      </div>
      ) : null}

      <div className="season-pass-kart__tabs">
        <button type="button" className={tab === "pass" ? "is-active" : ""} onClick={() => onTabChange("pass")}>
          시즌패스
        </button>
        <button type="button" className={tab === "quest" ? "is-active" : ""} onClick={() => onTabChange("quest")}>
          제휴 퀘스트
        </button>
        {shopEnabled ? (
          <button type="button" className={tab === "shop" ? "is-active" : ""} onClick={() => onTabChange("shop")}>
            골드 상점
          </button>
        ) : null}
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
        passEnabled ? (
          <QuestBoard
            client={client}
            onGoPass={() => onTabChange("pass")}
          />
        ) : (
          <p className="season-pass-kart__empty">진행 중인 시즌패스가 없습니다.</p>
        )
      ) : tab === "shop" && shopEnabled ? (
        <GoldShopBoard client={client} />
      ) : passEnabled ? (
        <>
          <div className="season-pass-kart__progress">
            <span className="season-pass-kart__lv season-pass-kart__lv--from">
              LV {userId ? state.currentLevel : "-"}
            </span>
            <div className="season-pass-kart__bar-wrap">
              <div className="season-pass-kart__bar">
                <div style={{ width: `${userId ? percent : 0}%` }} />
              </div>
              <div className="season-pass-kart__meta">
                <p>
                  {userId
                    ? `필요한 패스 포인트 ${state.expIntoLevel} / ${state.expForLevel}`
                    : "로그인 후 진행도가 표시됩니다"}
                </p>
                <span className="season-pass-kart__gold">골드 {state.progress?.gold ?? 0}</span>
              </div>
            </div>
            <span className="season-pass-kart__lv season-pass-kart__lv--to">
              LV {userId ? nextLevel : "-"}
            </span>
          </div>

          <div className="season-pass-kart__board">
            <div
              className="season-pass-kart__level-labels"
              style={{
                gridTemplateColumns: `6.6rem repeat(${Math.max(1, state.levels.length)}, minmax(5.8rem, 1fr)) 6.6rem`,
              }}
            >
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
              <div className="season-pass-kart__side-spacer" />
            </div>
            <div
              className="season-pass-kart__track"
              style={{
                gridTemplateColumns: `6.6rem repeat(${Math.max(1, state.levels.length)}, minmax(5.8rem, 1fr)) 6.6rem`,
              }}
            >
              <TrackName imageUrl={season.free_pass_image_url} label="일반 패스" />
              <TrackRow
                state={state}
                userId={userId}
                track="free"
                busy={busy !== null}
                hideText={hideSeasonText}
                goldIconUrl={season.gold_icon_url}
                checkImageUrl={season.claimed_check_image_url}
                onClaim={claim}
              />
              <div className="season-pass-kart__collect">
                <button type="button" disabled={busy !== null} onClick={() => void claimAll("free")}>
                  보상 모두 받기
                </button>
              </div>
            </div>
            <div
              className="season-pass-kart__track"
              style={{
                gridTemplateColumns: `6.6rem repeat(${Math.max(1, state.levels.length)}, minmax(5.8rem, 1fr)) 6.6rem`,
              }}
            >
              <TrackName
                imageUrl={season.premium_pass_image_url}
                label="프리미엄 패스"
                premium
              />
              <TrackRow
                state={state}
                userId={userId}
                track="premium"
                busy={busy !== null}
                hideText={hideSeasonText}
                goldIconUrl={season.gold_icon_url}
                checkImageUrl={season.claimed_check_image_url}
                onClaim={claim}
              />
              <div className="season-pass-kart__collect season-pass-kart__collect--premium">
                <button
                  type="button"
                  disabled={busy !== null || !state.isPremium}
                  onClick={() => void claimAll("premium")}
                >
                  보상 모두 받기
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="season-pass-kart__empty">진행 중인 시즌패스가 없습니다.</p>
      )}
      {message ? <p className="season-pass-kart__msg">{message}</p> : null}
      {claimPopup
        ? createPortal(
            <div
              className="season-pass-claim-overlay"
              role="presentation"
              onClick={clearClaimPopup}
            >
              <div
                className="season-pass-claim-dialog"
                role="dialog"
                aria-modal="true"
                aria-label={claimPopup.title}
                onClick={(event) => event.stopPropagation()}
              >
                <h3>{claimPopup.title}</h3>
                <p>{claimPopup.body}</p>
                {claimPopup.items.length > 0 ? (
                  <ul>
                    {claimPopup.items.map((item, index) => (
                      <li key={`${item.name}-${index}`}>
                        {item.imageUrl ? <img src={item.imageUrl} alt="" /> : null}
                        <span>{item.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="season-pass-claim-dialog__actions">
                  {claimPopup.gifted ? (
                    <button
                      type="button"
                      className="is-primary"
                      onClick={() => {
                        clearClaimPopup();
                        window.dispatchEvent(new Event("site-season-pass-close"));
                        window.dispatchEvent(new Event("site-gift-inbox-open"));
                      }}
                    >
                      선물함 열기
                    </button>
                  ) : null}
                  <button type="button" onClick={clearClaimPopup}>
                    확인
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function TrackName({
  imageUrl,
  label,
  premium = false,
}: {
  imageUrl?: string | null;
  label: string;
  premium?: boolean;
}) {
  return (
    <div
      className={`season-pass-kart__track-name ${premium ? "is-premium" : ""}`}
      aria-label={label}
    >
      {imageUrl ? <img src={imageUrl} alt="" /> : <span>{label}</span>}
    </div>
  );
}

function TrackRow({
  state,
  userId,
  track,
  busy,
  hideText,
  goldIconUrl,
  checkImageUrl,
  onClaim,
}: {
  state: SeasonPassWidgetState;
  userId: string;
  track: SeasonPassTrack;
  busy: boolean;
  hideText: boolean;
  goldIconUrl?: string | null;
  checkImageUrl?: string | null;
  onClaim: (level: number, track: SeasonPassTrack) => void | Promise<unknown>;
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
              goldIconUrl={goldIconUrl}
              checkImageUrl={checkImageUrl}
              onClaim={() => void onClaim(level.level, track)}
            />
          </div>
        );
      })}
    </div>
  );
}

function GoldShopBoard({ client }: { client: ReturnType<typeof useSeasonPassClient> }) {
  const { state, busy, buyShopItem } = client;
  const gold = state.progress?.gold ?? 0;
  const goldIcon = state.season?.gold_icon_url;
  const [filter, setFilter] = useState<"all" | "pass" | "costume" | "coupon">("all");
  const [pending, setPending] = useState<GoldShopItem | null>(null);
  const items = state.shopItems.filter((item) => {
    if (!item.is_active) return false;
    if (filter === "pass") return item.item_kind === "premium";
    if (filter === "costume") return item.reward?.item_type === "costume";
    if (filter === "coupon") return item.reward?.item_type === "coupon";
    return true;
  });
  const slots = Math.max(6, Math.ceil(Math.max(items.length, 1) / 3) * 3);

  async function confirmBuy() {
    if (!pending) return;
    const id = pending.id;
    setPending(null);
    await buyShopItem(id);
  }

  return (
    <div className="season-pass-shop">
      <div className="season-pass-shop__nav">
        {(
          [
            ["all", "전체"],
            ["pass", "패스"],
            ["costume", "코스튬"],
            ["coupon", "쿠폰"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={filter === id ? "is-active" : ""}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
        <span className="season-pass-shop__balance">
          {goldIcon ? <img src={goldIcon} alt="" /> : <span className="season-pass-shop__coin" aria-hidden />}
          {gold.toLocaleString("ko-KR")}
        </span>
      </div>
      <div className="season-pass-shop__panel">
        <ul className="season-pass-shop__grid">
          {Array.from({ length: slots }, (_, index) => {
            const item = items[index];
            if (!item) {
              return <li key={`empty-${index}`} className="season-pass-shop__slot" />;
            }
            const soldOut = item.stock != null && item.stock <= 0;
            const owned =
              (item.item_kind === "premium" && state.isPremium) ||
              (item.per_user_limit > 0 && item.purchased_count >= item.per_user_limit);
            const imageUrl =
              item.reward?.image_url ||
              (item.item_kind === "premium" ? state.season?.premium_pass_image_url : null);
            const discount =
              item.original_price_gold > item.price_gold && item.price_gold > 0
                ? Math.round((1 - item.price_gold / item.original_price_gold) * 100)
                : 0;
            const badge = item.badge_label.trim();
            const disabled = busy !== null || owned || soldOut || item.price_gold <= 0 || gold < item.price_gold;
            const status = owned ? "보유 중" : soldOut ? "품절" : gold < item.price_gold ? "골드 부족" : "";
            return (
              <li key={item.id}>
                <div className={`season-pass-shop__card ${owned || soldOut ? "is-disabled" : ""}`}>
                  <span className="season-pass-shop__title">{item.name}</span>
                  <span className="season-pass-shop__art">
                    {discount > 0 ? <b>{discount}%</b> : null}
                    {badge ? <em className={discount > 0 ? "is-secondary" : ""}>{badge}</em> : null}
                    {imageUrl ? <img src={imageUrl} alt="" /> : <span />}
                  </span>
                  <span className="season-pass-shop__cost">
                    {goldIcon ? <img src={goldIcon} alt="" /> : <span className="season-pass-shop__coin" aria-hidden />}
                    {discount > 0 ? (
                      <s>{item.original_price_gold.toLocaleString("ko-KR")}</s>
                    ) : null}
                    {item.price_gold > 0 ? item.price_gold.toLocaleString("ko-KR") : "-"}
                  </span>
                  {status ? <span className="season-pass-shop__status">{status}</span> : null}
                  <button
                    type="button"
                    className="season-pass-shop__buy"
                    disabled={disabled}
                    onClick={() => setPending(item)}
                  >
                    구입하기
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {pending
        ? createPortal(
            <div
              className="season-pass-claim-overlay"
              role="presentation"
              onClick={() => setPending(null)}
            >
              <div
                className="season-pass-claim-dialog season-pass-shop-buy"
                role="dialog"
                aria-modal="true"
                aria-label="구입하기"
                onClick={(event) => event.stopPropagation()}
              >
                <h3>구입하시겠습니까?</h3>
                <p>
                  {pending.name}
                  {"\n"}
                  {pending.price_gold.toLocaleString("ko-KR")} 골드
                </p>
                {pending.reward?.image_url ||
                (pending.item_kind === "premium" && state.season?.premium_pass_image_url) ? (
                  <ul>
                    <li>
                      <img
                        src={
                          pending.reward?.image_url ||
                          state.season?.premium_pass_image_url ||
                          ""
                        }
                        alt=""
                      />
                      <span>{pending.name}</span>
                    </li>
                  </ul>
                ) : null}
                <div className="season-pass-claim-dialog__actions">
                  <button type="button" onClick={() => setPending(null)}>
                    취소
                  </button>
                  <button
                    type="button"
                    className="is-primary"
                    disabled={busy !== null}
                    onClick={() => void confirmBuy()}
                  >
                    구입하기
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function formatQuestRange(startsAt: string | null, endsAt: string | null) {
  const fmt = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(date)
      .replace(/\./g, "-");
  };
  const start = fmt(startsAt);
  const end = fmt(endsAt);
  if (!start && !end) return "시즌 기간 동안 진행";
  return `${start || "시작"}  ${end || "종료"}`;
}

function questObjective(quest: SeasonPassWidgetState["quests"][number]) {
  if (quest.quest_type === "attendance") {
    return `출석 체크 ${quest.target_count}일 달성`;
  }
  return `제휴처 ${quest.target_count}곳 방문`;
}

function QuestBoard({
  client,
  onGoPass,
}: {
  client: ReturnType<typeof useSeasonPassClient>;
  onGoPass: () => void;
}) {
  const { userId, state, busy, checkIn } = client;
  const season = state.season;
  const quests = state.quests;
  const [selectedId, setSelectedId] = useState(quests[0]?.id ?? "");

  useEffect(() => {
    if (!quests.some((quest) => quest.id === selectedId)) {
      setSelectedId(quests[0]?.id ?? "");
    }
  }, [quests, selectedId]);

  const selected = useMemo(
    () => quests.find((quest) => quest.id === selectedId) ?? quests[0] ?? null,
    [quests, selectedId],
  );
  const visitQuests = quests.filter((quest) => quest.quest_type !== "attendance");
  const attendQuests = quests.filter((quest) => quest.quest_type === "attendance");

  if (!season) return null;

  return (
    <div className="season-pass-quest">
      <div className="season-pass-quest__chrome">
        <h2>퀘스트 정보</h2>
      </div>
      <div className="season-pass-quest__layout">
        <aside className="season-pass-quest__list">
          {visitQuests.length > 0 ? (
            <section>
              <h3>제휴 방문 퀘스트</h3>
              {visitQuests.map((quest) => (
                <button
                  key={quest.id}
                  type="button"
                  className={selected?.id === quest.id ? "is-active" : ""}
                  onClick={() => setSelectedId(quest.id)}
                >
                  <span>{quest.title}</span>
                  {quest.is_completed ? <em>CLEAR</em> : null}
                </button>
              ))}
            </section>
          ) : null}
          <section>
            <h3>출석 체크 퀘스트</h3>
            <button
              type="button"
              className="season-pass-quest__attend"
              disabled={!userId || state.attendedToday || busy !== null}
              onClick={() => void checkIn()}
            >
              {state.attendedToday ? "오늘 출석 완료" : "오늘 출석 체크"}
            </button>
            {attendQuests.map((quest) => (
              <button
                key={quest.id}
                type="button"
                className={selected?.id === quest.id ? "is-active" : ""}
                onClick={() => setSelectedId(quest.id)}
              >
                <span>{quest.title}</span>
                {quest.is_completed ? <em>CLEAR</em> : null}
              </button>
            ))}
          </section>
          {quests.length === 0 ? <p className="season-pass-quest__empty">등록된 퀘스트가 없습니다.</p> : null}
        </aside>
        <section className="season-pass-quest__detail">
          {selected ? (
            <>
              <header>
                <h3>
                  [{seasonPassQuestTypeLabel(selected.quest_type)}] {selected.title}
                </h3>
                <p className="season-pass-quest__dates">{formatQuestRange(season.starts_at, season.ends_at)}</p>
                <p className="season-pass-quest__desc">
                  {selected.description.trim() ||
                    `${questObjective(selected)}하면 패스 EXP와 골드를 받을 수 있습니다.`}
                </p>
              </header>
              <div className="season-pass-quest__status">
                <span>진행 가능 상태</span>
                <strong>{selected.is_completed ? "진행 완료" : "진행 중"}</strong>
                <label>
                  <input type="checkbox" checked={selected.is_completed} readOnly />
                  {questObjective(selected)}
                </label>
              </div>
              <div className="season-pass-quest__goal">
                <h4>도전과제</h4>
                <p>
                  {questObjective(selected)} ({selected.progress}/{selected.target_count})
                </p>
                {selected.is_completed ? (
                  <b>퀘스트를 완료하였습니다. 패스 EXP와 골드가 지급되었습니다.</b>
                ) : (
                  <b>목표를 채우면 보상이 자동으로 지급됩니다.</b>
                )}
              </div>
              <div className="season-pass-quest__rewards">
                <h4>보 상</h4>
                <div className="season-pass-quest__slots">
                  {selected.reward_exp > 0 ? (
                    <div className="is-filled">
                      <span>패스 EXP</span>
                      <strong>{selected.reward_exp}</strong>
                    </div>
                  ) : (
                    <div className="is-empty" />
                  )}
                  {selected.reward_gold > 0 ? (
                    <div className="is-filled">
                      {season.gold_icon_url ? <img src={season.gold_icon_url} alt="" /> : <span>골드</span>}
                      <strong>{selected.reward_gold}</strong>
                    </div>
                  ) : (
                    <div className="is-empty" />
                  )}
                  <div className="is-empty" />
                  <div className="is-empty" />
                </div>
              </div>
            </>
          ) : (
            <p className="season-pass-quest__empty">왼쪽에서 퀘스트를 선택해 주세요.</p>
          )}
          <div className="season-pass-quest__actions">
            <button type="button" className="season-pass-quest__goto" onClick={onGoPass}>
              시즌패스 바로 가기
            </button>
            <button type="button" className="season-pass-quest__ok" onClick={onGoPass}>
              확인
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
