"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSiteMemberSession,
  SITE_MEMBER_SESSION_EVENT,
} from "@/lib/site-member-session";
import { grantCardFrameUnlock } from "@/lib/student-card-frames";
import { studentAuthFetch } from "@/lib/student-session";
import type { RewardItem, SeasonPassTrack, SeasonPassWidgetState } from "@/lib/season-pass";

export type SeasonPassClaimPopupItem = {
  name: string;
  imageUrl: string | null;
  gifted: boolean;
  kind?: string;
};

export type SeasonPassClaimPopup = {
  title: string;
  body: string;
  items: SeasonPassClaimPopupItem[];
  gifted: boolean;
};

function rewardPreview(
  reward: RewardItem | null | undefined,
  gifted: boolean,
  goldIconUrl?: string | null,
): SeasonPassClaimPopupItem {
  const qty = Math.max(0, Number(reward?.metadata.gold_amount ?? reward?.metadata.amount ?? 0));
  const name =
    reward?.item_type === "gold" && qty > 0
      ? `${reward.name?.trim() || "골드"} ${qty}개`
      : reward?.name?.trim() || (gifted ? "시즌패스 보상" : "보상");
  return {
    name,
    imageUrl: reward?.image_url || (reward?.item_type === "gold" ? goldIconUrl || null : null),
    gifted,
    kind: reward?.item_type || "",
  };
}

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
  shopItems: [],
  passEnabled: false,
  goldShopEnabled: false,
  gachaBoxes: [],
};

