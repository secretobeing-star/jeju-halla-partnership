import {
  formatBoardListTime,
  getCommentBadgeFontClass,
  isNewBoardPost,
  postContentHasImage,
} from "@/lib/board-list-format";
import {
  BOARD_PINNED_NOTICE_LABEL,
  getCommunityPinnedRowClasses,
} from "@/lib/board-pinned-posts";
import { getBoardCommunityGridClass } from "@/lib/board-community-grid";
import { BoardPost } from "@/lib/supabase";

type BoardCommunityPostRowProps = {
  post: BoardPost;
  boardLabel: string;
  commentCount: number;
  postNumber: number;
  reactionsEnabled: boolean;
  viewsEnabled?: boolean;
  isSecret?: boolean;
  isHidden?: boolean;
  isPinned?: boolean;
  displayTitle?: string;
  compactLayout?: boolean;
  onSelect: () => void;
};

function PostTitleIcons({
  isSecret,
  isPinned,
  hasImage,
  showPin,
}: {
  isSecret: boolean;
  isPinned: boolean;
  hasImage: boolean;
  showPin: boolean;
}) {
  return (
    <>
      {isSecret && (
        <span className="shrink-0 text-xs text-gray-500" aria-hidden>
          🔒
        </span>
      )}
      {showPin && isPinned && (
        <span className="shrink-0 text-xs text-emerald-700" aria-hidden>
          📌
        </span>
      )}
      {hasImage && (
        <span
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] text-gray-500"
          aria-hidden
        >
          🖼
        </span>
      )}
    </>
  );
}

function PostRowCommentSlot({ commentCount }: { commentCount: number }) {
  const showComment = commentCount > 0;

  return (
    <span className="inline-flex w-[1.375rem] shrink-0 justify-end tabular-nums">
      {showComment && (
        <span className={`font-medium text-red-500 ${getCommentBadgeFontClass(commentCount)}`}>
          [{commentCount}]
        </span>
      )}
    </span>
  );
}

function PostRowNewBadgeSlot({ isNew }: { isNew: boolean }) {
  return (
    <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
      {isNew && (
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold leading-none text-white">
          N
        </span>
      )}
    </span>
  );
}

function PostRowBadgeGroup({
  commentCount,
  isNew,
}: {
  commentCount: number;
  isNew: boolean;
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      <PostRowCommentSlot commentCount={commentCount} />
      <PostRowNewBadgeSlot isNew={isNew} />
    </span>
  );
}
function PostRowBadgeCell({
  commentCount,
  isNew,
}: {
  commentCount: number;
  isNew: boolean;
}) {
  const showComment = commentCount > 0;
  const showNew = isNew;

  if (!showComment && !showNew) {
    return (
      <span
        className="board-community-cell board-community-cell-badge flex items-center justify-center"
        aria-hidden
      />
    );
  }

  return (
    <span className="board-community-cell board-community-cell-badge inline-flex items-center justify-end">
      <PostRowBadgeGroup commentCount={commentCount} isNew={isNew} />
    </span>
  );
}

function PostRowAuthorGroup({
  authorName,
  commentCount,
  isNew,
}: {
  authorName: string;
  commentCount: number;
  isNew: boolean;
}) {
  return (
    <span
      className="board-community-cell board-community-cell-author text-gray-700"
      title={authorName}
    >
      <span className="board-community-author-inner">
        <span className="board-community-author-badges">
          <PostRowCommentSlot commentCount={commentCount} />
          <PostRowNewBadgeSlot isNew={isNew} />
        </span>
        <span className="board-community-author-name truncate">{authorName}</span>
      </span>
    </span>
  );
}

export default function BoardCommunityPostRow({
  post,
  boardLabel,
  commentCount,
  postNumber,
  reactionsEnabled,
  viewsEnabled = false,
  isSecret = false,
  isHidden = false,
  isPinned = false,
  displayTitle,
  compactLayout = false,
  onSelect,
}: BoardCommunityPostRowProps) {
  const isNew = isNewBoardPost(post.created_at);
  const hasImage = !isSecret && postContentHasImage(post.content);
  const likeCount = post.like_count ?? 0;
  const viewCount = post.view_count ?? 0;
  const titleText = displayTitle ?? post.title;

  const gridClass = getBoardCommunityGridClass({
    compact: compactLayout,
    viewsEnabled,
    reactionsEnabled,
  });
  const { rowClass: pinnedRowClass, hoverClass: pinnedHoverClass } =
    getCommunityPinnedRowClasses(isPinned);

  return (
    <li className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={onSelect}
        className={`board-community-row ${gridClass} ${pinnedRowClass} w-full text-left transition ${pinnedHoverClass}`}
      >
        <span className="board-community-cell board-community-cell-num tabular-nums text-gray-400">
          {isPinned ? (
            <span className="board-community-pinned-num font-bold text-emerald-700">
              {BOARD_PINNED_NOTICE_LABEL}
            </span>
          ) : (
            postNumber
          )}
        </span>

        {!compactLayout && (
          <span className="board-community-cell board-community-cell-category text-gray-700" title={boardLabel}>
            {boardLabel}
          </span>
        )}

        <span className="board-community-cell board-community-cell-title font-medium text-gray-900">
          <span
            className={
              compactLayout
                ? "flex min-w-0 flex-col gap-0.5"
                : "inline-flex min-w-0 max-w-full items-center gap-1"
            }
          >
            <span className="inline-flex min-w-0 max-w-full items-center gap-1">
              <PostTitleIcons
                isSecret={isSecret}
                isPinned={isPinned}
                hasImage={hasImage}
                showPin={!compactLayout && !isPinned}
              />
              <span className="board-community-title-text min-w-0 truncate" title={titleText}>
                {isHidden && (
                  <span className="mr-1 rounded border border-gray-300 bg-gray-100 px-1 py-0.5 text-[10px] font-medium text-gray-600">
                    숨김
                  </span>
                )}
                {titleText}
              </span>
            </span>
            {compactLayout && (
              <span
                className="board-community-author-sub min-w-0 truncate font-normal text-gray-500"
                title={post.author_name}
              >
                {post.author_name}
              </span>
            )}
          </span>
        </span>

        {compactLayout ? (
          <PostRowBadgeCell commentCount={commentCount} isNew={isNew} />
        ) : (
          <PostRowAuthorGroup
            authorName={post.author_name}
            commentCount={commentCount}
            isNew={isNew}
          />
        )}

        <span className="board-community-cell board-community-cell-time tabular-nums text-gray-500">
          {formatBoardListTime(post.created_at)}
        </span>

        {viewsEnabled && (
          <span
            className="board-community-cell board-community-cell-views tabular-nums text-gray-500"
            aria-label={`조회수 ${viewCount}`}
          >
            {viewCount}
          </span>
        )}

        {reactionsEnabled && (
          <span className="board-community-cell board-community-cell-rec tabular-nums text-gray-500">
            {likeCount}
          </span>
        )}
      </button>
    </li>
  );
}
