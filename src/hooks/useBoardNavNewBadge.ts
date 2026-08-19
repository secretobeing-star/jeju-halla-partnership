"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BOARD_NAV_VISITED_EVENT,
  hasUnreadBoardNavPosts,
} from "@/lib/board-nav-new-badge";
import { supabase } from "@/lib/supabase";

async function fetchLatestBoardPostCreatedAt(): Promise<string | null> {
  const { data, error } = await supabase
    .from("board_posts")
    .select("created_at")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.created_at) {
    return null;
  }

  return data.created_at;
}

export function useBoardNavNewBadge(enabled = true) {
  const [hasNewPosts, setHasNewPosts] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setHasNewPosts(false);
      return;
    }

    const latestCreatedAt = await fetchLatestBoardPostCreatedAt();
    setHasNewPosts(hasUnreadBoardNavPosts(latestCreatedAt));
  }, [enabled]);

  useEffect(() => {
    void refresh();

    function handleVisited() {
      setHasNewPosts(false);
    }

    function handleFocus() {
      void refresh();
    }

    window.addEventListener(BOARD_NAV_VISITED_EVENT, handleVisited);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener(BOARD_NAV_VISITED_EVENT, handleVisited);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  return hasNewPosts;
}