export function useSeasonPassClient() {
  const [userId, setUserId] = useState("");
  const [state, setState] = useState<SeasonPassWidgetState>(EMPTY_SEASON_PASS_STATE);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [claimPopup, setClaimPopup] = useState<SeasonPassClaimPopup | null>(null);

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

  function openClaimNotice(title: string, body: string) {
    setMessage("");
    setClaimPopup({
      title,
      body,
      items: [],
      gifted: false,
    });
  }

  async function claim(
    level: number,
    track: SeasonPassTrack,
    options?: { silent?: boolean; reward?: RewardItem | null },
  ): Promise<{ item: SeasonPassClaimPopupItem | null; error?: string }> {
    if (!userId) {
      const error = "로그인 후 보상을 받을 수 있습니다.";
      if (!options?.silent) {
        openClaimNotice("보상을 받을 수 없습니다", error);
      }
      return { item: null, error };
    }
    setBusy(`${level}-${track}`);
    setMessage("");
    const reward =
      options?.reward ??
      (track === "premium"
        ? state.levels.find((item) => item.level === level)?.premium_reward
        : state.levels.find((item) => item.level === level)?.free_reward) ??
      null;
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
        gifted?: boolean;
      };
      if (!response.ok) {
        throw new Error(payload.error || "수령에 실패했습니다.");
      }
      if (payload.state) {
        setState(payload.state);
      }
      const gifted = Boolean(payload.gifted);
      if (gifted) {
        window.dispatchEvent(new Event("site-gift-inbox-refresh"));
      } else {
        if (payload.frameId) {
          grantCardFrameUnlock(userId, payload.frameId, "season", { activate: false });
        }
        window.dispatchEvent(new Event("site-frame-inventory-refresh"));
      }
      window.dispatchEvent(new Event("site-season-pass-refresh"));
      const preview = rewardPreview(reward, gifted, state.season?.gold_icon_url);
      if (!options?.silent) {
        setClaimPopup({
          title: "보상을 받았습니다",
          body: gifted
            ? "선물함으로 보냈습니다. 선물함에서 받아 주세요."
            : "보상이 지급되었습니다.",
          items: [preview],
          gifted,
        });
      }
      return { item: preview };
    } catch (error) {
      const text = error instanceof Error ? error.message : "수령에 실패했습니다.";
      if (!options?.silent) {
        openClaimNotice("보상을 받지 못했습니다", text);
      }
      return { item: null, error: text };
    } finally {
      setBusy(null);
    }
  }

  async function claimAll(track: SeasonPassTrack) {
    if (!userId) {
      openClaimNotice("보상을 받을 수 없습니다", "로그인 후 보상을 받을 수 있습니다.");
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
      openClaimNotice(
        "받을 수 있는 보상이 없습니다",
        track === "premium" && !state.isPremium
          ? "프리미엄 패스가 있어야 받을 수 있습니다."
          : "아직 받을 수 있는 보상이 없거나 이미 모두 받았습니다.",
      );
      return;
    }
    const collected: SeasonPassClaimPopupItem[] = [];
    let lastError = "";
    for (const level of pending) {
      const reward = track === "premium" ? level.premium_reward : level.free_reward;
      const result = await claim(level.level, track, { silent: true, reward });
      if (result.item) {
        collected.push(result.item);
      } else if (result.error) {
        lastError = result.error;
      }
    }
    if (collected.length === 0) {
      openClaimNotice("보상을 받지 못했습니다", lastError || "보상을 수령하지 못했습니다.");
      return;
    }
    const gifted = collected.some((item) => item.gifted);
    setClaimPopup({
      title: collected.length > 1 ? `보상 ${collected.length}개를 받았습니다` : "보상을 받았습니다",
      body: gifted
        ? "코스튬·쿠폰은 선물함으로 보냈습니다. 선물함에서 받아 주세요."
        : "보상이 지급되었습니다.",
      items: collected,
      gifted,
    });
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
      const response = await studentAuthFetch("/api/season-pass/buy-premium", {
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
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "구매에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function buyShopItem(shopItemId: string) {
    if (!userId) {
      openClaimNotice("구매할 수 없습니다", "로그인 후 구매할 수 있습니다.");
      return;
    }
    setBusy(`shop-${shopItemId}`);
    setMessage("");
    try {
      const response = await studentAuthFetch("/api/season-pass/shop-buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, shopItemId }),
      });
      const payload = (await response.json()) as {
        state?: SeasonPassWidgetState;
        error?: string;
        gifted?: boolean;
        name?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "구매에 실패했습니다.");
      }
      if (payload.state) {
        setState(payload.state);
      }
      const gifted = Boolean(payload.gifted);
      if (gifted) {
        window.dispatchEvent(new Event("site-gift-inbox-refresh"));
      }
      window.dispatchEvent(new Event("site-season-pass-refresh"));
      const item = state.shopItems.find((shopItem) => shopItem.id === shopItemId);
      const imageUrl =
        item?.reward?.image_url ||
        (item?.item_kind === "premium" ? state.season?.premium_pass_image_url : null) ||
        null;
      setClaimPopup({
        title: "구입이 완료되었습니다.",
        body: gifted
          ? "구매한 상품은 선물함으로 보냈습니다. 선물함에서 받아 주세요."
          : "구입이 완료되었습니다.",
            items: item
          ? [
              {
                name: payload.name?.trim() || item.name,
                imageUrl,
                gifted,
                kind: item.reward?.item_type || item.item_kind,
              },
            ]
          : [],
        gifted,
      });
    } catch (error) {
      openClaimNotice("구매하지 못했습니다", error instanceof Error ? error.message : "구매에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function buyGacha(boxId: string) {
    if (!userId) {
      openClaimNotice("구매할 수 없습니다", "로그인 후 구매할 수 있습니다.");
      return null;
    }
    setBusy(`gacha-${boxId}`);
    setMessage("");
    try {
      const response = await studentAuthFetch("/api/season-pass/gacha-pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, boxId }),
      });
      const payload = (await response.json()) as {
        state?: SeasonPassWidgetState;
        error?: string;
        held?: boolean;
        gifted?: boolean;
        name?: string;
        imageUrl?: string | null;
        kind?: string;
        goldAmount?: number;
        fxEnabled?: boolean;
        idleImageUrl?: string | null;
        burstImageUrl?: string | null;
      };
      if (!response.ok) {
        throw new Error(payload.error || "뽑기에 실패했습니다.");
      }
      if (payload.state) {
        setState(payload.state);
      }
      if (Boolean(payload.gifted)) {
        window.dispatchEvent(new Event("site-gift-inbox-refresh"));
      }
      window.dispatchEvent(new Event("site-season-pass-refresh"));
      return payload;
    } catch (error) {
      openClaimNotice("뽑지 못했습니다", error instanceof Error ? error.message : "뽑기에 실패했습니다.");
      return null;
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
    buyShopItem,
    buyGacha,
    claimPopup,
    clearClaimPopup: () => setClaimPopup(null),
  };
}
