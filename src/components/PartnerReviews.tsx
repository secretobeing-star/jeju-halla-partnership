"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  formatPartnerReviewDate,
  isAdminManagedPartnerReview,
  mapPartnerReviewRpcError,
  type PartnerReview,
} from "@/lib/partner-review";
import { requestBoardReportReason, submitBoardReport, alertReportSuccess } from "@/lib/board-reports";
import { confirmDeletion, alertWriteAccessDenied, fetchBoardWriteAccess, maybeAlertPasswordError, resolveBoardActionError, alertProfanityBlocked } from "@/lib/app-modal-messages";
import { containsProfanity } from "@/lib/profanity-filter";
import AdminActionReasonNotice from "@/components/AdminActionReasonNotice";
import { usePromptModal } from "@/components/PromptModalProvider";
import { getPartnerVoterKey } from "@/lib/partner-voter";
import type { HiddenReviewDisplay } from "@/lib/partner-hidden-review";
import { supabase, SiteSettings } from "@/lib/supabase";

type PartnerReviewsProps = {
  partnerId: string;
  reviewCount: number;
  enabled: boolean;
  hiddenReviewDisplay: HiddenReviewDisplay;
  onReviewCountChange: (partnerId: string, reviewCount: number) => void;
  defaultOpen?: boolean;
  panelLayout?: boolean;
  reportReasons: string[];
  reportSuccessSettings?: Partial<SiteSettings> | null;
};

