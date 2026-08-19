"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canEditUserBoardComment, isAdminManagedComment } from "@/lib/board-comments";
import { DEFAULT_ADMIN_HIDDEN_POST_MESSAGE } from "@/lib/board-hidden-post";
import { getBoardReportReasons, requestBoardReportReason, submitBoardReport, alertReportSuccess } from "@/lib/board-reports";
import AdminActionReasonNotice from "@/components/AdminActionReasonNotice";
import { usePromptModal } from "@/components/PromptModalProvider";
import { getBoardVoterKey } from "@/lib/board-voter";
import { confirmDeletion, maybeAlertPasswordError, resolveBoardActionError, alertProfanityBlocked } from "@/lib/app-modal-messages";
import { containsProfanity } from "@/lib/profanity-filter";
import { BoardComment, SiteSettings, supabase } from "@/lib/supabase";

type BoardCommentsProps = {
  postId: string;
  interactionEnabled?: boolean;
  onEnableInteraction?: () => void;
  secretCommentsEnabled?: boolean;
  adminSecretMainVisibleEnabled?: boolean;
  adminSecretReplyParentUnlockEnabled?: boolean;
  reportReasons: string[];
  reportSuccessSettings?: Partial<SiteSettings> | null;
};

type CommentNode = BoardComment & {
  replies: CommentNode[];
};

const COMMENT_FIELDS =
  "id, post_id, parent_id, author_name, content, is_hidden, is_admin_managed, is_secret, admin_action_reason, created_at";

const REPLY_INDENT_CLASSES = ["", "ml-4 sm:ml-6", "ml-6 sm:ml-9", "ml-8 sm:ml-12", "ml-10 sm:ml-16"];

