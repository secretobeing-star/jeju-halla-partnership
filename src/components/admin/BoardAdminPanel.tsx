"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import RichTextContent from "@/components/RichTextContent";
import RichTextEditor from "@/components/RichTextEditor";
import {
  ADMIN_COMMENT_PASSWORD_HASH,
  isAdminManagedComment,
} from "@/lib/board-comments";
import {
  BoardDefinition,
  DEFAULT_BOARD_DEFINITIONS,
  getBoardDefinitions,
  getBoardLabel,
} from "@/lib/board-definitions";
import {
  formatVoterKeyLabel,
  requestDeviceBanReason,
} from "@/lib/board-device-moderation";
import {
  BOARD_POST_STATUS,
  getBoardPostStatusLabel,
  normalizeBoardPostStatus,
  requestIpBanReason,
} from "@/lib/board-ip-moderation";
import { normalizeAdminPostsPerPage } from "@/lib/pagination-settings";
import Pagination from "@/components/Pagination";
import { adminApiFetch } from "@/lib/admin-api";
import { requestAdminSuspensionReason } from "@/lib/board-reports";
import { usePromptModal } from "@/components/PromptModalProvider";
import { BoardComment, BoardPost, BoardType, supabase } from "@/lib/supabase";

type CommentNode = BoardComment & {
  replies: CommentNode[];
};

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

const ADMIN_REPLY_INDENT_CLASSES = [
  "",
  "ml-4 border-l-2 border-emerald-100 pl-3",
  "ml-6 border-l-2 border-emerald-100 pl-3",
  "ml-8 border-l-2 border-emerald-100 pl-3",
  "ml-10 border-l-2 border-emerald-100 pl-3",
];

function adminReplyIndentClass(depth: number) {
  return ADMIN_REPLY_INDENT_CLASSES[Math.min(depth, ADMIN_REPLY_INDENT_CLASSES.length - 1)];
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR");
}

