"use client";

import { CSSProperties, FormEvent } from "react";
import RichTextContent from "@/components/RichTextContent";
import BoardComments from "@/components/BoardComments";
import RichTextEditor from "@/components/RichTextEditor";
import AdminActionReasonNotice from "@/components/AdminActionReasonNotice";
import { isAdminManagedBoardPost } from "@/lib/board-definitions";
import { isPinnedPostForDetail } from "@/lib/board-pinned-posts";
import { BoardPost, SiteSettings } from "@/lib/supabase";

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type BoardPostDetailViewProps = {
  post: BoardPost;
  closeLabel: string;
  editorKeyPrefix: string;
  showEditForm: boolean;
  isAdminHidden: boolean;
  hiddenPostDisplay: { title: string; message: string };
  needsSecretUnlock: boolean;
  postContent: string | null;
  boardFontSizeStyle?: CSSProperties;
  secretUnlockPassword: string;
  onSecretUnlockPasswordChange: (value: string) => void;
  submitting: boolean;
  onUnlockSecretPost: () => void;
  postViewsEnabled: boolean;
  reactionsEnabled: boolean;
  userReaction: "like" | "dislike" | null;
  onReaction: (reaction: "like" | "dislike") => void;
  onClose: () => void;
  showComments: boolean;
  onToggleComments: () => void;
  canUserManage: boolean;
  showEditPrompt: boolean;
  onToggleEditPrompt: () => void;
  showDeleteForm: boolean;
  onToggleDeleteForm: () => void;
  editPassword: string;
  onEditPasswordChange: (value: string) => void;
  onVerifyEditPassword: () => void;
  deletePassword: string;
  onDeletePasswordChange: (value: string) => void;
  onDelete: () => void;
  secretCommentsEnabled: boolean;
  adminSecretMainVisibleEnabled: boolean;
  adminSecretReplyParentUnlockEnabled: boolean;
  onEnableComments: () => void;
  onEditSubmit: (e: FormEvent) => void;
  editTitle: string;
  onEditTitleChange: (value: string) => void;
  editAuthorName: string;
  onEditAuthorNameChange: (value: string) => void;
  editContent: string;
  onEditContentChange: (value: string) => void;
  onResetEditForm: () => void;
  message: string;
  mobileMediaUploadEnabled?: boolean;
  onReportPost?: () => void;
  reportReasons: string[];
  reportSuccessSettings?: Partial<SiteSettings> | null;
};

