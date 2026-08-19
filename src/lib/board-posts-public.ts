import { isMissingBoardRpcError } from "@/lib/board-hidden-post";
import { BoardPost, supabase } from "@/lib/supabase";

type LoadBoardPostsResult = {
  data: BoardPost[];
  error: { message: string } | null;
  usedLegacyQuery: boolean;
};

async function loadBoardPostsLegacy(
  fields: string,
  boardType?: string,
  pinnedOnly = false,
  visibleBoardIds: string[] = [],
) {
  let query = supabase.from("board_posts").select(fields).eq("is_hidden", false);

  if (pinnedOnly) {
    query = query
      .eq("is_pinned", true)
      .in("board_type", visibleBoardIds)
      .order("pinned_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  } else {
    query = query
      .eq("board_type", boardType ?? "")
      .order("created_at", { ascending: false });
  }

  return query;
}

async function loadBoardPostsForDisplay(
  boardType: string,
  pinnedOnly: boolean,
  visibleBoardIds: string[],
): Promise<LoadBoardPostsResult> {
  const { data, error } = await supabase.rpc("list_board_posts_for_display", {
    p_board_type: pinnedOnly ? null : boardType,
    p_pinned_only: pinnedOnly,
    p_board_types: pinnedOnly ? visibleBoardIds : null,
  });

  if (!error) {
    return {
      data: (data as BoardPost[]) ?? [],
      error: null,
      usedLegacyQuery: false,
    };
  }

  if (isMissingBoardRpcError(error.message)) {
    return { data: [], error, usedLegacyQuery: true };
  }

  // RPC가 있지만 컬럼 누락 등으로 실패하면 legacy 조회로 대체
  return { data: [], error, usedLegacyQuery: true };
}

export async function fetchPublicBoardPosts(
  fields: string,
  fieldsBase: string,
  boardType: string,
  pinnedOnly: boolean,
  visibleBoardIds: string[],
): Promise<LoadBoardPostsResult> {
  const displayResult = await loadBoardPostsForDisplay(
    boardType,
    pinnedOnly,
    visibleBoardIds,
  );

  if (!displayResult.error && !displayResult.usedLegacyQuery) {
    return displayResult;
  }

  let legacyResult = await loadBoardPostsLegacy(fields, boardType, pinnedOnly, visibleBoardIds);

  if (
    pinnedOnly &&
    legacyResult.error?.message &&
    (legacyResult.error.message.includes("is_pinned") ||
      legacyResult.error.message.includes("pinned_at"))
  ) {
    return { data: [], error: null, usedLegacyQuery: true };
  }

  if (legacyResult.error?.message.includes("is_admin_managed")) {
    legacyResult = await loadBoardPostsLegacy(
      fieldsBase,
      boardType,
      pinnedOnly,
      visibleBoardIds,
    );
  }

  if (legacyResult.error?.message.includes("admin_action_reason")) {
    legacyResult = await loadBoardPostsLegacy(
      fieldsBase.replace(", admin_action_reason", ""),
      boardType,
      pinnedOnly,
      visibleBoardIds,
    );
  }

  return {
    data: (legacyResult.data as unknown as BoardPost[]) ?? [],
    error: legacyResult.error,
    usedLegacyQuery: true,
  };
}
