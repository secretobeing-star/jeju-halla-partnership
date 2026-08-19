"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadPartnerFavoriteIds,
  PARTNER_FAVORITES_EVENT,
  replacePartnerFavoriteIds,
  togglePartnerFavorite,
} from "@/lib/partner-favorites";
import { getSiteMemberSession, SITE_MEMBER_SESSION_EVENT } from "@/lib/site-member-session";

export function usePartnerFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const sync = () => {
      setFavoriteIds(loadPartnerFavoriteIds());
    };

    sync();
    window.addEventListener(PARTNER_FAVORITES_EVENT, sync);
    return () => window.removeEventListener(PARTNER_FAVORITES_EVENT, sync);
  }, []);

  useEffect(() => {
    async function hydrateRemote() {
      const userId = getSiteMemberSession()?.student?.studentId?.trim();
      if (!userId) {
        return;
      }
      try {
        const response = await fetch(`/api/favorites?userId=${encodeURIComponent(userId)}`);
        const payload = (await response.json()) as { placeIds?: string[] };
        if (Array.isArray(payload.placeIds)) {
          replacePartnerFavoriteIds([...loadPartnerFavoriteIds(), ...payload.placeIds]);
        }
      } catch {
        // 로컬 즐겨찾기 유지
      }
    }
    void hydrateRemote();
    const onSession = () => void hydrateRemote();
    window.addEventListener(SITE_MEMBER_SESSION_EVENT, onSession);
    return () => window.removeEventListener(SITE_MEMBER_SESSION_EVENT, onSession);
  }, []);

  const toggle = useCallback((partnerId: string) => {
    const nextFavorited = togglePartnerFavorite(partnerId);
    setFavoriteIds(loadPartnerFavoriteIds());
    const userId = getSiteMemberSession()?.student?.studentId?.trim();
    if (userId) {
      void fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, placeId: partnerId, favorited: nextFavorited }),
      });

      if (nextFavorited) {
        const activeEventId =
          (window as unknown as Record<string, unknown>).__activeMapEventId as
            | string
            | undefined;
        if (activeEventId) {
          void fetch("/api/event/favorite-stamp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, placeId: partnerId, eventId: activeEventId }),
          })
            .then((res) => res.json())
            .then((data: { stamped?: boolean }) => {
              if (data?.stamped) {
                window.dispatchEvent(new Event("site-stamp-progress-changed"));
              }
            })
            .catch(() => {});
        }
      }
    }
  }, []);

  const isFavorite = useCallback(
    (partnerId: string) => favoriteIds.has(partnerId),
    [favoriteIds],
  );

  return {
    favoriteIds,
    favoriteCount: favoriteIds.size,
    isFavorite,
    toggle,
  };
}
