"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminActionReasonNotice from "@/components/AdminActionReasonNotice";
import { usePromptModal } from "@/components/PromptModalProvider";
import {
  alertProfanityBlocked,
  alertWriteAccessDenied,
  confirmDeletion,
  fetchBoardWriteAccess,
  maybeAlertPasswordError,
  resolveBoardActionError,
} from "@/lib/app-modal-messages";
import {
  alertReportSuccess,
  requestBoardReportReason,
  submitBoardReport,
} from "@/lib/board-reports";
import { getPartnerVoterKey } from "@/lib/partner-voter";
import type { HiddenReviewDisplay } from "@/lib/partner-hidden-review";
import { containsProfanity } from "@/lib/profanity-filter";
import {
  formatEventCommentDate,
  isAdminManagedEventComment,
  mapEventCommentRpcError,
} from "@/lib/site-event-comments";
import { SiteEventComment, SiteSettings, supabase } from "@/lib/supabase";

type EventCommentsProps = {
  tabId: string;
  reportReasons: string[];
  reportSuccessSettings?: Partial<SiteSettings> | null;
  hiddenCommentDisplay: HiddenReviewDisplay;
};

export default function EventComments({
  tabId,
  reportReasons,
  reportSuccessSettings,
  hiddenCommentDisplay,
}: EventCommentsProps) {
  const { prompt, alert, confirm } = usePromptModal();
  const [comments, setComments] = useState<SiteEventComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [passwordPromptId, setPasswordPromptId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAuthorName, setEditAuthorName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [deletePromptId, setDeletePromptId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  const loadComments = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
        setMessage("");
      }

      const { data, error } = await supabase
        .from("site_event_comments")
        .select(
          "id, tab_id, author_name, content, is_hidden, is_admin_managed, admin_action_reason, created_at",
        )
        .eq("tab_id", tabId)
        .order("created_at", { ascending: true });

      if (!options?.silent) {
        setLoading(false);
      }

      if (error) {
        // 구버전 스키마 폴백
        const fallback = await supabase
          .from("site_event_comments")
          .select("id, tab_id, author_name, content, is_hidden, created_at")
          .eq("tab_id", tabId)
          .eq("is_hidden", false)
          .order("created_at", { ascending: true });

        if (fallback.error) {
          setComments([]);
          setMessage(mapEventCommentRpcError(fallback.error.message));
          return;
        }

        setComments((fallback.data as SiteEventComment[]) ?? []);
        return;
      }

      setComments((data as SiteEventComment[]) ?? []);
    },
    [tabId],
  );

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useEffect(() => {
    let cancelled = false;

    void fetchBoardWriteAccess(getPartnerVoterKey()).then(async (access) => {
      if (cancelled || access.allowed) {
        return;
      }
      await alertWriteAccessDenied(alert, access);
    });

    return () => {
      cancelled = true;
    };
  }, [tabId, alert]);

  function cancelManage() {
    setPasswordPromptId(null);
    setEditingId(null);
    setEditAuthorName("");
    setEditContent("");
    setEditPassword("");
    setDeletePromptId(null);
    setDeletePassword("");
  }

  function startEditPrompt(comment: SiteEventComment) {
    if (isAdminManagedEventComment(comment)) {
      return;
    }
    cancelManage();
    setPasswordPromptId(comment.id);
    setEditAuthorName(comment.author_name);
    setEditContent(comment.content);
    setEditPassword("");
    setMessage("");
    requestAnimationFrame(() => {
      document
        .getElementById(`event-comment-manage-${comment.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function startDeletePrompt(comment: SiteEventComment) {
    if (isAdminManagedEventComment(comment)) {
      return;
    }
    cancelManage();
    setDeletePromptId(comment.id);
    setMessage("");
    requestAnimationFrame(() => {
      document
        .getElementById(`event-comment-manage-${comment.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  async function verifyCommentPassword(comment: SiteEventComment) {
    if (!editPassword.trim()) {
      setMessage("비밀번호를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.rpc("update_user_event_comment", {
      p_id: comment.id,
      p_password: editPassword,
      p_author_name: comment.author_name,
      p_content: comment.content,
    });

    if (error) {
      const failureMessage = mapEventCommentRpcError(error.message);
      if (await maybeAlertPasswordError(alert, failureMessage)) {
        setSubmitting(false);
        return;
      }
      setMessage(failureMessage);
      setSubmitting(false);
      return;
    }

    setEditingId(comment.id);
    setPasswordPromptId(null);
    setEditAuthorName(comment.author_name);
    setEditContent(comment.content);
    setSubmitting(false);
  }

  async function handleUpdate(e: FormEvent, commentId: string) {
    e.preventDefault();

    if (!editAuthorName.trim() || !editContent.trim() || !editPassword.trim()) {
      setMessage("닉네임, 댓글 내용, 비밀번호를 모두 입력해 주세요.");
      return;
    }

    if (containsProfanity(editAuthorName, editContent)) {
      await alertProfanityBlocked(alert);
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.rpc("update_user_event_comment", {
      p_id: commentId,
      p_password: editPassword,
      p_author_name: editAuthorName.trim(),
      p_content: editContent.trim(),
    });

    setSubmitting(false);

    if (error) {
      const failureMessage = mapEventCommentRpcError(error.message);
      if (await resolveBoardActionError(alert, failureMessage)) {
        return;
      }
      setMessage(failureMessage);
      return;
    }

    cancelManage();
    setMessage("댓글이 수정되었습니다.");
    void loadComments({ silent: true });
  }

  async function handleDelete(commentId: string) {
    if (!deletePassword.trim()) {
      setMessage("비밀번호를 입력해 주세요.");
      return;
    }

    const confirmed = await confirmDeletion(confirm, "이 댓글을 삭제하시겠습니까?");
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.rpc("delete_user_event_comment", {
      p_id: commentId,
      p_password: deletePassword,
    });

    setSubmitting(false);

    if (error) {
      const failureMessage = mapEventCommentRpcError(error.message);
      if (await maybeAlertPasswordError(alert, failureMessage)) {
        return;
      }
      setMessage(failureMessage);
      return;
    }

    cancelManage();
    setMessage("댓글이 삭제되었습니다.");
    void loadComments({ silent: true });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) {
      return;
    }

    if (containsProfanity(authorName, content)) {
      await alertProfanityBlocked(alert);
      return;
    }

    setSubmitting(true);
    setMessage("");

    const response = await fetch(`/api/events/tabs/${tabId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author_name: authorName.trim(),
        content: content.trim(),
        password,
        voter_key: getPartnerVoterKey(),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      ban_reason?: string | null;
      ban_type?: "ip" | "device" | null;
    };

    if (!response.ok) {
      setSubmitting(false);
      if (
        await resolveBoardActionError(
          alert,
          payload.error ?? "댓글 등록에 실패했습니다.",
          payload.ban_reason,
          payload.ban_type,
        )
      ) {
        return;
      }
      setMessage(payload.error ?? "댓글 등록에 실패했습니다.");
      return;
    }

    setSubmitting(false);
    setContent("");
    setPassword("");
    setMessage("댓글이 등록되었습니다.");
    void loadComments({ silent: true });
  }

  async function handleReportComment(commentId: string) {
    const comment = comments.find((item) => item.id === commentId);
    if (!comment || isAdminManagedEventComment(comment) || comment.is_hidden) {
      return;
    }

    const reason = await requestBoardReportReason(prompt, reportReasons);
    if (!reason) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      await submitBoardReport({ eventCommentId: commentId, reason });
      await alertReportSuccess(alert, reportSuccessSettings);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "신고 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="site-event-comments">
      <h3 className="site-event-comments__title">댓글 {comments.filter((c) => !c.is_hidden).length}</h3>

      {loading ? (
        <p className="site-event-comments__empty">불러오는 중...</p>
      ) : comments.length === 0 ? (
        <p className="site-event-comments__empty">아직 댓글이 없습니다. 첫 댓글을 남겨 보세요.</p>
      ) : (
        <ul className="site-event-comments__list">
          {comments.map((comment) => {
            const isHidden = Boolean(comment.is_hidden);
            const displayAuthor = isHidden ? hiddenCommentDisplay.title : comment.author_name;
            const displayContent = isHidden ? hiddenCommentDisplay.message : comment.content;
            const isEditing = editingId === comment.id;
            const isPasswordPrompt = passwordPromptId === comment.id;
            const isDeletePrompt = deletePromptId === comment.id;

            return (
              <li
                key={comment.id}
                id={`event-comment-manage-${comment.id}`}
                className={`site-event-comments__item${
                  isEditing || isPasswordPrompt || isDeletePrompt
                    ? " site-event-comments__item--active"
                    : ""
                }`}
              >
                <div className="site-event-comments__meta">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{displayAuthor}</strong>
                    {isHidden ? (
                      <span className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                        숨김
                      </span>
                    ) : null}
                  </div>
                  <div className="site-event-comments__actions">
                    {!isHidden && !isEditing && !isPasswordPrompt && !isDeletePrompt ? (
                      <>
                        {!isAdminManagedEventComment(comment) ? (
                          <>
                            <button type="button" onClick={() => startEditPrompt(comment)}>
                              수정
                            </button>
                            <button type="button" onClick={() => startDeletePrompt(comment)}>
                              삭제
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleReportComment(comment.id)}
                            >
                              신고
                            </button>
                          </>
                        ) : null}
                      </>
                    ) : null}
                    <span>{formatEventCommentDate(comment.created_at)}</span>
                  </div>
                </div>

                {!isEditing && !isPasswordPrompt && !isDeletePrompt ? (
                  <>
                    <p className="site-event-comments__content">{displayContent}</p>
                    {isHidden ? (
                      <AdminActionReasonNotice
                        reason={comment.admin_action_reason}
                        className="mt-2"
                      />
                    ) : null}
                  </>
                ) : null}

                {isPasswordPrompt ? (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-800">댓글 수정</p>
                    <p className="mt-1 text-[11px] text-gray-600">
                      작성 시 설정한 비밀번호를 입력해 주세요.
                    </p>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="비밀번호 입력"
                      className="site-event-comments__input mt-2"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void verifyCommentPassword(comment)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {submitting ? "확인 중..." : "수정하기"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelManage}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : null}

                {isEditing ? (
                  <form
                    onSubmit={(e) => void handleUpdate(e, comment.id)}
                    className="mt-3 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3"
                  >
                    <p className="text-xs font-semibold text-gray-800">댓글 수정</p>
                    <input
                      value={editAuthorName}
                      onChange={(e) => setEditAuthorName(e.target.value)}
                      placeholder="닉네임 또는 이름"
                      required
                      className="site-event-comments__input"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="댓글을 입력하세요"
                      required
                      rows={3}
                      className="site-event-comments__textarea"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {submitting ? "저장 중..." : "수정 저장"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelManage}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        취소
                      </button>
                    </div>
                  </form>
                ) : null}

                {isDeletePrompt ? (
                  <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3">
                    <p className="text-xs font-semibold text-red-700">댓글 삭제</p>
                    <p className="mt-1 text-[11px] text-red-600">
                      작성 시 설정한 비밀번호를 입력해 주세요.
                    </p>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="비밀번호 입력"
                      className="site-event-comments__input mt-2"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void handleDelete(comment.id)}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {submitting ? "삭제 중..." : "삭제 확인"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelManage}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {message ? <p className="site-event-comments__message">{message}</p> : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="site-event-comments__form">
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="닉네임 또는 이름"
          required
          maxLength={20}
          className="site-event-comments__input"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 입력해 주세요"
          required
          rows={3}
          className="site-event-comments__textarea"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="수정/삭제용 비밀번호 (4자 이상)"
          required
          minLength={4}
          maxLength={40}
          className="site-event-comments__input"
        />
        <button type="submit" disabled={submitting} className="site-event-comments__submit">
          {submitting ? "등록 중..." : "댓글 등록"}
        </button>
      </form>
    </div>
  );
}
