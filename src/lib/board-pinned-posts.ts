import { isNoticeBoard } from "@/lib/board-definitions";
import { buildBoardPostNumberMap } from "@/lib/board-list-format";
import { fetchPublicBoardPosts } from "@/lib/board-posts-public";
import { BoardPost, SiteSettings } from "@/lib/supabase";

export type BoardSort = "latest" | "recommended" | "views";

/** 고정(공지) 게시글 — 데이터·목록·표시·스타일 단일 모듈 */

export const BOARD_PINNED_NOTICE_LABEL = "공지";

export const BOARD_PINNED_LIST_FIELDS_BASE =
  "id, board_type, title, author_name, is_hidden, is_secret, is_pinned, pinned_at, like_count, dislike_count, view_count, admin_action_reason, created_at";

export const BOARD_PINNED_LIST_FIELDS = `${BOARD_PINNED_LIST_FIELDS_BASE}, is_admin_managed`;

export const BOARD_PINNED_COMMUNITY_ROW_CLASS = {
  pinned: "board-community-row--pinned-large",
  regular: "board-community-row--regular",
} as const;

export const BOARD_PINNED_SIMPLE_ROW_CLASS = {
  pinned: "board-simple-row--pinned-large",
  regular: "board-simple-row--regular",
} as const;

export type BoardPinnedSiteSettings = Pick<
  SiteSettings,
  "board_pinned_persist_pages_enabled" | "board_pinned_also_in_list_enabled"
>;

export type BoardPinnedListDisplayOptions = {
  activeBoardId: string;
  pinnedAlsoInListEnabled: boolean;
};

export type BoardPinnedListDisplayState = {
  isPinnedForDisplay: boolean;
  showAsNoticeBar: boolean;
};

export type BoardPostsWithPinnedLoadResult = {
  boardPosts: BoardPost[];
  globalPinnedPosts: BoardPost[];
  mergedPosts: BoardPost[];
};

export function getBoardPinnedSettings(
  siteSettings: Partial<SiteSettings> = {},
): Required<BoardPinnedSiteSettings> {
  return {
    board_pinned_persist_pages_enabled:
      siteSettings.board_pinned_persist_pages_enabled ?? false,
    board_pinned_also_in_list_enabled:
      siteSettings.board_pinned_also_in_list_enabled ?? false,
  };
}

export function getCommunityPinnedRowClasses(isPinned: boolean) {
  return {
    rowClass: isPinned
      ? BOARD_PINNED_COMMUNITY_ROW_CLASS.pinned
      : BOARD_PINNED_COMMUNITY_ROW_CLASS.regular,
    hoverClass: isPinned ? "hover:bg-emerald-100/70" : "hover:bg-gray-50",
  };
}

export function getSimplePinnedRowButtonClasses(isPinned: boolean) {
  return isPinned
    ? `${BOARD_PINNED_SIMPLE_ROW_CLASS.pinned} py-3.5 sm:py-4 hover:bg-emerald-100/60`
    : `${BOARD_PINNED_SIMPLE_ROW_CLASS.regular} bg-white py-3 hover:bg-gray-50`;
}

export function getSimplePinnedTitleClasses(isPinned: boolean) {
  return isPinned ? "text-base font-semibold sm:text-lg" : "";
}

export function resolvePinnedListDisplayState(
  row: BoardListRow,
  _options: BoardPinnedListDisplayOptions,
): BoardPinnedListDisplayState {
  const isPinnedForDisplay = row.rowType === "pinned-bar";

  return {
    isPinnedForDisplay,
    showAsNoticeBar: isPinnedForDisplay,
  };
}

export function isPinnedPostForDetail(post: BoardPost) {
  return isBoardPostPinned(post);
}

export async function fetchBoardPostsWithPinned({
  activeBoard,
  visibleBoardIds,
  pinnedAlsoInListEnabled,
  listFields = BOARD_PINNED_LIST_FIELDS,
  listFieldsBase = BOARD_PINNED_LIST_FIELDS_BASE,
}: {
  activeBoard: string;
  visibleBoardIds: string[];
  pinnedAlsoInListEnabled: boolean;
  listFields?: string;
  listFieldsBase?: string;
}): Promise<BoardPostsWithPinnedLoadResult> {
  if (visibleBoardIds.length === 0) {
    return {
      boardPosts: [],
      globalPinnedPosts: [],
      mergedPosts: [],
    };
  }

  const [boardResult, pinnedResult] = await Promise.all([
    fetchPublicBoardPosts(listFields, listFieldsBase, activeBoard, false, visibleBoardIds),
    fetchPublicBoardPosts(listFields, listFieldsBase, activeBoard, true, visibleBoardIds),
  ]);

  const boardPosts = boardResult.data;
  const globalPinnedPosts = pinnedResult.data;
  const mergedPosts = mergeBoardPostsWithGlobalPinned(
    boardPosts,
    globalPinnedPosts,
    pinnedAlsoInListEnabled,
  );

  return {
    boardPosts,
    globalPinnedPosts,
    mergedPosts,
  };
}

