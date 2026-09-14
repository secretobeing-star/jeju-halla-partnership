"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSiteMemberSession,
  SITE_MEMBER_SESSION_EVENT,
} from "@/lib/site-member-session";
import { grantCardFrameUnlock } from "@/lib/student-card-frames";
import type { SeasonPassTrack, SeasonPassWidgetState } from "@/lib/season-pass";

export const EMPTY_SEASON_PASS_STATE: SeasonPassWidgetState = {
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
};

export function useSeasonPassClient() {
  const [userId, setUserId] = useState("");
  const [state, setState] = useState<SeasonPassWidgetState>(EMPTY_SEASON_PASS_STATE);
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
    const response = await fetch(`/api/season-pass?userId=${encodeURIComponent(userId)}`);
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
    window.addEventListener("site-season-pass-refresh", onStamp);
    return () => {
      window.removeEventListener("site-stamp-progress-changed", onStamp);
      window.removeEventListener("site-season-pass-refresh", onStamp);
    };
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
      const response = await fetch("/api/season-pass/claim", {
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
      window.dispatchEvent(new Event("site-season-pass-refresh"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "수령에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function claimAll(track: SeasonPassTrack) {
    if (!userId) {
      setMessage("로그인 후 보상을 받을 수 있습니다.");
      return;
    }
    const pending = state.levels.filter((level) => {
      if (state.currentLevel < level.level) return false;
      const reward = track === "premium" ? level.premium_reward : level.free_reward;
      if (!reward) return false;
      if (track === "premium" && !state.isPremium) return false;
      return !state.claims.some((claim) => claim.level === level.level && claim.track === track);
    });
    if (pending.length === 0) {
      setMessage("받을 보상이 없습니다.");
      return;
    }
    for (const level of pending) {
      await claim(level.level, track);
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
      const response = await fetch("/api/season-pass/attendance", {
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
      window.dispatchEvent(new Event("site-season-pass-refresh"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "출석에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function buyPremium() {
    if (!userId) {
      setMessage("로그인 후 구매할 수 있습니다.");
      return;
    }
    setBusy("premium");
    setMessage("");
    try {
      const response = await fetch("/api/season-pass/buy-premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const payload = (await response.json()) as { state?: SeasonPassWidgetState; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "구매에 실패했습니다.");
      }
      if (payload.state) {
        setState(payload.state);
      }
      setMessage("프리미엄 패스를 구매했습니다.");
      window.dispatchEvent(new Event("site-season-pass-refresh"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "구매에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  return {
    userId,
    state,
    busy,
    message,
    setMessage,
    percent,
    load,
    claim,
    claimAll,
    checkIn,
    buyPremium,
  };
}