export default function BoardPostDetailView({
  post,
  closeLabel,
  editorKeyPrefix,
  showEditForm,
  isAdminHidden,
  hiddenPostDisplay,
  needsSecretUnlock,
  postContent,
  boardFontSizeStyle,
  secretUnlockPassword,
  onSecretUnlockPasswordChange,
  submitting,
  onUnlockSecretPost,
  postViewsEnabled,
  reactionsEnabled,
  userReaction,
  onReaction,
  onClose,
  showComments,
  onToggleComments,
  canUserManage,
  showEditPrompt,
  onToggleEditPrompt,
  showDeleteForm,
  onToggleDeleteForm,
  editPassword,
  onEditPasswordChange,
  onVerifyEditPassword,
  deletePassword,
  onDeletePasswordChange,
  onDelete,
  secretCommentsEnabled,
  adminSecretMainVisibleEnabled,
  adminSecretReplyParentUnlockEnabled,
  onEnableComments,
  onEditSubmit,
  editTitle,
  onEditTitleChange,
  editAuthorName,
  onEditAuthorNameChange,
  editContent,
  onEditContentChange,
  onResetEditForm,
  message,
  mobileMediaUploadEnabled = true,
  onReportPost,
  reportReasons,
  reportSuccessSettings,
}: BoardPostDetailViewProps) {
  return (
    <article className="board-post-detail-article rounded-xl border border-gray-200 bg-gray-50 p-4">
      {!showEditForm ? (
        <>
          <h3 className="text-lg font-bold text-gray-900">
            {!isAdminHidden && isPinnedPostForDetail(post) && (
              <span className="mr-1.5 text-base" aria-hidden>
                📌
              </span>
            )}
            {!isAdminHidden && post.is_secret && (
              <span className="mr-1.5 text-base" aria-hidden>
                🔒
              </span>
            )}
            {isAdminHidden ? hiddenPostDisplay.title : post.title}
          </h3>
          {!isAdminHidden && (
            <p className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-gray-500 sm:text-sm">
              <span>
                {post.author_name} · {formatDate(post.created_at)}
              </span>
              {post.is_secret && (
                <span className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                  비밀글
                </span>
              )}
              {isPinnedPostForDetail(post) && (
                <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                  고정
                </span>
              )}
              {post.is_hidden && (
                <span className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-700">
                  숨김
                </span>
              )}
              {postViewsEnabled && !post.is_hidden && (
                <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-800">
                  조회 {post.view_count ?? 0}
                </span>
              )}
            </p>
          )}
          <div className="mt-4 border-t border-gray-200 pt-4">
            {isAdminHidden ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="whitespace-pre-line text-sm font-medium text-gray-800">
                  {hiddenPostDisplay.message}
                </p>
                <AdminActionReasonNotice reason={post.admin_action_reason} className="mt-3" />
              </div>
            ) : needsSecretUnlock ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm font-medium text-gray-800">비밀글입니다</p>
                <p className="mt-1 text-xs text-gray-600">
                  작성 시 설정한 비밀번호를 입력하면 내용을 볼 수 있습니다.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="password"
                    value={secretUnlockPassword}
                    onChange={(e) => onSecretUnlockPasswordChange(e.target.value)}
                    placeholder="비밀글 비밀번호"
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => void onUnlockSecretPost()}
                    disabled={submitting}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {submitting ? "확인 중..." : "내용 보기"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="board-post-detail-content" style={boardFontSizeStyle}>
                <RichTextContent html={postContent ?? ""} />
              </div>
            )}
          </div>

          {!needsSecretUnlock && !isAdminHidden && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {postViewsEnabled && (
                <span className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
                  조회 {post.view_count ?? 0}
                </span>
              )}
              {reactionsEnabled && (
                <>
                  <button
                    type="button"
                    onClick={() => void onReaction("like")}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      userReaction === "like"
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    추천 {post.like_count ?? 0}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onReaction("dislike")}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      userReaction === "dislike"
                        ? "border-gray-500 bg-gray-500 text-white"
                        : "border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    비추천 {post.dislike_count ?? 0}
                  </button>
                </>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {closeLabel}
            </button>
            {!needsSecretUnlock && !isAdminHidden && (
              <button
                type="button"
                onClick={onToggleComments}
                aria-expanded={showComments}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  showComments
                    ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600"
                    : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {showComments ? "댓글 닫기" : "댓글"}
              </button>
            )}
            {!needsSecretUnlock && !isAdminHidden && canUserManage && (
              <>
                <button
                  type="button"
                  onClick={onToggleEditPrompt}
                  aria-expanded={showEditPrompt}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    showEditPrompt
                      ? "border-gray-500 bg-gray-600 text-white hover:bg-gray-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {showEditPrompt ? "수정 취소" : "수정"}
                </button>
                <button
                  type="button"
                  onClick={onToggleDeleteForm}
                  aria-expanded={showDeleteForm}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    showDeleteForm
                      ? "border-red-500 bg-red-500 text-white hover:bg-red-600"
                      : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  }`}
                >
                  {showDeleteForm ? "삭제 취소" : "삭제"}
                </button>
              </>
            )}
            {!needsSecretUnlock && !isAdminHidden && onReportPost && !isAdminManagedBoardPost(post) ? (
              <button
                type="button"
                onClick={onReportPost}
                disabled={submitting}
                className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-60"
              >
                신고
              </button>
            ) : null}
          </div>

          {showEditPrompt && canUserManage && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-800">게시글 수정</p>
              <p className="mt-1 text-xs text-gray-600">
                작성 시 설정한 비밀번호를 입력하면 수정할 수 있습니다.
              </p>
              <div className="mt-2 flex flex-col gap-2 min-[22rem]:flex-row min-[22rem]:items-center">
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => onEditPasswordChange(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="min-w-0 w-full flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => void onVerifyEditPassword()}
                  disabled={submitting}
                  className="shrink-0 whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? "확인 중..." : "수정하기"}
                </button>
              </div>
            </div>
          )}

          {showDeleteForm && canUserManage && (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">게시글 삭제</p>
              <p className="mt-1 text-xs text-red-600">
                작성 시 설정한 비밀번호를 입력해 주세요.
              </p>
              <div className="mt-2 flex flex-col gap-2 min-[22rem]:flex-row min-[22rem]:items-center">
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => onDeletePasswordChange(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="min-w-0 w-full flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
                />
                <button
                  type="button"
                  onClick={() => void onDelete()}
                  disabled={submitting}
                  className="shrink-0 whitespace-nowrap rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  삭제 확인
                </button>
              </div>
            </div>
          )}

          <div className="mt-4">
            {!needsSecretUnlock && !isAdminHidden && (
              <BoardComments
                postId={post.id}
                interactionEnabled={showComments}
                onEnableInteraction={onEnableComments}
                secretCommentsEnabled={secretCommentsEnabled}
                adminSecretMainVisibleEnabled={adminSecretMainVisibleEnabled}
                adminSecretReplyParentUnlockEnabled={adminSecretReplyParentUnlockEnabled}
                reportReasons={reportReasons}
                reportSuccessSettings={reportSuccessSettings}
              />
            )}
          </div>
        </>
      ) : (
        <form onSubmit={onEditSubmit} className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">게시글 수정</h3>
          <p className="text-xs text-emerald-700">비밀번호 확인이 완료되었습니다.</p>
          <label className="block text-sm font-medium text-gray-700">
            제목
            <input
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            작성자
            <input
              value={editAuthorName}
              onChange={(e) => onEditAuthorNameChange(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">내용</p>
            <RichTextEditor
              key={`edit-${editorKeyPrefix}-${post.id}`}
              value={editContent}
              onChange={onEditContentChange}
              mobileMediaUploadEnabled={mobileMediaUploadEnabled}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {closeLabel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? "저장 중..." : "수정 저장"}
            </button>
            <button
              type="button"
              onClick={onResetEditForm}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
    </article>
  );
}