function generateAdminSecretCommentPassword() {
  return `adm-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function AdminPasswordBadge({
  password,
  visible,
}: {
  password?: string | null;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <p className="mt-1 text-xs font-medium text-amber-700">
      비밀번호: {password?.trim() ? password : "저장된 비밀번호 없음 (기능 활성화 이전 작성)"}
    </p>
  );
}

export default function BoardAdminPanel() {
  const { prompt } = usePromptModal();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [commentsByPostId, setCommentsByPostId] = useState<Record<string, BoardComment[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BoardType | "all">("all");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("관리자");
  const [content, setContent] = useState("");
  const [boardType, setBoardType] = useState<BoardType>("notice");
  const [boardDefinitions, setBoardDefinitions] = useState<BoardDefinition[]>(
    DEFAULT_BOARD_DEFINITIONS,
  );
  const [adminPasswordVisible, setAdminPasswordVisible] = useState(false);
  const [postsPaginationEnabled, setPostsPaginationEnabled] = useState(false);
  const [postsPerPage, setPostsPerPage] = useState(10);
  const [postsListPage, setPostsListPage] = useState(1);
  const [secretCommentsEnabled, setSecretCommentsEnabled] = useState(false);
  const [ipModerationEnabled, setIpModerationEnabled] = useState(false);
  const [deviceModerationEnabled, setDeviceModerationEnabled] = useState(false);

  useEffect(() => {
    void supabase
      .from("site_settings")
      .select(
        "board_definitions, board_notice_label, board_free_label, board_inquiry_label, free_board_enabled, inquiry_board_enabled, admin_user_password_visible, admin_posts_list_pagination_enabled, admin_posts_per_page, board_secret_comments_enabled, board_ip_moderation_enabled, board_device_moderation_enabled",
      )
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        setAdminPasswordVisible(data?.admin_user_password_visible ?? false);
        setSecretCommentsEnabled(data?.board_secret_comments_enabled ?? false);
        setIpModerationEnabled(data?.board_ip_moderation_enabled ?? false);
        setDeviceModerationEnabled(data?.board_device_moderation_enabled ?? false);
        setPostsPaginationEnabled(data?.admin_posts_list_pagination_enabled ?? false);
        setPostsPerPage(normalizeAdminPostsPerPage(data?.admin_posts_per_page));
        const boards = getBoardDefinitions(data);
        setBoardDefinitions(boards);
        if (boards.length > 0) {
          setBoardType((current) =>
            boards.some((board) => board.id === current) ? current : boards[0].id,
          );
        }
      });
  }, []);

  const boardTypes = useMemo(
    () => boardDefinitions.map((board) => board.id),
    [boardDefinitions],
  );

  useEffect(() => {
    setPostsListPage(1);
  }, [filter, postsPaginationEnabled, postsPerPage]);

  const postsTotalPages = useMemo(
    () => Math.max(1, Math.ceil(posts.length / postsPerPage)),
    [posts.length, postsPerPage],
  );

  useEffect(() => {
    if (postsListPage > postsTotalPages) {
      setPostsListPage(postsTotalPages);
    }
  }, [postsListPage, postsTotalPages]);

  const displayedPosts = useMemo(() => {
    if (!postsPaginationEnabled) {
      return posts;
    }

    const start = (postsListPage - 1) * postsPerPage;
    return posts.slice(start, start + postsPerPage);
  }, [posts, postsPaginationEnabled, postsPerPage, postsListPage]);

  const loadPosts = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("board_posts")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("pinned_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("board_type", filter);
    }

    const { data: postData } = await query;
    const loadedPosts = (postData as BoardPost[]) ?? [];
    setPosts(loadedPosts);

    if (loadedPosts.length === 0) {
      setCommentsByPostId({});
      setLoading(false);
      return;
    }

    const postIds = loadedPosts.map((post) => post.id);
    const { data: commentData, error: commentError } = await supabase
      .from("board_comments")
      .select("id, post_id, parent_id, author_name, content, is_hidden, is_admin_managed, is_secret, admin_visible_password, user_ip, voter_key, created_at")
      .in("post_id", postIds)
      .order("created_at", { ascending: true });

    if (commentError) {
      setCommentsByPostId({});
      setLoading(false);
      return;
    }

    const grouped: Record<string, BoardComment[]> = {};

    for (const comment of (commentData as BoardComment[]) ?? []) {
      if (!grouped[comment.post_id]) {
        grouped[comment.post_id] = [];
      }
      grouped[comment.post_id].push(comment);
    }

    setCommentsByPostId(grouped);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setAuthorName("관리자");
    setContent("");
    setBoardType(boardDefinitions[0]?.id ?? "notice");
  }

  function startEdit(post: BoardPost) {
    setEditingId(post.id);
    setTitle(post.title);
    setAuthorName(post.author_name);
    setContent(post.content ?? "");
    setBoardType(post.board_type);
    setMessage("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!title.trim() || !authorName.trim() || !content.trim()) {
      setMessage("제목, 작성자, 내용을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      board_type: boardType,
      title: title.trim(),
      author_name: authorName.trim(),
      content,
      is_hidden: false,
    };

    const payloadWithAdminFlag = { ...payload, is_admin_managed: true };

    let result = editingId
      ? await supabase.from("board_posts").update(payloadWithAdminFlag).eq("id", editingId)
      : await supabase.from("board_posts").insert(payloadWithAdminFlag);

    if (result.error?.message.includes("is_admin_managed")) {
      result = editingId
        ? await supabase.from("board_posts").update(payload).eq("id", editingId)
        : await supabase.from("board_posts").insert(payload);
    }

    const { error } = result;

    if (error) {
      setMessage(`저장 실패: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage(editingId ? "게시글이 수정되었습니다." : "게시글이 등록되었습니다.");
    resetForm();
    await loadPosts();
    setSaving(false);
  }

  async function toggleHidden(post: BoardPost) {
    if (!post.is_hidden) {
      const actionReason = await requestAdminSuspensionReason(prompt, "정지");
      if (actionReason === null) {
        return;
      }

      const { error } = await supabase
        .from("board_posts")
        .update({
          is_hidden: true,
          admin_action_reason: actionReason || null,
        })
        .eq("id", post.id);

      if (error) {
        setMessage(
          error.message.includes("admin_action_reason")
            ? "Supabase SQL Editor에서 content-admin-action-reason.sql을 실행해 주세요."
            : `상태 변경 실패: ${error.message}`,
        );
        return;
      }
    } else {
      const { error } = await supabase
        .from("board_posts")
        .update({ is_hidden: false, admin_action_reason: null })
        .eq("id", post.id);

      if (error) {
        setMessage(`상태 변경 실패: ${error.message}`);
        return;
      }
    }

    await loadPosts();
  }

  async function updatePostModerationStatus(post: BoardPost, nextStatus: number) {
    const hidePost = nextStatus >= BOARD_POST_STATUS.tempHidden;

    const { error } = await supabase
      .from("board_posts")
      .update({ status: nextStatus, is_hidden: hidePost })
      .eq("id", post.id);

    if (error) {
      setMessage(
        error.message.includes("status")
          ? "Supabase SQL Editor에서 supabase/board-ip-moderation.sql을 실행해 주세요."
          : `상태 변경 실패: ${error.message}`,
      );
      return;
    }

    setMessage("게시글 IP 관리 상태를 변경했습니다.");
    await loadPosts();
  }

  async function banPostIp(post: BoardPost) {
    const ip = post.user_ip?.trim();
    if (!ip) {
      setMessage("저장된 IP가 없습니다.");
      return;
    }

    const actionReason = await requestIpBanReason(prompt);
    if (actionReason === null) {
      return;
    }

    const { error } = await supabase.from("banned_ips").insert({
      ip_address: ip,
      reason: actionReason.trim() || `게시글 "${post.title}"에서 차단`,
    });

    if (error) {
      setMessage(
        error.message.includes("duplicate")
          ? "이미 차단된 IP입니다."
          : error.message.includes("banned_ips")
            ? "Supabase SQL Editor에서 supabase/board-ip-moderation.sql을 실행해 주세요."
            : `IP 차단 실패: ${error.message}`,
      );
      return;
    }

    setMessage(`${ip} IP를 차단 목록에 추가했습니다.`);
  }

  async function banPostDevice(post: BoardPost) {
    const voterKey = post.voter_key?.trim();
    if (!voterKey || voterKey.length < 8) {
      setMessage("저장된 기기 키가 없습니다.");
      return;
    }

    const actionReason = await requestDeviceBanReason(prompt);
    if (actionReason === null) {
      return;
    }

    const { error } = await supabase.from("banned_voter_keys").insert({
      voter_key: voterKey,
      reason: actionReason.trim() || `게시글 "${post.title}"에서 차단`,
    });

    if (error) {
      setMessage(
        error.message.includes("duplicate")
          ? "이미 차단된 기기입니다."
          : error.message.includes("banned_voter_keys")
            ? "Supabase SQL Editor에서 supabase/device-voter-key-ban.sql을 실행해 주세요."
            : `기기 차단 실패: ${error.message}`,
      );
      return;
    }

    setMessage("기기를 차단 목록에 추가했습니다.");
  }

  async function togglePinned(post: BoardPost) {
    const nextPinned = !post.is_pinned;

    try {
      await adminApiFetch(`/api/admin/board-posts/${post.id}/pin`, {
        method: "PATCH",
        body: JSON.stringify({ pinned: nextPinned }),
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `고정 설정 실패: ${error.message}`
          : "고정 설정 실패: 알 수 없는 오류가 발생했습니다.",
      );
      return;
    }

    setMessage(nextPinned ? "게시글이 상단에 고정되었습니다." : "게시글 고정이 해제되었습니다.");

    if (postsPaginationEnabled) {
      setPostsListPage(1);
    }

    await loadPosts();
  }

  async function deletePost(id: string) {
    if (!window.confirm("이 게시글을 삭제하시겠습니까? 댓글도 함께 삭제됩니다.")) {
      return;
    }

    const { error } = await supabase.from("board_posts").delete().eq("id", id);

    if (error) {
      setMessage(`삭제 실패: ${error.message}`);
      return;
    }

    if (editingId === id) {
      resetForm();
    }

    await loadPosts();
  }

  async function banCommentIp(comment: BoardComment, postTitle: string) {
    const ip = comment.user_ip?.trim();
    if (!ip) {
      setMessage("저장된 IP가 없습니다.");
      return;
    }

    const actionReason = await requestIpBanReason(prompt);
    if (actionReason === null) {
      return;
    }

    const { error } = await supabase.from("banned_ips").insert({
      ip_address: ip,
      reason: actionReason.trim() || `댓글 "${postTitle}" / ${comment.author_name}에서 차단`,
    });

    if (error) {
      setMessage(
        error.message.includes("duplicate")
          ? "이미 차단된 IP입니다."
          : error.message.includes("banned_ips")
            ? "Supabase SQL Editor에서 supabase/board-ip-moderation.sql을 실행해 주세요."
            : `IP 차단 실패: ${error.message}`,
      );
      return;
    }

    setMessage(`${ip} IP를 차단 목록에 추가했습니다.`);
  }

  async function banCommentDevice(comment: BoardComment, postTitle: string) {
    const voterKey = comment.voter_key?.trim();
    if (!voterKey || voterKey.length < 8) {
      setMessage("저장된 기기 키가 없습니다.");
      return;
    }

    const actionReason = await requestDeviceBanReason(prompt);
    if (actionReason === null) {
      return;
    }

    const { error } = await supabase.from("banned_voter_keys").insert({
      voter_key: voterKey,
      reason: actionReason.trim() || `댓글 "${postTitle}" / ${comment.author_name}에서 차단`,
    });

    if (error) {
      setMessage(
        error.message.includes("duplicate")
          ? "이미 차단된 기기입니다."
          : error.message.includes("banned_voter_keys")
            ? "Supabase SQL Editor에서 supabase/device-voter-key-ban.sql을 실행해 주세요."
            : `기기 차단 실패: ${error.message}`,
      );
      return;
    }

    setMessage("기기를 차단 목록에 추가했습니다.");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <AdminCollapsibleSection
          title={editingId ? "게시글 수정" : "게시글 작성 (관리자)"}
          headerActions={
            editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                작성 취소
              </button>
            ) : undefined
          }
        >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            게시판
            <select
              value={boardType}
              onChange={(e) => setBoardType(e.target.value as BoardType)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            >
              {boardTypes.map((type) => (
                <option key={type} value={type}>
                  {getBoardLabel(boardDefinitions, type)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-gray-700">
            작성자
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
            제목
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-gray-700">내용</p>
          <RichTextEditor
            key={editingId ?? `new-${boardType}`}
            value={content}
            onChange={setContent}
            minHeightClassName="min-h-48"
          />
        </div>

        {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? "저장 중..." : editingId ? "수정 저장" : "등록하기"}
        </button>
        </AdminCollapsibleSection>
      </form>

      <AdminCollapsibleSection
        title="게시글 관리"
        description={
          <>
            관리자가 작성한 댓글·답글은 수정·삭제할 수 있습니다. 고정한 게시글은 메인 화면의 모든
            게시판 목록 상단에 표시됩니다.
            {postsPaginationEnabled && posts.length > 0 && (
              <span className="mt-1 block text-amber-700">
                총 {posts.length}개 · {postsListPage}/{postsTotalPages} 페이지 (개발자 모드 Beta)
              </span>
            )}
          </>
        }
        headerActions={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as BoardType | "all")}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="all">전체 게시판</option>
            {boardTypes.map((type) => (
              <option key={type} value={type}>
                {getBoardLabel(boardDefinitions, type)}
              </option>
            ))}
          </select>
        }
        contentClassName="p-0"
      >
        {loading ? (
          <p className="px-6 py-8 text-sm text-gray-500">불러오는 중...</p>
        ) : posts.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500">게시글이 없습니다.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayedPosts.map((post) => {
              const postComments = commentsByPostId[post.id] ?? [];

              return (
              <article key={post.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {getBoardLabel(boardDefinitions, post.board_type)}
                      </span>
                      {post.is_hidden && (
                        <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          숨김
                        </span>
                      )}
                      {post.is_pinned && (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          고정
                        </span>
                      )}
                      {ipModerationEnabled && (
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                            normalizeBoardPostStatus(post.status) >= BOARD_POST_STATUS.permanentHidden
                              ? "bg-red-100 text-red-800"
                              : normalizeBoardPostStatus(post.status) >= BOARD_POST_STATUS.tempHidden
                                ? "bg-orange-100 text-orange-800"
                                : normalizeBoardPostStatus(post.status) === BOARD_POST_STATUS.warning
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {getBoardPostStatusLabel(post.status)}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-semibold text-gray-900">{post.title}</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {post.author_name} · {formatDate(post.created_at)}
                      <span className="ml-2">조회 {post.view_count ?? 0}</span>
                      {ipModerationEnabled && post.user_ip ? (
                        <span className="ml-2 font-mono">IP {post.user_ip}</span>
                      ) : null}
                    </p>
                    <AdminPasswordBadge
                      password={post.admin_visible_password}
                      visible={adminPasswordVisible}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(post)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => void togglePinned(post)}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        post.is_pinned
                          ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                          : "border-gray-200 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {post.is_pinned ? "고정 해제" : "고정"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleHidden(post)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {post.is_hidden ? "표시" : "숨김"}
                    </button>
                    {ipModerationEnabled && post.user_ip ? (
                      <>
                        <select
                          value={normalizeBoardPostStatus(post.status)}
                          onChange={(event) =>
                            void updatePostModerationStatus(post, Number(event.target.value))
                          }
                          className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                          aria-label="IP 관리 상태"
                        >
                          <option value={BOARD_POST_STATUS.normal}>정상</option>
                          <option value={BOARD_POST_STATUS.warning}>1차 경고</option>
                          <option value={BOARD_POST_STATUS.tempHidden}>2차 임시숨김</option>
                          <option value={BOARD_POST_STATUS.permanentHidden}>3차 영구숨김</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => void banPostIp(post)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                        >
                          IP 차단
                        </button>
                      </>
                    ) : null}
                    {deviceModerationEnabled && post.voter_key && post.voter_key.trim().length >= 8 ? (
                      <button
                        type="button"
                        onClick={() => void banPostDevice(post)}
                        className="rounded-lg border border-violet-200 px-3 py-1.5 text-sm text-violet-700 hover:bg-violet-50"
                      >
                        기기 차단
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void deletePost(post.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-white p-3">
                  <RichTextContent html={post.content ?? ""} className="text-sm" />
                </div>

                <AdminPostComments
                  postId={post.id}
                  postTitle={post.title}
                  comments={postComments}
                  secretCommentsEnabled={secretCommentsEnabled}
                  adminPasswordVisible={adminPasswordVisible}
                  ipModerationEnabled={ipModerationEnabled}
                  deviceModerationEnabled={deviceModerationEnabled}
                  onMessage={setMessage}
                  onRefresh={loadPosts}
                  onBanCommentIp={banCommentIp}
                  onBanCommentDevice={banCommentDevice}
                />
              </article>
              );
            })}
          </div>
        )}

        {postsPaginationEnabled && posts.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-4">
            <Pagination
              currentPage={postsListPage}
              totalPages={postsTotalPages}
              onPageChange={setPostsListPage}
            />
          </div>
        )}
      </AdminCollapsibleSection>
    </div>
  );
}

type AdminPostCommentsProps = {
  postId: string;
  postTitle: string;
  comments: BoardComment[];
  secretCommentsEnabled: boolean;
  adminPasswordVisible: boolean;
  ipModerationEnabled: boolean;
  deviceModerationEnabled: boolean;
  onMessage: (message: string) => void;
  onRefresh: () => Promise<void>;
  onBanCommentIp: (comment: BoardComment, postTitle: string) => Promise<void>;
  onBanCommentDevice: (comment: BoardComment, postTitle: string) => Promise<void>;
};

function AdminPostComments({
  postId,
  postTitle,
  comments,
  secretCommentsEnabled,
  adminPasswordVisible,
  ipModerationEnabled,
  deviceModerationEnabled,
  onMessage,
  onRefresh,
  onBanCommentIp,
  onBanCommentDevice,
}: AdminPostCommentsProps) {
  const { prompt } = usePromptModal();
  const [composerMode, setComposerMode] = useState<"idle" | "new" | "reply">("idle");
  const [replyTarget, setReplyTarget] = useState<BoardComment | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("관리자");
  const [content, setContent] = useState("");
  const [editAuthorName, setEditAuthorName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [writeIsSecret, setWriteIsSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  useEffect(() => {
    if (composerMode !== "reply" || !replyTarget) {
      return;
    }

    const refreshed = comments.find((comment) => comment.id === replyTarget.id);
    if (refreshed) {
      setReplyTarget(refreshed);
    } else {
      closeComposer();
    }
  }, [comments, composerMode, replyTarget?.id]);

  function closeComposer() {
    setComposerMode("idle");
    setReplyTarget(null);
    setAuthorName("관리자");
    setContent("");
    setWriteIsSecret(false);
  }

  function closeEditComposer() {
    setEditingCommentId(null);
    setEditAuthorName("");
    setEditContent("");
  }

  function openNewComposer() {
    closeEditComposer();
    setComposerMode("new");
    setReplyTarget(null);
    setAuthorName("관리자");
    setContent("");
  }

  function openReplyComposer(comment: BoardComment) {
    closeEditComposer();
    setComposerMode("reply");
    setReplyTarget(comment);
    setAuthorName("관리자");
    setContent("");

    requestAnimationFrame(() => {
      document
        .getElementById(`admin-reply-form-${comment.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function openEditComposer(comment: BoardComment) {
    closeComposer();
    setEditingCommentId(comment.id);
    setEditAuthorName(comment.author_name);
    setEditContent(comment.content);

    requestAnimationFrame(() => {
      document
        .getElementById(`admin-edit-form-${comment.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  async function handleUpdateComment(e: FormEvent, commentId: string) {
    e.preventDefault();

    if (!editAuthorName.trim() || !editContent.trim()) {
      onMessage("작성자와 댓글 내용을 입력해 주세요.");
      return;
    }

    setSaving(true);
    onMessage("");

    const { error } = await supabase
      .from("board_comments")
      .update({
        author_name: editAuthorName.trim(),
        content: editContent.trim(),
      })
      .eq("id", commentId);

    if (error) {
      onMessage(`댓글 수정 실패: ${error.message}`);
      setSaving(false);
      return;
    }

    onMessage("댓글이 수정되었습니다.");
    closeEditComposer();
    await onRefresh();
    setSaving(false);
  }

  async function handleCreateComment(e: FormEvent) {
    e.preventDefault();

    if (!authorName.trim() || !content.trim()) {
      onMessage("작성자와 댓글 내용을 입력해 주세요.");
      return;
    }

    const parentId = composerMode === "reply" ? replyTarget?.id ?? null : null;

    if (composerMode === "reply" && !parentId) {
      onMessage("답글 대상 댓글을 찾을 수 없습니다.");
      return;
    }

    setSaving(true);
    onMessage("");

    const createAsSecret = secretCommentsEnabled && writeIsSecret;

    if (createAsSecret) {
      const { data: newCommentId, error } = await supabase.rpc("create_user_board_comment", {
        p_post_id: postId,
        p_author_name: authorName.trim(),
        p_content: content.trim(),
        p_password: generateAdminSecretCommentPassword(),
        p_parent_id: parentId,
        p_is_secret: true,
      });

      if (error) {
        onMessage(
          error.message.includes("Secret comments are disabled")
            ? "비밀댓글 기능이 비활성화되어 있습니다. 개발자 모드에서 활성화해 주세요."
            : error.message.includes("Could not find the function")
              ? `댓글 등록 실패: board-secret-comments.sql을 실행해 주세요.`
              : error.message.includes("parent_id") || error.message.includes("Parent comment")
                ? `댓글 등록 실패: comment-replies.sql을 실행해 주세요. (${error.message})`
                : `댓글 등록 실패: ${error.message}`,
        );
        setSaving(false);
        return;
      }

      if (newCommentId) {
        const { error: adminFlagError } = await supabase
          .from("board_comments")
          .update({ is_admin_managed: true })
          .eq("id", newCommentId);

        if (adminFlagError) {
          onMessage(`댓글 등록 후 관리자 표시 설정 실패: ${adminFlagError.message}`);
          setSaving(false);
          return;
        }
      }
    } else {
      const { error } = await supabase.from("board_comments").insert({
        post_id: postId,
        parent_id: parentId,
        author_name: authorName.trim(),
        content: content.trim(),
        password_hash: ADMIN_COMMENT_PASSWORD_HASH,
        is_admin_managed: true,
        is_hidden: false,
        is_secret: false,
      });

      if (error) {
        onMessage(
          error.message.includes("parent_id")
            ? `댓글 등록 실패: comment-replies.sql을 실행해 주세요. (${error.message})`
            : `댓글 등록 실패: ${error.message}`,
        );
        setSaving(false);
        return;
      }
    }

    onMessage(
      composerMode === "reply"
        ? createAsSecret
          ? "비밀 답글이 등록되었습니다."
          : "답글이 등록되었습니다."
        : createAsSecret
          ? "비밀댓글이 등록되었습니다."
          : "댓글이 등록되었습니다.",
    );
    closeComposer();
    await onRefresh();
    setSaving(false);
  }

  async function deleteComment(comment: BoardComment) {
    if (!window.confirm("이 댓글을 삭제하시겠습니까?")) {
      return;
    }

    const { error } = await supabase.from("board_comments").delete().eq("id", comment.id);

    if (error) {
      onMessage(`댓글 삭제 실패: ${error.message}`);
      return;
    }

    if (replyTarget?.id === comment.id) {
      closeComposer();
    }

    if (editingCommentId === comment.id) {
      closeEditComposer();
    }

    onMessage("댓글이 삭제되었습니다.");
    await onRefresh();
  }

  async function toggleCommentHidden(comment: BoardComment) {
    if (!comment.is_hidden) {
      const actionReason = await requestAdminSuspensionReason(prompt, "정지");
      if (actionReason === null) {
        return;
      }

      const { error } = await supabase
        .from("board_comments")
        .update({
          is_hidden: true,
          admin_action_reason: actionReason || null,
        })
        .eq("id", comment.id);

      if (error) {
        onMessage(
          error.message.includes("admin_action_reason")
            ? "Supabase SQL Editor에서 content-admin-action-reason.sql을 실행해 주세요."
            : `댓글 상태 변경 실패: ${error.message}`,
        );
        return;
      }
    } else {
      const { error } = await supabase
        .from("board_comments")
        .update({ is_hidden: false, admin_action_reason: null })
        .eq("id", comment.id);

      if (error) {
        onMessage(`댓글 상태 변경 실패: ${error.message}`);
        return;
      }
    }

    await onRefresh();
  }

  function renderCommentNode(node: CommentNode, depth = 0) {
    const indentClass = adminReplyIndentClass(depth);
    const isReplyTarget = composerMode === "reply" && replyTarget?.id === node.id;
    const isEditing = editingCommentId === node.id;
    const canEdit = isAdminManagedComment(node);

    return (
      <li key={node.id} className={`space-y-2 ${indentClass}`}>
        {isEditing ? (
          <form
            id={`admin-edit-form-${node.id}`}
            onSubmit={(e) => void handleUpdateComment(e, node.id)}
            className="rounded-lg border border-amber-200 bg-amber-50/50 p-3"
          >
            <p className="text-sm font-semibold text-gray-800">
              {node.parent_id ? "답글 수정 (관리자)" : "댓글 수정 (관리자)"}
            </p>
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
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "저장 중..." : "수정 저장"}
              </button>
              <button
                type="button"
                onClick={closeEditComposer}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                취소
              </button>
            </div>
          </form>
        ) : (
          <AdminCommentItem
            comment={node}
            adminPasswordVisible={adminPasswordVisible}
            ipModerationEnabled={ipModerationEnabled}
            deviceModerationEnabled={deviceModerationEnabled}
            canEdit={canEdit}
            onEdit={() => openEditComposer(node)}
            onReply={() => openReplyComposer(node)}
            onToggleHidden={() => void toggleCommentHidden(node)}
            onDelete={() => void deleteComment(node)}
            onBanIp={
              ipModerationEnabled && node.user_ip
                ? () => void onBanCommentIp(node, postTitle)
                : undefined
            }
            onBanDevice={
              deviceModerationEnabled &&
              node.voter_key &&
              node.voter_key.trim().length >= 8
                ? () => void onBanCommentDevice(node, postTitle)
                : undefined
            }
          />
        )}
        {isReplyTarget && (
          <form
            id={`admin-reply-form-${node.id}`}
            onSubmit={(e) => void handleCreateComment(e)}
            className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3"
          >
            <p className="text-sm font-semibold text-gray-800">답글 작성 (관리자)</p>
            <label className="mt-3 block text-sm font-medium text-gray-700">
              작성자
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-gray-700">
              댓글
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <AdminCommentComposerFields
              secretCommentsEnabled={secretCommentsEnabled}
              writeIsSecret={writeIsSecret}
              onWriteIsSecretChange={setWriteIsSecret}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "등록 중..." : writeIsSecret ? "비밀 답글 등록" : "답글 등록"}
              </button>
              <button
                type="button"
                onClick={closeComposer}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                취소
              </button>
            </div>
          </form>
        )}
        {node.replies.length > 0 && (
          <ul className="space-y-2">
            {node.replies.map((reply) => renderCommentNode(reply, depth + 1))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-800">
          댓글 {comments.length > 0 ? `(${comments.length})` : ""}
        </h4>
        {composerMode === "idle" && (
          <button
            type="button"
            onClick={openNewComposer}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 sm:text-sm"
          >
            + 새 댓글 달기
          </button>
        )}
      </div>

      {commentTree.length === 0 ? (
        <p className="mt-2 text-xs text-gray-500">등록된 댓글이 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {commentTree.map((node) => renderCommentNode(node))}
        </ul>
      )}

      {composerMode === "new" && (
        <form
          onSubmit={(e) => void handleCreateComment(e)}
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4"
        >
          <p className="text-sm font-semibold text-gray-800">새 댓글 달기 (관리자)</p>
          <label className="mt-3 block text-sm font-medium text-gray-700">
            작성자
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-gray-700">
            댓글
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <AdminCommentComposerFields
            secretCommentsEnabled={secretCommentsEnabled}
            writeIsSecret={writeIsSecret}
            onWriteIsSecretChange={setWriteIsSecret}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "등록 중..." : writeIsSecret ? "비밀댓글 등록" : "댓글 등록"}
            </button>
            <button
              type="button"
              onClick={closeComposer}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              취소
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function AdminCommentComposerFields({
  secretCommentsEnabled,
  writeIsSecret,
  onWriteIsSecretChange,
}: {
  secretCommentsEnabled: boolean;
  writeIsSecret: boolean;
  onWriteIsSecretChange: (value: boolean) => void;
}) {
  if (!secretCommentsEnabled) {
    return null;
  }

  return (
    <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={writeIsSecret}
        onChange={(e) => onWriteIsSecretChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
      />
      비밀댓글로 등록
    </label>
  );
}

function AdminCommentItem({
  comment,
  adminPasswordVisible,
  ipModerationEnabled,
  deviceModerationEnabled,
  canEdit,
  onEdit,
  onReply,
  onToggleHidden,
  onDelete,
  onBanIp,
  onBanDevice,
}: {
  comment: BoardComment;
  adminPasswordVisible: boolean;
  ipModerationEnabled: boolean;
  deviceModerationEnabled: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onReply: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
  onBanIp?: () => void;
  onBanDevice?: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-800">{comment.author_name}</span>
            {isAdminManagedComment(comment) && (
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                관리자
              </span>
            )}
            {comment.is_hidden && (
              <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                숨김
              </span>
            )}
            {comment.is_secret && (
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                비밀댓글
              </span>
            )}
            <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
            {ipModerationEnabled && comment.user_ip ? (
              <span className="font-mono text-xs text-gray-500">IP {comment.user_ip}</span>
            ) : null}
            {deviceModerationEnabled && comment.voter_key && comment.voter_key.trim().length >= 8 ? (
              <span className="font-mono text-xs text-gray-500" title={comment.voter_key}>
                기기 {formatVoterKeyLabel(comment.voter_key)}
              </span>
            ) : null}
          </div>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{comment.content}</p>
          <AdminPasswordBadge
            password={comment.admin_visible_password}
            visible={adminPasswordVisible}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800 hover:bg-amber-100"
            >
              수정
            </button>
          )}
          <button
            type="button"
            onClick={onReply}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-100"
          >
            답글
          </button>
          <button
            type="button"
            onClick={onToggleHidden}
            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100"
          >
            {comment.is_hidden ? "표시" : "숨김"}
          </button>
          {onBanIp ? (
            <button
              type="button"
              onClick={onBanIp}
              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50"
            >
              IP 차단
            </button>
          ) : null}
          {onBanDevice ? (
            <button
              type="button"
              onClick={onBanDevice}
              className="rounded-lg border border-violet-200 px-2.5 py-1 text-xs text-violet-700 hover:bg-violet-50"
            >
              기기 차단
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