export default function PartnerReviews({
  partnerId,
  reviewCount,
  enabled,
  hiddenReviewDisplay,
  onReviewCountChange,
  defaultOpen = false,
  panelLayout = false,
  reportReasons,
  reportSuccessSettings,
}: PartnerReviewsProps) {
  const { prompt, alert, confirm } = usePromptModal();
  const [open, setOpen] = useState(defaultOpen);
  const [reviews, setReviews] = useState<PartnerReview[]>([]);
  const [loading, setLoading] = useState(false);
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

  const loadReviews = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
      setMessage("");
    }

    const { data, error } = await supabase.rpc("get_partner_reviews", {
      p_partner_id: partnerId,
    });

    if (!options?.silent) {
      setLoading(false);
    }

    if (error) {
      setMessage(mapPartnerReviewRpcError(error.message));
      return;
    }

    setReviews((data as PartnerReview[]) ?? []);
  }, [partnerId]);

  useEffect(() => {
    if (open || panelLayout) {
      void loadReviews();
    }
  }, [open, panelLayout, loadReviews]);

  useEffect(() => {
    if ((!open && !panelLayout) || !enabled) {
      return;
    }

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
  }, [open, panelLayout, enabled, alert]);

  if (!enabled) {
    return null;
  }

  function cancelManage() {
    setPasswordPromptId(null);
    setEditingId(null);
    setEditAuthorName("");
    setEditContent("");
    setEditPassword("");
    setDeletePromptId(null);
    setDeletePassword("");
  }

  function cancelEdit() {
    cancelManage();
  }

  function startEditPrompt(review: PartnerReview) {
    cancelManage();
    setPasswordPromptId(review.id);
    setEditAuthorName(review.author_name);
    setEditContent(review.content);
    setEditPassword("");
    setMessage("");
    requestAnimationFrame(() => {
      document
        .getElementById(`partner-review-manage-${review.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function startDeletePrompt(review: PartnerReview) {
    cancelManage();
    setDeletePromptId(review.id);
    setMessage("");
    requestAnimationFrame(() => {
      document
        .getElementById(`partner-review-manage-${review.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  async function verifyReviewPassword(review: PartnerReview) {
    if (!editPassword.trim()) {
      setMessage("비밀번호를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.rpc("update_user_partner_review", {
      p_id: review.id,
      p_password: editPassword,
      p_author_name: review.author_name,
      p_content: review.content,
    });

    if (error) {
      const failureMessage = mapPartnerReviewRpcError(error.message);
      if (await maybeAlertPasswordError(alert, failureMessage)) {
        setSubmitting(false);
        return;
      }
      setMessage(failureMessage);
      setSubmitting(false);
      return;
    }

    setEditingId(review.id);
    setPasswordPromptId(null);
    setEditAuthorName(review.author_name);
    setEditContent(review.content);
    setSubmitting(false);
  }

  async function handleUpdate(e: FormEvent, reviewId: string) {
    e.preventDefault();

    if (!editAuthorName.trim() || !editContent.trim() || !editPassword.trim()) {
      setMessage("닉네임, 후기 내용, 비밀번호를 모두 입력해 주세요.");
      return;
    }

    if (containsProfanity(editAuthorName, editContent)) {
      await alertProfanityBlocked(alert);
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.rpc("update_user_partner_review", {
      p_id: reviewId,
      p_password: editPassword,
      p_author_name: editAuthorName.trim(),
      p_content: editContent.trim(),
    });

    setSubmitting(false);

    if (error) {
      const failureMessage = mapPartnerReviewRpcError(error.message);
      if (await resolveBoardActionError(alert, failureMessage)) {
        return;
      }
      setMessage(failureMessage);
      return;
    }

    cancelEdit();
    setMessage("후기가 수정되었습니다.");
    void loadReviews({ silent: true });
  }

  async function handleDelete(reviewId: string) {
    if (!deletePassword.trim()) {
      setMessage("비밀번호를 입력해 주세요.");
      return;
    }

    const confirmed = await confirmDeletion(confirm, "이 후기를 삭제하시겠습니까?");
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { data, error } = await supabase.rpc("delete_user_partner_review", {
      p_id: reviewId,
      p_password: deletePassword,
    });

    setSubmitting(false);

    if (error) {
      const failureMessage = mapPartnerReviewRpcError(error.message);
      if (await maybeAlertPasswordError(alert, failureMessage)) {
        return;
      }
      setMessage(failureMessage);
      return;
    }

    const result = data as { review_count?: number };
    if (typeof result.review_count === "number") {
      onReviewCountChange(partnerId, result.review_count);
    }

    cancelManage();
    setMessage("후기가 삭제되었습니다.");
    void loadReviews({ silent: true });
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

    const response = await fetch(`/api/partners/${partnerId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author_name: authorName.trim(),
        content: content.trim(),
        password,
        voter_key: getPartnerVoterKey(),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as {
        error?: string;
        ban_reason?: string | null;
        ban_type?: "ip" | "device" | null;
      };
      setSubmitting(false);
      if (
        await resolveBoardActionError(
          alert,
          payload.error ?? "후기 등록에 실패했습니다.",
          payload.ban_reason,
          payload.ban_type,
        )
      ) {
        return;
      }
      setMessage(payload.error ?? "후기 등록에 실패했습니다.");
      return;
    }

    const payload = (await response.json()) as {
      result?: { review_count?: number };
    };

    setSubmitting(false);

    if (typeof payload.result?.review_count === "number") {
      onReviewCountChange(partnerId, payload.result.review_count);
    }

    setContent("");
    setPassword("");
    setMessage("후기가 등록되었습니다.");
    void loadReviews({ silent: true });
  }

  async function handleReportReview(reviewId: string) {
    const review = reviews.find((item) => item.id === reviewId);
    if (!review || isAdminManagedPartnerReview(review)) {
      return;
    }

    const reason = await requestBoardReportReason(prompt, reportReasons);
    if (!reason) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      await submitBoardReport({ partnerReviewId: reviewId, reason });
      await alertReportSuccess(alert, reportSuccessSettings);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "신고 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {!panelLayout ? (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium sm:px-3 sm:py-2 sm:text-sm ${
            open
              ? "border-sky-500 bg-sky-500 text-white"
              : "border-sky-200 bg-sky-50 text-sky-800"
          }`}
        >
          후기 {reviewCount}
        </button>
      ) : null}

      {(panelLayout || open) && (
        <div
          className={[
            panelLayout ? "partner-reviews-panel" : "mt-1 basis-full rounded-xl border border-gray-200 bg-gray-50 p-3",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {loading ? (
            <p className="text-xs text-gray-500">후기 불러오는 중...</p>
          ) : reviews.length === 0 ? (
            <p className="text-xs text-gray-500">아직 후기가 없습니다. 첫 후기를 남겨 보세요.</p>
          ) : (
            <ul className={`space-y-2 overflow-y-auto ${panelLayout ? "" : "max-h-48"}`}>
              {reviews.map((review) => {
                const isHidden = Boolean(review.is_hidden);
                const displayAuthor = isHidden ? hiddenReviewDisplay.title : review.author_name;
                const displayContent = isHidden ? hiddenReviewDisplay.message : review.content;

                const isEditing = editingId === review.id;
                const isPasswordPrompt = passwordPromptId === review.id;
                const isDeletePrompt = deletePromptId === review.id;

                return (
                <li
                  key={review.id}
                  id={`partner-review-manage-${review.id}`}
                  className={`rounded-lg border bg-white px-3 py-2 text-xs sm:text-sm ${
                    isEditing || isPasswordPrompt || isDeletePrompt
                      ? "border-sky-300 ring-1 ring-sky-100"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">{displayAuthor}</span>
                      {isHidden && (
                        <span className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                          숨김
                        </span>
                      )}
                    </div>
                    <div className="partner-review-actions flex flex-wrap items-center gap-2">
                      {!isHidden && !isEditing && !isPasswordPrompt && !isDeletePrompt && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditPrompt(review)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:text-sm"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => startDeletePrompt(review)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 sm:text-sm"
                          >
                            삭제
                          </button>
                          {!isAdminManagedPartnerReview(review) ? (
                            <button
                              type="button"
                              onClick={() => void handleReportReview(review.id)}
                              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 sm:text-sm"
                            >
                              신고
                            </button>
                          ) : null}
                        </>
                      )}
                      <span className="text-[11px] text-gray-400">
                        {formatPartnerReviewDate(review.created_at)}
                      </span>
                    </div>
                  </div>

                  {!isEditing && !isPasswordPrompt && !isDeletePrompt ? (
                    <>
                      <p className="mt-1 whitespace-pre-line leading-relaxed text-gray-700">
                        {displayContent}
                      </p>
                      {isHidden && (
                        <AdminActionReasonNotice reason={review.admin_action_reason} className="mt-2" />
                      )}
                    </>
                  ) : null}

                  {isPasswordPrompt && (
                    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-800">후기 수정</p>
                      <p className="mt-1 text-[11px] text-gray-600">
                        작성 시 설정한 비밀번호를 입력해 주세요.
                      </p>
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="비밀번호 입력"
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400 sm:text-sm"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void verifyReviewPassword(review)}
                          className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-60 sm:text-sm"
                        >
                          {submitting ? "확인 중..." : "수정하기"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:text-sm"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <form
                      onSubmit={(e) => void handleUpdate(e, review.id)}
                      className="mt-3 space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3"
                    >
                      <p className="text-xs font-semibold text-gray-800">후기 수정</p>
                      <input
                        value={editAuthorName}
                        onChange={(e) => setEditAuthorName(e.target.value)}
                        placeholder="닉네임 또는 이름"
                        required
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400 sm:text-sm"
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="이용 후기를 입력하세요"
                        required
                        rows={3}
                        autoFocus={false}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400 sm:text-sm"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-60 sm:text-sm"
                        >
                          {submitting ? "저장 중..." : "수정 저장"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:text-sm"
                        >
                          취소
                        </button>
                      </div>
                    </form>
                  )}

                  {isDeletePrompt && (
                    <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3">
                      <p className="text-xs font-semibold text-red-700">후기 삭제</p>
                      <p className="mt-1 text-[11px] text-red-600">
                        작성 시 설정한 비밀번호를 입력해 주세요.
                      </p>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="비밀번호 입력"
                        className="mt-2 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-xs outline-none focus:border-red-400 sm:text-sm"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void handleDelete(review.id)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60 sm:text-sm"
                        >
                          {submitting ? "삭제 중..." : "삭제 확인"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelManage}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:text-sm"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </li>
                );
              })}
            </ul>
          )}

          {message && <p className="mt-3 text-xs text-sky-700">{message}</p>}

          <form
            onSubmit={handleSubmit}
            className={`mt-3 space-y-2 border-t border-gray-200 pt-3 ${panelLayout ? "partner-reviews-panel__form" : ""}`}
          >
            {!panelLayout ? <p className="text-xs font-semibold text-gray-800">후기 작성</p> : null}
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="닉네임 또는 이름"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400 sm:text-sm"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="이용 후기를 입력하세요"
              required
              rows={3}
              autoFocus={false}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400 sm:text-sm"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-60 sm:text-sm"
            >
              {submitting ? "등록 중..." : panelLayout ? "후기등록" : "후기 등록"}
            </button>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="수정/삭제용 비밀번호 (4자 이상)"
              required
              minLength={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400 sm:text-sm"
            />
          </form>
        </div>
      )}
    </>
  );
}