function replyIndentClass(depth: number) {
  return REPLY_INDENT_CLASSES[Math.min(depth, REPLY_INDENT_CLASSES.length - 1)];
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildCommentTree(comments: BoardComment[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>();

  for (const comment of comments) {
    nodes.set(comment.id, { ...comment, replies: [] });
  }

  const roots: CommentNode[] = [];

  for (const comment of comments) {
    const node = nodes.get(comment.id);
    if (!node) {
      continue;
    }

    if (comment.parent_id && nodes.has(comment.parent_id)) {
      nodes.get(comment.parent_id)!.replies.push(node);
    } else if (!comment.parent_id) {
      roots.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function isMissingRpcError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("could not find the function") ||
    lower.includes("pgrst202") ||
    lower.includes("schema cache")
  );
}

function mapRpcError(message: string) {
  if (isMissingRpcError(message)) {
    return "댓글 기능 SQL이 Supabase에 아직 없습니다. comment-replies.sql을 실행해 주세요.";
  }
  if (message.includes("Parent comment not found")) {
    return "원본 댓글을 찾을 수 없습니다.";
  }
  if (message.includes("Cannot reply to a reply")) {
    return "Supabase SQL Editor에서 comment-nested-replies.sql을 실행해 주세요.";
  }
  if (message.includes("Cannot delete admin comment")) {
    return "관리자가 작성한 댓글은 삭제할 수 없습니다.";
  }
  if (message.includes("Cannot update admin comment")) {
    return "관리자가 작성한 댓글은 수정할 수 없습니다.";
  }
  if (message.includes("Incorrect password")) {
    return "비밀번호가 일치하지 않습니다.";
  }
  if (message.includes("at least 4")) {
    return "비밀번호는 4자 이상이어야 합니다.";
  }
  if (message.includes("Voter key banned")) {
    return "현재 기기에서는 작성할 수 없습니다.";
  }
  if (message.includes("IP banned")) {
    return "현재 IP에서는 작성할 수 없습니다.";
  }
  if (message.includes("Secret comments are disabled")) {
    return "비밀 댓글 기능이 비활성화되어 있습니다.";
  }
  return message;
}

function mapApiError(message: string) {
  if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    return "Vercel 환경변수에 SUPABASE_SERVICE_ROLE_KEY를 추가하거나, Supabase SQL을 실행해 주세요.";
  }
  if (message.includes("board_comments table missing")) {
    return "Supabase SQL Editor에서 board-comments.sql을 실행해 주세요.";
  }
  if (message.includes("Cannot reply to a reply")) {
    return "Supabase SQL Editor에서 comment-nested-replies.sql을 실행해 주세요.";
  }
  if (message.includes("Cannot delete admin comment")) {
    return "관리자가 작성한 댓글은 삭제할 수 없습니다.";
  }
  if (message.includes("Cannot update admin comment")) {
    return "관리자가 작성한 댓글은 수정할 수 없습니다.";
  }
  if (message.includes("Incorrect password")) {
    return "비밀번호가 일치하지 않습니다.";
  }
  if (message.includes("at least 4")) {
    return "비밀번호는 4자 이상이어야 합니다.";
  }
  if (message.includes("Voter key banned")) {
    return "현재 기기에서는 작성할 수 없습니다.";
  }
  if (message.includes("IP banned")) {
    return "현재 IP에서는 작성할 수 없습니다.";
  }
  if (message.includes("Secret comments are disabled")) {
    return "비밀 댓글 기능이 비활성화되어 있습니다.";
  }
  return message;
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function sanitizePublicComments(
  comments: BoardComment[],
  secretEnabled: boolean,
  adminSecretMainVisibleEnabled: boolean,
) {
  if (!secretEnabled) {
    return comments;
  }

  return comments.map((comment) => {
    if (!comment.is_secret) {
      return comment;
    }

    if (adminSecretMainVisibleEnabled && isAdminManagedComment(comment)) {
      return comment;
    }

    return { ...comment, content: "" };
  });
}

export default function BoardComments({
  postId,
  interactionEnabled = false,
  onEnableInteraction,
  secretCommentsEnabled = false,
  adminSecretMainVisibleEnabled = false,
  adminSecretReplyParentUnlockEnabled = true,
  reportReasons,
  reportSuccessSettings,
}: BoardCommentsProps) {
  const { prompt, alert, confirm } = usePromptModal();
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [replyToComment, setReplyToComment] = useState<BoardComment | null>(null);

  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [writeIsSecret, setWriteIsSecret] = useState(false);

  const [unlockedContentCache, setUnlockedContentCache] = useState<Record<string, string>>({});
  const [secretUnlockCommentId, setSecretUnlockCommentId] = useState<string | null>(null);
  const [secretUnlockPassword, setSecretUnlockPassword] = useState("");
  const [secretUnlockMode, setSecretUnlockMode] = useState<"self" | "parent">("self");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [passwordPromptId, setPasswordPromptId] = useState<string | null>(null);
  const [editAuthorName, setEditAuthorName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const wasInteractionEnabled = useRef(interactionEnabled);

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  const loadComments = useCallback(async () => {
    setLoading(true);

    const { data: rpcData, error: rpcError } = await supabase.rpc("get_board_post_comments", {
      p_post_id: postId,
    });

    if (!rpcError) {
      const loaded = sanitizePublicComments(
        (rpcData as BoardComment[]) ?? [],
        secretCommentsEnabled,
        adminSecretMainVisibleEnabled,
      );
      setComments(loaded);
      setLoading(false);
      return loaded;
    }

    if (!isMissingRpcError(rpcError.message)) {
      setComments([]);
      setLoading(false);
      return [] as BoardComment[];
    }

    if (secretCommentsEnabled) {
      setComments([]);
      setLoading(false);
      return [] as BoardComment[];
    }

    const { data, error } = await supabase
      .from("board_comments")
      .select(COMMENT_FIELDS)
      .eq("post_id", postId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true });

    if (error?.message.includes("board_comments") && error.message.includes("does not exist")) {
      setComments([]);
      setLoading(false);
      return [] as BoardComment[];
    }

    const loaded = sanitizePublicComments(
      (data as BoardComment[]) ?? [],
      secretCommentsEnabled,
      adminSecretMainVisibleEnabled,
    );
    setComments(loaded);
    setLoading(false);
    return loaded;
  }, [postId, secretCommentsEnabled, adminSecretMainVisibleEnabled]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (wasInteractionEnabled.current && !interactionEnabled) {
      setShowWriteForm(false);
      setReplyToComment(null);
      resetWriteForm();
    }

    wasInteractionEnabled.current = interactionEnabled;
  }, [interactionEnabled]);

  function resetWriteForm() {
    setAuthorName("");
    setContent("");
    setPassword("");
    setWriteIsSecret(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setPasswordPromptId(null);
    setEditAuthorName("");
    setEditContent("");
    setEditPassword("");
  }

  function openWriteForm() {
    cancelEdit();
    setReplyToComment(null);
    resetWriteForm();
    setShowWriteForm(true);
    setMessage("");
  }

  function closeWriteForm() {
    setShowWriteForm(false);
    setReplyToComment(null);
    resetWriteForm();
    setMessage("");
  }

  function openReplyForm(comment: BoardComment) {
    if (!interactionEnabled) {
      onEnableInteraction?.();
    }
    cancelEdit();
    setShowWriteForm(false);
    setReplyToComment(comment);
    resetWriteForm();
    setMessage("");
  }

  useEffect(() => {
    if (!replyToComment) {
      return;
    }

    document
      .getElementById(`reply-form-${replyToComment.id}`)
      ?.scrollIntoView({ behavior: "auto", block: "nearest" });
  }, [replyToComment?.id]);

  function startEditPrompt(comment: BoardComment) {
    if (!canEditUserBoardComment(comment)) {
      setMessage("관리자가 작성한 댓글은 수정할 수 없습니다.");
      return;
    }

    if (!interactionEnabled) {
      onEnableInteraction?.();
    }

    setShowWriteForm(false);
    setReplyToComment(null);
    resetWriteForm();
    setPasswordPromptId(comment.id);
    setEditingId(null);
    setEditAuthorName(comment.author_name);
    setEditContent(comment.content);
    setEditPassword("");
    setMessage("");
    requestAnimationFrame(() => {
      document
        .getElementById(`board-comment-manage-${comment.id}`)
        ?.scrollIntoView({ behavior: "auto", block: "nearest" });
    });
  }

  async function verifyCommentPassword(comment: BoardComment) {
    if (!editPassword.trim()) {
      setMessage("비밀번호를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    if (secretCommentsEnabled && comment.is_secret) {
      const { data, error } = await supabase.rpc("unlock_secret_board_comment", {
        p_id: comment.id,
        p_password: editPassword,
      });

      if (error) {
        const failureMessage = error.message.includes("Incorrect password")
          ? "비밀번호가 일치하지 않습니다."
          : error.message.includes("Could not find the function")
            ? "Supabase에 board-secret-comments.sql을 실행해 주세요."
            : `확인 실패: ${mapRpcError(error.message)}`;

        if (await maybeAlertPasswordError(alert, failureMessage)) {
          setSubmitting(false);
          return;
        }

        setMessage(failureMessage);
        setSubmitting(false);
        return;
      }

      const unlockedContent = String(data ?? "");
      setUnlockedContentCache((prev) => ({ ...prev, [comment.id]: unlockedContent }));
      setEditingId(comment.id);
      setPasswordPromptId(null);
      setEditAuthorName(comment.author_name);
      setEditContent(unlockedContent);
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.rpc("update_user_board_comment", {
      p_id: comment.id,
      p_password: editPassword,
      p_author_name: comment.author_name,
      p_content: comment.content,
    });

    if (error) {
      if (isMissingRpcError(error.message)) {
        const response = await fetch(`/api/board/comments/${comment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: editPassword,
            author_name: comment.author_name,
            content: comment.content,
          }),
        });

        if (!response.ok) {
          const apiError = mapApiError(await readApiError(response));
          if (await maybeAlertPasswordError(alert, apiError)) {
            setSubmitting(false);
            return;
          }
          setMessage(`수정 실패: ${apiError}`);
          setSubmitting(false);
          return;
        }
      } else {
        const failureMessage = mapRpcError(error.message);
        if (await maybeAlertPasswordError(alert, failureMessage)) {
          setSubmitting(false);
          return;
        }
        setMessage(`수정 실패: ${failureMessage}`);
        setSubmitting(false);
        return;
      }
    }

    setEditingId(comment.id);
    setPasswordPromptId(null);
    setEditAuthorName(comment.author_name);
    setEditContent(comment.content);
    setSubmitting(false);
  }

  async function createCommentViaApi(parentId: string | null) {
    const response = await fetch(`/api/board/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author_name: authorName.trim(),
        content: content.trim(),
        password,
        parent_id: parentId,
        is_secret: secretCommentsEnabled && writeIsSecret,
        voter_key: getBoardVoterKey(),
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        ban_reason?: string | null;
        ban_type?: "ip" | "device" | null;
      };
      return {
        error: mapApiError(body.error ?? `HTTP ${response.status}`),
        ban_reason: body.ban_reason,
        ban_type: body.ban_type,
      };
    }

    return { ok: true as const };
  }

  async function updateCommentViaApi(commentId: string) {
    const response = await fetch(`/api/board/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author_name: editAuthorName.trim(),
        content: editContent.trim(),
        password: editPassword,
      }),
    });

    if (!response.ok) {
      return { error: mapApiError(await readApiError(response)) };
    }

    return { ok: true as const };
  }

  async function deleteCommentViaApi(commentId: string, deletePassword: string) {
    const response = await fetch(`/api/board/comments/${commentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePassword }),
    });

    if (!response.ok) {
      return { error: mapApiError(await readApiError(response)) };
    }

    return { ok: true as const };
  }

  async function handleReportComment(commentId: string) {
    const comment = comments.find((item) => item.id === commentId);
    if (!comment || isAdminManagedComment(comment)) {
      return;
    }

    const reason = await requestBoardReportReason(prompt, reportReasons);
    if (!reason) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      await submitBoardReport({ commentId, reason });
      await alertReportSuccess(alert, reportSuccessSettings);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "신고 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreate(e: FormEvent, parentId: string | null) {
    e.preventDefault();

    if (!authorName.trim() || !content.trim() || !password.trim()) {
      setMessage("작성자, 댓글, 비밀번호를 모두 입력해 주세요.");
      return;
    }

    if (containsProfanity(authorName, content)) {
      await alertProfanityBlocked(alert);
      return;
    }

    setSubmitting(true);
    setMessage("");

    const apiResult = await createCommentViaApi(parentId);

    if ("error" in apiResult) {
      if (
        await resolveBoardActionError(
          alert,
          apiResult.error ?? "등록에 실패했습니다.",
          apiResult.ban_reason,
          apiResult.ban_type,
        )
      ) {
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.rpc("create_user_board_comment", {
        p_post_id: postId,
        p_author_name: authorName.trim(),
        p_content: content.trim(),
        p_password: password,
        p_parent_id: parentId,
        p_is_secret: secretCommentsEnabled && writeIsSecret,
        p_voter_key: getBoardVoterKey(),
      });

      if (error) {
        const failureMessage = mapRpcError(error.message);
        if (await resolveBoardActionError(alert, failureMessage)) {
          setSubmitting(false);
          return;
        }
        setMessage(
          `${parentId ? "답글" : "댓글"} 등록 실패: ${
            isMissingRpcError(error.message)
              ? `${apiResult.error} (comment-replies.sql 실행 필요)`
              : mapRpcError(error.message)
          }`,
        );
        setSubmitting(false);
        return;
      }
    }

    resetWriteForm();
    setShowWriteForm(false);
    setReplyToComment(null);
    setMessage(parentId ? "답글이 등록되었습니다." : "댓글이 등록되었습니다.");

    await loadComments();
    setSubmitting(false);
  }

  async function handleUpdate(e: FormEvent, commentId: string) {
    e.preventDefault();

    const target = comments.find((comment) => comment.id === commentId);
    if (target && !canEditUserBoardComment(target)) {
      setMessage("관리자가 작성한 댓글은 수정할 수 없습니다.");
      return;
    }

    if (!editAuthorName.trim() || !editContent.trim() || !editPassword.trim()) {
      setMessage("작성자, 댓글, 비밀번호를 모두 입력해 주세요.");
      return;
    }

    if (containsProfanity(editAuthorName, editContent)) {
      await alertProfanityBlocked(alert);
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.rpc("update_user_board_comment", {
      p_id: commentId,
      p_password: editPassword,
      p_author_name: editAuthorName.trim(),
      p_content: editContent.trim(),
    });

    if (error) {
      if (isMissingRpcError(error.message)) {
        const apiResult = await updateCommentViaApi(commentId);
        if ("error" in apiResult) {
          if (await resolveBoardActionError(alert, apiResult.error ?? "")) {
            setSubmitting(false);
            return;
          }
          setMessage(`수정 실패: ${apiResult.error}`);
          setSubmitting(false);
          return;
        }
      } else {
        const failureMessage = mapRpcError(error.message);
        if (await maybeAlertPasswordError(alert, failureMessage)) {
          setSubmitting(false);
          return;
        }
        setMessage(`수정 실패: ${failureMessage}`);
        setSubmitting(false);
        return;
      }
    }

    cancelEdit();
    setMessage("댓글이 수정되었습니다.");
    await loadComments();
    setSubmitting(false);
  }

  async function handleDelete(commentId: string, deletePassword: string) {
    const target = comments.find((comment) => comment.id === commentId);
    if (target && isAdminManagedComment(target)) {
      setMessage("관리자가 작성한 댓글은 삭제할 수 없습니다.");
      return;
    }

    if (!deletePassword.trim()) {
      setMessage("삭제하려면 비밀번호를 입력해 주세요.");
      return;
    }

    const confirmed = await confirmDeletion(confirm, "이 댓글을 삭제하시겠습니까?");
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.rpc("delete_user_board_comment", {
      p_id: commentId,
      p_password: deletePassword,
    });

    if (error) {
      if (isMissingRpcError(error.message)) {
        const apiResult = await deleteCommentViaApi(commentId, deletePassword);
        if ("error" in apiResult) {
          const failureMessage = `삭제 실패: ${apiResult.error}`;
          if (await maybeAlertPasswordError(alert, apiResult.error ?? "")) {
            setSubmitting(false);
            return;
          }
          setMessage(failureMessage);
          setSubmitting(false);
          return;
        }
      } else {
        const failureMessage = mapRpcError(error.message);
        if (await maybeAlertPasswordError(alert, failureMessage)) {
          setSubmitting(false);
          return;
        }
        setMessage(`삭제 실패: ${failureMessage}`);
        setSubmitting(false);
        return;
      }
    }

    if (editingId === commentId || passwordPromptId === commentId) {
      cancelEdit();
    }

    if (replyToComment?.id === commentId) {
      setReplyToComment(null);
    }

    setMessage("댓글이 삭제되었습니다.");
    await loadComments();
    setSubmitting(false);
  }

  const isComposerOpen = showWriteForm || replyToComment !== null;

  async function handleUnlockSecretComment(commentId: string) {
    if (!secretUnlockPassword.trim()) {
      setMessage("비밀댓글 비밀번호를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    if (secretUnlockMode === "parent") {
      const { data, error } = await supabase.rpc(
        "unlock_admin_secret_reply_with_parent_password",
        {
          p_reply_id: commentId,
          p_parent_password: secretUnlockPassword,
        },
      );

      if (error) {
        const failureMessage = error.message.includes("Incorrect password")
          ? "비밀번호가 일치하지 않습니다."
          : error.message.includes("Parent unlock is disabled")
            ? "비밀댓글 작성자 관리자 답글 열람 기능이 비활성화되어 있습니다."
            : error.message.includes("Could not find the function")
              ? "Supabase에 board-secret-comment-developer-features.sql을 실행해 주세요."
              : `관리자 답글 열람 실패: ${mapRpcError(error.message)}`;

        if (await maybeAlertPasswordError(alert, failureMessage)) {
          setSubmitting(false);
          return;
        }

        setMessage(failureMessage);
        setSubmitting(false);
        return;
      }

      const unlockedContent = String(data ?? "");
      setUnlockedContentCache((prev) => ({ ...prev, [commentId]: unlockedContent }));
      setSecretUnlockCommentId(null);
      setSecretUnlockPassword("");
      setSecretUnlockMode("self");
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase.rpc("unlock_secret_board_comment", {
      p_id: commentId,
      p_password: secretUnlockPassword,
    });

    if (error) {
      const failureMessage = error.message.includes("Incorrect password")
        ? "비밀번호가 일치하지 않습니다."
        : error.message.includes("Could not find the function")
          ? "Supabase에 board-secret-comments.sql을 실행해 주세요."
          : `비밀댓글 열람 실패: ${mapRpcError(error.message)}`;

      if (await maybeAlertPasswordError(alert, failureMessage)) {
        setSubmitting(false);
        return;
      }

      setMessage(failureMessage);
      setSubmitting(false);
      return;
    }

    const unlockedContent = String(data ?? "");
    setUnlockedContentCache((prev) => ({ ...prev, [commentId]: unlockedContent }));
    setSecretUnlockCommentId(null);
    setSecretUnlockPassword("");
    setSecretUnlockMode("self");
    setSubmitting(false);
  }

  function openSecretUnlock(comment: BoardComment, mode: "self" | "parent") {
    setSecretUnlockMode(mode);
    setSecretUnlockCommentId(comment.id);
    setSecretUnlockPassword("");
    setMessage("");
  }

  function renderCommentCard(comment: BoardComment) {
    const isHiddenComment = Boolean(comment.is_hidden);
    const isPasswordPrompt = passwordPromptId === comment.id;
    const isEditing = editingId === comment.id;
    const isActive = isPasswordPrompt || isEditing;
    const isReplyTarget = replyToComment?.id === comment.id;
    const canWrite = interactionEnabled || isReplyTarget;
    const isSecretComment = Boolean(secretCommentsEnabled && comment.is_secret);
    const isAdminSecretComment = isSecretComment && isAdminManagedComment(comment);
    const parentComment = comment.parent_id
      ? (comments.find((item) => item.id === comment.parent_id) ?? null)
      : null;
    const parentIsSecret = Boolean(parentComment?.is_secret);
    const unlockedContent = unlockedContentCache[comment.id];
    const parentUnlockEnabled = secretCommentsEnabled && adminSecretReplyParentUnlockEnabled;
    const adminSecretVisibleOnMain = adminSecretMainVisibleEnabled && isAdminSecretComment;
    const canUnlockAdminSecretWithParentPassword =
      parentUnlockEnabled &&
      isAdminSecretComment &&
      !adminSecretVisibleOnMain &&
      parentIsSecret &&
      Boolean(comment.parent_id);
    const displayContent = isSecretComment
      ? isAdminSecretComment
        ? adminSecretVisibleOnMain
          ? (comment.content ?? "")
          : (unlockedContent ?? "")
        : (unlockedContent ?? "")
      : (unlockedContent ?? comment.content ?? "");
    const needsSecretUnlock = isSecretComment && !isAdminSecretComment && !displayContent.trim();
    const needsAdminSecretParentUnlock =
      canUnlockAdminSecretWithParentPassword && !displayContent.trim();
    const showAdminSecretBlockedMessage =
      isAdminSecretComment &&
      !adminSecretVisibleOnMain &&
      !needsAdminSecretParentUnlock &&
      !displayContent.trim();

    return (
      <div
        id={`board-comment-manage-${comment.id}`}
        className={`rounded-xl border bg-white p-4 transition ${
          isActive || isReplyTarget
            ? "border-emerald-300 ring-1 ring-emerald-100"
            : "border-gray-200"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {isSecretComment && (
              <span className="text-sm" aria-hidden>
                🔒
              </span>
            )}
            <p className="text-sm font-semibold text-gray-800">{comment.author_name}</p>
            {isSecretComment && (
              <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                비밀댓글
              </span>
            )}
            {isAdminManagedComment(comment) && (
              <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                관리자
              </span>
            )}
            {isHiddenComment && (
              <span className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                숨김
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{formatDate(comment.created_at)}</p>
        </div>
        {isHiddenComment ? (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-800">{DEFAULT_ADMIN_HIDDEN_POST_MESSAGE}</p>
            <AdminActionReasonNotice reason={comment.admin_action_reason} className="mt-3" />
          </div>
        ) : showAdminSecretBlockedMessage ? (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-800">관리자 비밀댓글입니다</p>
            <p className="mt-1 text-xs text-gray-600">내용은 열람할 수 없습니다.</p>
          </div>
        ) : needsAdminSecretParentUnlock ? (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-800">관리자 비밀답글입니다</p>
            <p className="mt-1 text-xs text-gray-600">
              원댓글 작성 시 설정한 비밀번호를 입력하면 관리자 답글을 볼 수 있습니다.
            </p>
            {secretUnlockCommentId === comment.id ? (
              <div className="mt-3 flex flex-col gap-2 min-[22rem]:flex-row min-[22rem]:items-center">
                <input
                  type="password"
                  value={secretUnlockPassword}
                  onChange={(e) => setSecretUnlockPassword(e.target.value)}
                  placeholder="원댓글 비밀번호"
                  className="min-w-0 w-full flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => void handleUnlockSecretComment(comment.id)}
                  disabled={submitting}
                  className="shrink-0 whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? "확인 중..." : "답글 보기"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSecretUnlockCommentId(null);
                    setSecretUnlockPassword("");
                    setSecretUnlockMode("self");
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openSecretUnlock(comment, "parent")}
                className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 sm:text-sm"
              >
                원댓글 비밀번호 입력
              </button>
            )}
          </div>
        ) : needsSecretUnlock ? (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-800">비밀댓글입니다</p>
            <p className="mt-1 text-xs text-gray-600">
              작성 시 설정한 비밀번호를 입력하면 내용을 볼 수 있습니다.
            </p>
            {secretUnlockCommentId === comment.id ? (
              <div className="mt-3 flex flex-col gap-2 min-[22rem]:flex-row min-[22rem]:items-center">
                <input
                  type="password"
                  value={secretUnlockPassword}
                  onChange={(e) => setSecretUnlockPassword(e.target.value)}
                  placeholder="비밀댓글 비밀번호"
                  className="min-w-0 w-full flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => void handleUnlockSecretComment(comment.id)}
                  disabled={submitting}
                  className="shrink-0 whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? "확인 중..." : "내용 보기"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSecretUnlockCommentId(null);
                    setSecretUnlockPassword("");
                    setSecretUnlockMode("self");
                  }}
                  className="shrink-0 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openSecretUnlock(comment, "self")}
                className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 sm:text-sm"
              >
                비밀번호 입력
              </button>
            )}
          </div>
        ) : (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700">
            {displayContent}
          </p>
        )}
        {!isHiddenComment && !isActive && !isReplyTarget && (
          <CommentActions
            submitting={submitting}
            showManageActions
            allowEdit={canEditUserBoardComment(comment)}
            allowDelete={!isAdminManagedComment(comment)}
            showReport={!isAdminManagedComment(comment)}
            onReply={() => openReplyForm(comment)}
            onEdit={() => startEditPrompt(comment)}
            onDelete={(deletePassword) => void handleDelete(comment.id, deletePassword)}
            onReport={() => void handleReportComment(comment.id)}
          />
        )}

        {isPasswordPrompt && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-semibold text-gray-800">댓글 수정</p>
            <p className="mt-1 text-xs text-gray-600">작성 시 설정한 비밀번호를 입력해 주세요.</p>
            <input
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void verifyCommentPassword(comment)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? "확인 중..." : "수정하기"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {isEditing && (
          <form
            onSubmit={(e) => void handleUpdate(e, comment.id)}
            className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3"
          >
            <p className="text-sm font-semibold text-gray-800">댓글 수정</p>
            <label className="mt-3 block text-sm font-medium text-gray-700">
              작성자
              <input
                value={editAuthorName}
                onChange={(e) => setEditAuthorName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-gray-700">
              댓글
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                required
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? "저장 중..." : "수정 저장"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </form>
        )}

        {canWrite && isReplyTarget && (
          <form
            id={`reply-form-${comment.id}`}
            onSubmit={(e) => void handleCreate(e, comment.id)}
            className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3"
          >
            <p className="text-sm font-semibold text-gray-800">답글 작성</p>
            <WriteFields
              authorName={authorName}
              content={content}
              password={password}
              secretCommentsEnabled={secretCommentsEnabled}
              isSecret={writeIsSecret}
              onIsSecretChange={setWriteIsSecret}
              onAuthorNameChange={setAuthorName}
              onContentChange={setContent}
              onPasswordChange={setPassword}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? "등록 중..." : "답글 등록"}
              </button>
              <button
                type="button"
                onClick={closeWriteForm}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                작성 취소
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  function renderCommentNode(node: CommentNode, depth = 0) {
    const indentClass = replyIndentClass(depth);

    return (
      <li key={node.id} className={`space-y-3 ${indentClass}`}>
        {renderCommentCard(node)}
        {node.replies.length > 0 && (
          <ul className="space-y-3">
            {node.replies.map((reply) => renderCommentNode(reply, depth + 1))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div className="board-comments mt-6 border-t border-gray-200 pt-5">
      <h4 className="text-base font-semibold text-gray-900">
        댓글 {comments.length > 0 ? `(${comments.length})` : ""}
      </h4>
      {!interactionEnabled && comments.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          답글·댓글 작성은 상단 <span className="font-medium text-emerald-700">댓글</span>{" "}
          버튼을 누르거나, 각 댓글의 <span className="font-medium text-emerald-700">답글</span>{" "}
          버튼을 눌러주세요.
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">댓글을 불러오는 중...</p>
      ) : comments.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">등록된 댓글이 없습니다.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {commentTree.map((node) => renderCommentNode(node))}
        </ul>
      )}

      {interactionEnabled && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          {showWriteForm && (
            <form
              onSubmit={(e) => void handleCreate(e, null)}
              className="board-comments__compose rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
            >
              <p className="text-sm font-semibold text-gray-800">새 댓글 달기</p>
              <p className="mt-1 text-xs text-gray-600">새 댓글을 작성해 주세요.</p>
              <WriteFields
                authorName={authorName}
                content={content}
                password={password}
                secretCommentsEnabled={secretCommentsEnabled}
                isSecret={writeIsSecret}
                onIsSecretChange={setWriteIsSecret}
                onAuthorNameChange={setAuthorName}
                onContentChange={setContent}
                onPasswordChange={setPassword}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? "등록 중..." : "댓글 등록"}
                </button>
                <button
                  type="button"
                  onClick={closeWriteForm}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  작성 취소
                </button>
              </div>
            </form>
          )}

          {!isComposerOpen && !passwordPromptId && !editingId && interactionEnabled && (
            <button
              type="button"
              onClick={openWriteForm}
              className="board-comments__compose-trigger w-full rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              + 새 댓글 달기
            </button>
          )}
        </div>
      )}

      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
    </div>
  );
}

function WriteFields({
  authorName,
  content,
  password,
  secretCommentsEnabled = false,
  isSecret = false,
  onIsSecretChange,
  onAuthorNameChange,
  onContentChange,
  onPasswordChange,
}: {
  authorName: string;
  content: string;
  password: string;
  secretCommentsEnabled?: boolean;
  isSecret?: boolean;
  onIsSecretChange?: (value: boolean) => void;
  onAuthorNameChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}) {
  return (
    <>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          작성자
          <input
            value={authorName}
            onChange={(e) => onAuthorNameChange(e.target.value)}
            required
            autoFocus={false}
            placeholder="닉네임 또는 이름"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            minLength={4}
            placeholder="수정/삭제 시 사용 (4자 이상)"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </label>
      </div>
      <label className="mt-3 block text-sm font-medium text-gray-700">
        댓글
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          required
          rows={3}
          autoFocus={false}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
      </label>
      {secretCommentsEnabled && (
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isSecret}
            onChange={(e) => onIsSecretChange?.(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          비밀댓글로 등록
        </label>
      )}
    </>
  );
}

function CommentActions({
  submitting,
  showManageActions,
  allowEdit,
  allowDelete,
  showReport = true,
  onReply,
  onEdit,
  onDelete,
  onReport,
}: {
  submitting: boolean;
  showManageActions: boolean;
  allowEdit: boolean;
  allowDelete: boolean;
  showReport?: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: (password: string) => void;
  onReport: () => void;
}) {
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onReply}
        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 sm:text-sm"
      >
        답글
      </button>
      {showManageActions && (allowEdit || allowDelete) && (
        <>
          {allowEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:text-sm"
            >
              수정
            </button>
          )}
          {allowDelete && (
            <button
              type="button"
              onClick={() => setDeleteOpen((prev) => !prev)}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 sm:text-sm"
            >
              {deleteOpen ? "삭제 취소" : "삭제"}
            </button>
          )}
        </>
      )}
      {showManageActions && allowDelete && deleteOpen && (
        <div className="flex w-full flex-col gap-2 min-[22rem]:flex-row min-[22rem]:items-center">
          <input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="비밀번호"
            className="min-w-0 w-full flex-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-400"
          />
          <button
            type="button"
            disabled={submitting}
            onClick={() => onDelete(deletePassword)}
            className="shrink-0 whitespace-nowrap rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            삭제 확인
          </button>
        </div>
      )}
      {showReport ? (
        <button
          type="button"
          disabled={submitting}
          onClick={onReport}
          className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 sm:text-sm"
        >
          신고
        </button>
      ) : null}
    </div>
  );
}
