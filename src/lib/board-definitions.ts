import { BoardDefinition, BoardPost, SiteSettings } from "@/lib/supabase";
import { normalizeBoardPostsPerPage } from "@/lib/pagination-settings";

export type { BoardDefinition };

export const NOTICE_BOARD_ID = "notice";

export function isNoticeBoard(boardId: string) {
  return boardId === NOTICE_BOARD_ID;
}

export const DEFAULT_BOARD_DEFINITIONS: BoardDefinition[] = [];

const MAX_BOARD_LABEL_LENGTH = 30;
const MAX_BOARDS = 10;
export const DEFAULT_BOARD_TAB_COLOR = "#10b981";

export function normalizeBoardColor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed : null;
}

export function getBoardTabColor(color: string | null | undefined): string {
  return normalizeBoardColor(color) ?? DEFAULT_BOARD_TAB_COLOR;
}

export function getBoardTabActiveStyle(color: string | null | undefined) {
  const tabColor = getBoardTabColor(color);

  return {
    borderBottomColor: tabColor,
    backgroundColor: `${tabColor}1a`,
    color: tabColor,
  };
}

export const DEFAULT_BOARD_SECTION_HEADER_COLOR = "#1f2937";

export function getBoardSectionHeaderColor(color: string | null | undefined): string {
  return normalizeBoardColor(color) ?? DEFAULT_BOARD_SECTION_HEADER_COLOR;
}

export function getBoardSectionHeaderStyles(color: string | null | undefined) {
  const customColor = normalizeBoardColor(color);
  if (!customColor) {
    return null;
  }

  return {
    bar: {
      backgroundColor: `${customColor}14`,
      borderBottomColor: `${customColor}33`,
    },
    title: {
      color: customColor,
    },
    button: {
      borderColor: `${customColor}40`,
      color: customColor,
    },
  };
}

function normalizeBoardId(value: string): string {
  return value.trim().slice(0, 40);
}

export function sanitizeBoardIdInput(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return slug || normalizeBoardId(value);
}

export function getBoardIdMigrations(
  previousBoards: BoardDefinition[],
  nextBoards: Array<BoardDefinition & { sourceId?: string }>,
): Array<{ from: string; to: string }> {
  const previousById = new Map(previousBoards.map((board) => [board.id, board]));
  const migrations: Array<{ from: string; to: string }> = [];

  for (const nextBoard of nextBoards) {
    const sourceId = nextBoard.sourceId ?? nextBoard.id;
    if (sourceId === nextBoard.id) {
      continue;
    }

    if (!previousById.has(sourceId)) {
      continue;
    }

    migrations.push({ from: sourceId, to: nextBoard.id });
  }

  return migrations;
}

export function hasDuplicateBoardIds(boards: BoardDefinition[]): boolean {
  const ids = boards.map((board) => board.id);
  return new Set(ids).size !== ids.length;
}

export function normalizeBoardLabel(
  value: string | null | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, MAX_BOARD_LABEL_LENGTH);
}

function isBoardDefinition(value: unknown): value is Partial<BoardDefinition> & {
  id: string;
  label: string;
  enabled: boolean;
  allow_user_posts: boolean;
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const board = value as Partial<BoardDefinition>;
  return (
    typeof board.id === "string" &&
    typeof board.label === "string" &&
    typeof board.enabled === "boolean" &&
    typeof board.allow_user_posts === "boolean"
  );
}

export function normalizeBoardDefinitions(raw: unknown): BoardDefinition[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<string>();
  const boards: BoardDefinition[] = [];

  for (const item of raw) {
    if (!isBoardDefinition(item)) {
      continue;
    }

    const id = normalizeBoardId(item.id);
    const label = normalizeBoardLabel(item.label, id);

    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    boards.push({
      id,
      label,
      enabled: item.enabled,
      allow_user_posts: item.allow_user_posts,
      posts_per_page: normalizeBoardPostsPerPage(item.posts_per_page),
      color: normalizeBoardColor(item.color),
    });

    if (boards.length >= MAX_BOARDS) {
      break;
    }
  }

  return boards;
}

export function getBoardDefinitions(
  settings?: Partial<SiteSettings> | null,
): BoardDefinition[] {
  if (settings?.board_definitions && settings.board_definitions.length > 0) {
    return normalizeBoardDefinitions(settings.board_definitions);
  }

  return [];
}

export function getVisibleBoards(boards: BoardDefinition[]): BoardDefinition[] {
  return boards.filter((board) => board.enabled);
}

export function getBoardLabel(boards: BoardDefinition[], boardId: string): string {
  return boards.find((board) => board.id === boardId)?.label ?? boardId;
}

export function isUserPostableBoard(
  boards: BoardDefinition[],
  boardId: string,
): boolean {
  const board = boards.find((item) => item.id === boardId);
  return Boolean(board?.enabled && board.allow_user_posts);
}

export function isUserManagedBoardPost(
  boards: BoardDefinition[],
  post: Pick<BoardPost, "board_type" | "is_admin_managed" | "author_name">,
): boolean {
  if (!isUserPostableBoard(boards, post.board_type)) {
    return false;
  }

  if (isAdminManagedBoardPost(post)) {
    return false;
  }

  return true;
}

export function isAdminManagedBoardPost(
  post: Pick<BoardPost, "is_admin_managed" | "author_name">,
): boolean {
  if (post.is_admin_managed) {
    return true;
  }

  return post.author_name.trim() === "관리자";
}

export function createBoardId(label: string, existingIds: string[]): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);

  const base = slug || `board-${Date.now().toString(36)}`;
  let id = base;
  let index = 1;

  while (existingIds.includes(id)) {
    id = `${base}-${index}`;
    index += 1;
  }

  return id;
}

export function getBoardPostsPerPage(
  boards: BoardDefinition[],
  boardId: string,
): number {
  const board = boards.find((item) => item.id === boardId);
  return normalizeBoardPostsPerPage(board?.posts_per_page);
}

export function getTabGridClass(count: number): string {
  if (count <= 1) {
    return "grid-cols-1";
  }
  if (count === 2) {
    return "grid-cols-2";
  }
  if (count === 3) {
    return "grid-cols-3";
  }
  if (count === 4) {
    return "grid-cols-2 sm:grid-cols-4";
  }

  return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
}