function toCount(value: number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareBySortOrder(a: BoardPost, b: BoardPost, sortOrder: BoardSort) {
  if (sortOrder === "recommended") {
    const scoreA = toCount(a.like_count) - toCount(a.dislike_count);
    const scoreB = toCount(b.like_count) - toCount(b.dislike_count);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
  }

  if (sortOrder === "views") {
    const viewsA = toCount(a.view_count);
    const viewsB = toCount(b.view_count);
    if (viewsB !== viewsA) {
      return viewsB - viewsA;
    }
  }

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function comparePinnedPosts(a: BoardPost, b: BoardPost) {
  const pinnedAtA = a.pinned_at ? new Date(a.pinned_at).getTime() : 0;
  const pinnedAtB = b.pinned_at ? new Date(b.pinned_at).getTime() : 0;

  if (pinnedAtB !== pinnedAtA) {
    return pinnedAtB - pinnedAtA;
  }

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export function isBoardPostPinned(post: BoardPost) {
  return post.is_pinned === true;
}

export function getGlobalPinnedPostIds(globalPinnedPosts: BoardPost[]) {
  return new Set(globalPinnedPosts.map((post) => post.id));
}

function dedupePostsById(posts: BoardPost[]) {
  const seen = new Set<string>();
  const deduped: BoardPost[] = [];

  for (const post of posts) {
    if (seen.has(post.id)) {
      continue;
    }

    seen.add(post.id);
    deduped.push(post);
  }

  return deduped;
}

export function getPinnedBarPostsForBoard(
  boardPosts: BoardPost[],
  globalPinnedPosts: BoardPost[],
  activeBoardId: string,
) {
  if (isNoticeBoard(activeBoardId)) {
    return sortPinnedBoardPosts(boardPosts);
  }

  const boardPostIds = new Set(boardPosts.map((post) => post.id));
  const fromGlobal = globalPinnedPosts.filter(
    (post) => post.board_type === activeBoardId || !boardPostIds.has(post.id),
  );
  const fromCurrentBoard = boardPosts.filter(isBoardPostPinned);

  return sortPinnedBoardPosts(dedupePostsById([...fromGlobal, ...fromCurrentBoard]));
}

export function getRegularBoardPostsForList(
  boardPosts: BoardPost[],
  globalPinnedPosts: BoardPost[],
  pinnedBarPosts: BoardPost[] = [],
  activeBoardId?: string,
) {
  if (activeBoardId && isNoticeBoard(activeBoardId)) {
    return boardPosts;
  }

  const pinnedIds = getGlobalPinnedPostIds(globalPinnedPosts);
  const pinnedBarIds = new Set(pinnedBarPosts.map((post) => post.id));

  return boardPosts.filter(
    (post) => !pinnedIds.has(post.id) && !pinnedBarIds.has(post.id),
  );
}

export function mergeBoardPostsWithGlobalPinned(
  boardPosts: BoardPost[],
  globalPinnedPosts: BoardPost[],
  keepPinnedInBoardList = false,
) {
  if (keepPinnedInBoardList) {
    const boardPostIds = new Set(boardPosts.map((post) => post.id));
    const otherBoardPins = globalPinnedPosts.filter((post) => !boardPostIds.has(post.id));

    return [...otherBoardPins, ...boardPosts];
  }

  const pinnedIds = getGlobalPinnedPostIds(globalPinnedPosts);
  for (const post of boardPosts) {
    if (isBoardPostPinned(post)) {
      pinnedIds.add(post.id);
    }
  }

  const pinnedFromBoard = boardPosts.filter(isBoardPostPinned);
  const allPinned = dedupePostsById([...globalPinnedPosts, ...pinnedFromBoard]);
  const regularPosts = boardPosts.filter((post) => !pinnedIds.has(post.id));

  return [...allPinned, ...regularPosts];
}

export function sortPinnedBoardPosts(posts: BoardPost[]) {
  return posts.filter(isBoardPostPinned).sort(comparePinnedPosts);
}

export function sortListBoardPosts(
  boardPosts: BoardPost[],
  globalPinnedPosts: BoardPost[],
  sortOrder: BoardSort,
  activeBoardId: string,
  pinnedBarPosts: BoardPost[] = [],
) {
  const listPosts = getRegularBoardPostsForList(
    boardPosts,
    globalPinnedPosts,
    pinnedBarPosts,
    activeBoardId,
  );

  return [...listPosts].sort((a, b) => compareBySortOrder(a, b, sortOrder));
}

export function sortAllBoardPostsForList(
  boardPosts: BoardPost[],
  sortOrder: BoardSort,
  activeBoardId: string,
) {
  if (isNoticeBoard(activeBoardId)) {
    return [...boardPosts].sort((a, b) => compareBySortOrder(a, b, sortOrder));
  }

  return [...boardPosts].sort((a, b) => compareBySortOrder(a, b, sortOrder));
}

export function sortRegularBoardPosts(
  boardPosts: BoardPost[],
  globalPinnedPosts: BoardPost[],
  sortOrder: BoardSort,
  activeBoardId: string,
  pinnedBarPosts: BoardPost[] = [],
) {
  return sortListBoardPosts(
    boardPosts,
    globalPinnedPosts,
    sortOrder,
    activeBoardId,
    pinnedBarPosts,
  );
}

export function sortBoardPostsWithPinned(
  boardPosts: BoardPost[],
  globalPinnedPosts: BoardPost[],
  sortOrder: BoardSort,
  activeBoardId: string,
) {
  const pinnedBarPosts = getPinnedBarPostsForBoard(
    boardPosts,
    globalPinnedPosts,
    activeBoardId,
  );

  return [
    ...pinnedBarPosts,
    ...sortRegularBoardPosts(
      boardPosts,
      globalPinnedPosts,
      sortOrder,
      activeBoardId,
      pinnedBarPosts,
    ),
  ];
}

export function splitPinnedAndRegularPosts(posts: BoardPost[]) {
  const pinnedPosts = posts.filter(isBoardPostPinned);
  const regularPosts = posts.filter((post) => !isBoardPostPinned(post));

  return { pinnedPosts, regularPosts };
}

export type BoardListRow = {
  post: BoardPost;
  rowType: "pinned-bar" | "list";
};

export function buildBoardListRows(
  boardPosts: BoardPost[],
  globalPinnedPosts: BoardPost[],
  {
    activeBoardId,
    currentPage,
    postsPerPage,
    persistPinnedAcrossPages: _persistPinnedAcrossPages,
    showPinnedAlsoInList: _showPinnedAlsoInList,
    sortOrder,
  }: {
    activeBoardId: string;
    currentPage: number;
    postsPerPage: number;
    persistPinnedAcrossPages: boolean;
    showPinnedAlsoInList: boolean;
    sortOrder: BoardSort;
  },
) {
  const pinnedBarPosts = dedupePostsById(
    getPinnedBarPostsForBoard(boardPosts, globalPinnedPosts, activeBoardId),
  );
  const sortedAllPosts = sortAllBoardPostsForList(boardPosts, sortOrder, activeBoardId);
  const start = (currentPage - 1) * postsPerPage;

  const pinnedBarRows = pinnedBarPosts.map((post) => ({
    post,
    rowType: "pinned-bar" as const,
  }));

  const pinnedBarToShow =
    isNoticeBoard(activeBoardId) || pinnedBarRows.length === 0 ? [] : pinnedBarRows;
  const createdAtPostNumbers = buildBoardPostNumberMap(boardPosts);

  const listPageRows = sortedAllPosts
    .slice(start, start + postsPerPage)
    .map((post) => ({ post, rowType: "list" as const }));

  return {
    rows: [...pinnedBarToShow, ...listPageRows],
    totalPages: Math.max(1, Math.ceil(sortedAllPosts.length / postsPerPage)),
    pinnedCount: pinnedBarToShow.length,
    listPostsTotal: sortedAllPosts.length,
    createdAtPostNumbers,
  };
}

export function resolveBoardListPostNumber(
  row: BoardListRow,
  createdAtPostNumbers: Map<string, number>,
) {
  if (row.rowType === "pinned-bar") {
    return 0;
  }

  return createdAtPostNumbers.get(row.post.id) ?? 0;
}

export function getBoardListIndexForRow(
  row: BoardListRow,
  index: number,
  {
    pinnedCount,
    persistPinnedAcrossPages,
    showPinnedAlsoInList,
  }: {
    pinnedCount: number;
    persistPinnedAcrossPages: boolean;
    showPinnedAlsoInList: boolean;
  },
) {
  if (row.rowType === "list") {
    if (showPinnedAlsoInList || persistPinnedAcrossPages) {
      return Math.max(0, index - pinnedCount);
    }

    return index;
  }

  return 0;
}

export function shouldShowPinnedAsNotice(row: BoardListRow) {
  return row.rowType === "pinned-bar";
}
