"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSiteMemberSession,
  SITE_MEMBER_SESSION_EVENT,
} from "@/lib/site-member-session";
import type { SeasonPassTrack, SeasonPassWidgetState } from "@/lib/season-pass";
import { seasonPassQuestTypeLabel } from "@/lib/season-pass";
import { grantCardFrameUnlock } from "@/lib/student-card-frames";
import { studentAuthFetch } from "@/lib/student-session";

const EMPTY: SeasonPassWidgetState = {
  season: null,
  progress: null,
  levels: [],
  claims: [],
  quests: [],
  attendedToday: false,
  currentLevel: 1,
  currentExp: 0,
  nextLevelExp: 1000,
  expIntoLevel: 0,
  expForLevel: 1000,
  isPremium: false,
  shopItems: [],
  passEnabled: false,
  goldShopEnabled: false,
};

export default function SeasonPassWidget() {
  const [userId, setUserId] = useState("");
  const [state, setState] = useState<SeasonPassWidgetState>(EMPTY);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const refreshUser = useCallback(() => {
    setUserId(getSiteMemberSession()?.student?.studentId?.trim() || "");
  }, []);

  useEffect(() => {
    refreshUser();
    window.addEventListener(SITE_MEMBER_SESSION_EVENT, refreshUser);
    window.addEventListener("site-stamp-progress-changed", refreshUser);
    return () => {
      window.removeEventListener(SITE_MEMBER_SESSION_EVENT, refreshUser);
      window.removeEventListener("site-stamp-progress-changed", refreshUser);
    };
  }, [refreshUser]);

  const load = useCallback(async () => {
    const response = await studentAuthFetch(`/api/season-pass?userId=${encodeURIComponent(userId)}`);
    const payload = (await response.json()) as { state?: SeasonPassWidgetState; error?: string };
    if (payload.state) {
      setState(payload.state);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onStamp = () => {
      void load();
    };
    window.addEventListener("site-stamp-progress-changed", onStamp);
    return () => window.removeEventListener("site-stamp-progress-changed", onStamp);
  }, [load]);

  const percent = useMemo(() => {
    if (state.expForLevel <= 0) return 0;
    return Math.min(100, Math.round((state.expIntoLevel / state.expForLevel) * 100));
  }, [state.expForLevel, state.expIntoLevel]);

  async function claim(level: number, track: SeasonPassTrack) {
    if (!userId) {
      setMessage("로그인 후 보상을 받을 수 있습니다.");
      return;
    }
    setBusy(`${level}-${track}`);
    setMessage("");
    try {
      const response = await studentAuthFetch("/api/season-pass/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, level, track }),
      });
      const payload = (await response.json()) as {
        state?: SeasonPassWidgetState;
        error?: string;
        frameId?: string | null;
      };
      if (!response.ok) {
        throw new Error(payload.error || "수령에 실패했습니다.");
      }
      if (payload.state) {
        setState(payload.state);
      }
      if (payload.frameId) {
        grantCardFrameUnlock(userId, payload.frameId, "season", { activate: false });
      }
      setMessage("보상을 수령했습니다.");
      window.dispatchEvent(new Event("site-frame-inventory-refresh"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "수령에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function checkIn() {
    if (!userId) {
      setMessage("로그인 후 출석할 수 있습니다.");
      return;
    }
    setBusy("attendance");
    setMessage("");
    try {
      const response = await studentAuthFetch("/api/season-pass/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const payload = (await response.json()) as { state?: SeasonPassWidgetState; error?: string };
      if (payload.state) {
        setState(payload.state);
      }
      if (!response.ok) {
        throw new Error(payload.error || "출석에 실패했습니다.");
      }
      setMessage("오늘 출석을 완료했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "출석에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  if (!state.season) {
    return null;
  }

  const nextLevels = state.levels.filter((level) => level.level >= state.currentLevel).slice(0, 4);
  const displayLevels = nextLevels.length > 0 ? nextLevels : state.levels.slice(0, 4);

  return (
    <section
      className="season-pass-widget mt-3 overflow-hidden rounded-2xl border border-amber-200/70 p-4 text-white shadow-sm"
      style={{
        backgroundImage: [
          "linear-gradient(135deg, rgba(15,23,42,0.88), rgba(88,28,135,0.78))",
          state.season.bg_image_url ? `url(${JSON.stringify(state.season.bg_image_url)})` : "",
        ]
          .filter(Boolean)
          .join(", "),
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">시즌패스</p>
          <h3 className="mt-0.5 text-lg font-bold leading-tight">{state.season.title}</h3>
          <p className="mt-1 text-sm text-white/80">
            {userId ? `Lv.${state.currentLevel}` : "로그인 후 진행도가 표시됩니다"}
            {state.isPremium ? " · 프리미엄" : ""}
          </p>
        </div>
        {state.season.premium_badge_url || state.season.ui_image_url ? (
          <img
            src={state.season.ui_image_url || state.season.premium_badge_url || ""}
            alt=""
            className="h-12 w-12 rounded-xl object-contain bg-white/10 p-1"
          />
        ) : null}
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-white/80">
          <span>EXP {state.expIntoLevel} / {state.expForLevel}</span>
          <span>골드 {state.progress?.gold ?? 0}</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-fuchsia-400"
            style={{ width: `${userId ? percent : 0}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={!userId || state.attendedToday || busy !== null}
          onClick={() => void checkIn()}
          className="rounded-xl bg-emerald-400/90 px-3 py-2 text-sm font-bold text-slate-900 disabled:opacity-50"
        >
          {state.attendedToday ? "오늘 출석 완료" : "출석 체크"}
        </button>
      </div>

      {displayLevels.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {displayLevels.map((level) => {
            const freeClaimed = state.claims.some((claim) => claim.level === level.level && claim.track === "free");
            const premiumClaimed = state.claims.some(
              (claim) => claim.level === level.level && claim.track === "premium",
            );
            const reached = userId && state.currentLevel >= level.level;
            return (
              <div key={level.id} className="rounded-xl bg-black/25 p-2 text-xs">
                <p className="font-semibold">Lv.{level.level}</p>
                <button
                  type="button"
                  disabled={!reached || freeClaimed || busy !== null || !level.free_reward}
                  onClick={() => void claim(level.level, "free")}
                  className="mt-1 w-full rounded-lg bg-white/15 px-2 py-1 disabled:opacity-40"
                >
                  {freeClaimed ? "무료 수령됨" : level.free_reward?.name || "무료"}
                </button>
                <button
                  type="button"
                  disabled={!reached || !state.isPremium || premiumClaimed || busy !== null || !level.premium_reward}
                  onClick={() => void claim(level.level, "premium")}
                  className="mt-1 w-full rounded-lg bg-amber-400/25 px-2 py-1 disabled:opacity-40"
                >
                  {premiumClaimed ? "프리미엄 수령됨" : level.premium_reward?.name || "프리미엄"}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {state.quests.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-white/85">
          {state.quests.map((quest) => (
            <li key={quest.id}>
              {seasonPassQuestTypeLabel(quest.quest_type)} · {quest.title} ({quest.progress}/{quest.target_count})
              {quest.reward_exp || quest.reward_gold
                ? ` · 보상 패스 EXP ${quest.reward_exp}${quest.reward_gold ? ` / 골드 ${quest.reward_gold}` : ""}`
                : ""}
              {quest.is_completed ? " 완료" : ""}
            </li>
          ))}
        </ul>
      ) : null}

      {message ? <p className="mt-2 text-xs text-amber-100">{message}</p> : null}
    </section>
  );
}
