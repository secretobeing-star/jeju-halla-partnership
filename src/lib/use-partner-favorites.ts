"use client";

import { useCallback, useEffect, useState } from "react";
import {
  hasUploadedAccountFavorites,
  loadGuestPartnerFavoriteIds,
  loadPartnerFavoriteIds,
  markAccountFavoritesUploaded,
  PARTNER_FAVORITES_EVENT,
  replacePartnerFavoriteIds,
  togglePartnerFavorite,
} from "@/lib/partner-favorites";
import { getSiteMemberSession, SITE_MEMBER_SESSION_EVENT } from "@/lib/site-member-session";
import { studentAuthFetch } from "@/lib/student-session";

async function hydrateRemoteFavorites() {
  const userId = getSiteMemberSession()?.student?.studentId?.trim();
  if (!userId) {
    return;
  }

  try {
    const response = await studentAuthFetch(`/api/favorites?userId=${encodeURIComponent(userId)}`);
    const payload = (await response.json()) as { placeIds?: string[] };
    const remote = Array.isArray(payload.placeIds)
      ? payload.placeIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [];

    const local = [...loadPartnerFavoriteIds()];
    const guest = loadGuestPartnerFavoriteIds();
    const seed = local.length > 0 ? local : guest;
    const needsFirstUpload = !hasUploadedAccountFavorites(userId) && remote.length === 0 && seed.length > 0;

    if (needsFirstUpload) {
      replacePartnerFavoriteIds(seed);
      markAccountFavoritesUploaded(userId);
      await Promise.all(
        seed.map((placeId) =>
          studentAuthFetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, placeId, favorited: true }),
          }),
        ),
      );
      return;
    }

    markAccountFavoritesUploaded(userId);
    replacePartnerFavoriteIds(remote);
  } catch {
    // 로컬 즐겨찾기 유지
  }
}

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
    void hydrateRemoteFavorites();
    const onSession = () => {
      setFavoriteIds(loadPartnerFavoriteIds());
      void hydrateRemoteFavorites();
    };
    function refresh() {
      if (document.visibilityState === "visible") {
        void hydrateRemoteFavorites();
      }
    }
    window.addEventListener(SITE_MEMBER_SESSION_EVENT, onSession);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 8000);
    return () => {
      window.removeEventListener(SITE_MEMBER_SESSION_EVENT, onSession);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, []);

  const toggle = useCallback((partnerId: string) => {
    const nextFavorited = togglePartnerFavorite(partnerId);
    setFavoriteIds(loadPartnerFavoriteIds());
    const userId = getSiteMemberSession()?.student?.studentId?.trim();
    if (userId) {
      void studentAuthFetch("/api/favorites", {
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
          void studentAuthFetch("/api/event/favorite-stamp", {
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
