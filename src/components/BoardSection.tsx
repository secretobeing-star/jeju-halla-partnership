"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import Pagination from "@/components/Pagination";
import BoardPostModal from "@/components/BoardPostModal";
import BoardPostDetailView from "@/components/BoardPostDetailView";
import BoardCommunityPostRow from "@/components/BoardCommunityPostRow";
import TabletSplitDetailPane from "@/components/TabletSplitDetailPane";
import TabletSplitLayout from "@/components/TabletSplitLayout";
import {
  BoardDefinition,
  DEFAULT_BOARD_DEFINITIONS,
  getBoardLabel,
  getBoardPostsPerPage,
  getBoardSectionHeaderStyles,
  getBoardTabActiveStyle,
  getTabGridClass,
  getVisibleBoards,
  isUserPostableBoard,
  isUserManagedBoardPost,
  isAdminManagedBoardPost,
} from "@/lib/board-definitions";
import {
  getBoardVoterKey,
  getStoredPostReaction,
  setStoredPostReaction,
} from "@/lib/board-voter";
import {
  BOARD_PINNED_LIST_FIELDS,
  BOARD_PINNED_LIST_FIELDS_BASE,
  BOARD_PINNED_NOTICE_LABEL,
  fetchBoardPostsWithPinned,
  buildBoardListRows,
  resolveBoardListPostNumber,
  getBoardPinnedSettings,
  getSimplePinnedRowButtonClasses,
  getSimplePinnedTitleClasses,
  resolvePinnedListDisplayState,
  sortAllBoardPostsForList,
} from "@/lib/board-pinned-posts";
import { getPageForListIndex, getPopupListNavigation } from "@/lib/popup-list-navigation";
import { getHiddenPostDisplay, isAdminHiddenBoardPost } from "@/lib/board-hidden-post";
import { getBoardReportReasons, requestBoardReportReason, submitBoardReport, alertReportSuccess } from "@/lib/board-reports";
import {
  alertProfanityBlocked,
  alertWriteAccessDenied,
  confirmDeletion,
  fetchBoardWriteAccess,
  resolveBoardActionError,
} from "@/lib/app-modal-messages";
import { containsProfanity } from "@/lib/profanity-filter";
import { usePromptModal } from "@/components/PromptModalProvider";
import { hasViewedBoardPost, markBoardPostViewed } from "@/lib/board-post-views";
import { markSecretPostUnlocked } from "@/lib/board-secret-unlock";
import { getBoardListFontSizeStyle } from "@/lib/board-list-font-size";
import { useBoardListLayout } from "@/lib/mobile-viewport";
import { useTabletSplitPane } from "@/lib/tablet-split-pane";
import { DEFAULT_SITE_SETTINGS } from "@/lib/default-site-settings";
import { getBoardCommunityGridClass } from "@/lib/board-community-grid";
import { BoardPost, SiteSettings, supabase } from "@/lib/supabase";

const PUBLIC_LIST_FIELDS = BOARD_PINNED_LIST_FIELDS;
const PUBLIC_LIST_FIELDS_BASE = BOARD_PINNED_LIST_FIELDS_BASE;

type BoardSort = "latest" | "recommended" | "views";

type BoardSectionProps = {
  refreshKey?: number;
  boards?: BoardDefinition[];
  siteSettings?: Partial<SiteSettings>;
  placement?: "above-partners" | "below-partners";
  presentation?: "inline" | "popup";
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BoardSection({
  refreshKey = 0,
  boards = DEFAULT_BOARD_DEFINITIONS,
  siteSettings = {},
  placement = "above-partners",
  presentation = "inline",
}: BoardSectionProps) {
  const { prompt, alert, confirm } = usePromptModal();
  const isPopupPresentation = presentation === "popup";
  const hiddenPostDisplay = useMemo(
    () => getHiddenPostDisplay(siteSettings),
    [siteSettings.board_hidden_post_title, siteSettings.board_hidden_post_message],
  );

  const [activeBoard, setActiveBoard] = useState("");
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [rawBoardPosts, setRawBoardPosts] = useState<BoardPost[]>([]);
  const [globalPinnedPosts, setGlobalPinnedPosts] = useState<BoardPost[]>([]);
  const [commentCountsByPostId, setCommentCountsByPostId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<BoardSort>("latest");
  const [boardExpanded, setBoardExpanded] = useState(true);
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editAuthorName, setEditAuthorName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [writeIsSecret, setWriteIsSecret] = useState(false);
  const [selectedPostContent, setSelectedPostContent] = useState<string | null>(null);
  const [secretUnlockPassword, setSecretUnlockPassword] = useState("");
  const [secretContentCache, setSecretContentCache] = useState<Record<string, string>>({});

  const visibleTabs = useMemo(() => getVisibleBoards(boards), [boards]);
  const tabGridClass = getTabGridClass(visibleTabs.length);
  const canManageWithPassword = isUserPostableBoard(boards, activeBoard);
  const activeBoardLabel = getBoardLabel(boards, activeBoard);
  const postsPerPage = getBoardPostsPerPage(boards, activeBoard);
  const boardMobileMediaUploadEnabled =
    siteSettings.board_mobile_media_upload_enabled ?? true;
  const reactionsEnabled = siteSettings.post_reactions_enabled ?? true;
  const sortLatestEnabled = siteSettings.board_sort_latest_enabled ?? true;
  const sortRecommendedEnabled = siteSettings.board_sort_recommended_enabled ?? true;
  const sortViewsEnabled = siteSettings.board_sort_views_enabled ?? true;
  const boardListRefreshEnabled = siteSettings.board_list_refresh_enabled ?? true;
  const collapsibleEnabled =
    !isPopupPresentation && (siteSettings.board_collapsible_enabled ?? true);
  const scrollTopEnabled = siteSettings.pagination_scroll_top_enabled ?? true;
  const numberedListEnabled =
    siteSettings.board_post_numbered_list_enabled ??
    DEFAULT_SITE_SETTINGS.board_post_numbered_list_enabled;
  const boardPostPopupEnabled =
    siteSettings.board_post_popup_enabled ?? DEFAULT_SITE_SETTINGS.board_post_popup_enabled;
  const pinnedSettings = useMemo(() => getBoardPinnedSettings(siteSettings), [siteSettings]);
  const pinnedPersistPagesEnabled = pinnedSettings.board_pinned_persist_pages_enabled;
  const pinnedAlsoInListEnabled = pinnedSettings.board_pinned_also_in_list_enabled;
  const boardSectionHeaderStyles = getBoardSectionHeaderStyles(
    siteSettings.board_section_header_color,
  );
  const secretPostsEnabled = siteSettings.board_secret_posts_enabled ?? false;
  const secretCommentsEnabled = siteSettings.board_secret_comments_enabled ?? false;
  const adminSecretMainVisibleEnabled =
    siteSettings.board_admin_secret_comments_main_visible_enabled ?? false;
  const adminSecretReplyParentUnlockEnabled =
    siteSettings.board_admin_secret_reply_parent_unlock_enabled !== false;
  const [postViewsEnabled, setPostViewsEnabled] = useState(
    siteSettings.board_post_views_enabled ?? DEFAULT_SITE_SETTINGS.board_post_views_enabled,
  );
  const showSortControls = sortLatestEnabled || sortRecommendedEnabled || sortViewsEnabled;
  const showListToolbar = boardListRefreshEnabled || showSortControls;
  const { compactLayout, listMaxWidth } = useBoardListLayout();
  const boardFontSizeStyle = getBoardListFontSizeStyle(siteSettings);
  const tabletSplitPane = useTabletSplitPane();
  const showBoardTabletSplit = boardPostPopupEnabled && tabletSplitPane;
  const effectiveCompactLayout = compactLayout || showBoardTabletSplit;

  useEffect(() => {
    setPostViewsEnabled(
      siteSettings.board_post_views_enabled ?? DEFAULT_SITE_SETTINGS.board_post_views_enabled,
    );
  }, [siteSettings.board_post_views_enabled]);

  useEffect(() => {
    void supabase
      .from("site_settings")
      .select("board_post_views_enabled")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPostViewsEnabled(Boolean(data.board_post_views_enabled));
        }
      });
  }, [refreshKey, activeBoard]);

  const {
    rows: boardListRows,
    totalPages,
    createdAtPostNumbers,
  } = useMemo(
    () =>
      buildBoardListRows(rawBoardPosts, globalPinnedPosts, {
        activeBoardId: activeBoard,
        currentPage,
        postsPerPage,
        persistPinnedAcrossPages: pinnedPersistPagesEnabled,
        showPinnedAlsoInList: pinnedAlsoInListEnabled,
        sortOrder,
      }),
    [
      rawBoardPosts,
      globalPinnedPosts,
      activeBoard,
      currentPage,
      postsPerPage,
      pinnedPersistPagesEnabled,
      pinnedAlsoInListEnabled,
      sortOrder,
    ],
  );

  useEffect(() => {
    if (visibleTabs.length === 0) {
      return;
    }

    if (!visibleTabs.some((tab) => tab.id === activeBoard)) {
      setActiveBoard(visibleTabs[0].id);
    }
  }, [visibleTabs, activeBoard]);

  const loadPosts = useCallback(async (options?: { background?: boolean }) => {
    if (!activeBoard) {
      setPosts([]);
      setRawBoardPosts([]);
      setGlobalPinnedPosts([]);
      if (!options?.background) {
        setLoading(false);
      }
      return;
    }

    if (!options?.background) {
      setLoading(true);
    }

    const visibleBoardIds = visibleTabs.map((tab) => tab.id);
    const { boardPosts, globalPinnedPosts: pinnedPosts, mergedPosts: loadedPosts } =
      await fetchBoardPostsWithPinned({
        activeBoard,
        visibleBoardIds,
        pinnedAlsoInListEnabled,
        listFields: PUBLIC_LIST_FIELDS,
        listFieldsBase: PUBLIC_LIST_FIELDS_BASE,
      });

    setRawBoardPosts(boardPosts);
    setGlobalPinnedPosts(pinnedPosts);
    setPosts(loadedPosts);

    if (loadedPosts.length === 0) {
      setCommentCountsByPostId({});
      if (!options?.background) {
        setLoading(false);
      }
      return;
    }

    const postIds = loadedPosts.map((post) => post.id);
    const { data: commentRows } = await supabase
      .from("board_comments")
      .select("post_id")
      .in("post_id", postIds)
      .eq("is_hidden", false);

    const counts: Record<string, number> = {};
    for (const row of commentRows ?? []) {
      const postId = row.post_id as string;
      counts[postId] = (counts[postId] ?? 0) + 1;
    }

    setCommentCountsByPostId(counts);
    if (!options?.background) {
      setLoading(false);
    }
  }, [activeBoard, visibleTabs, pinnedAlsoInListEnabled]);

  async function handleRefresh() {
    setRefreshing(true);
    setMessage("");
    try {
      await loadPosts({ background: true });
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!showWriteForm || !canManageWithPassword) {
      return;
    }

    let cancelled = false;

    void fetchBoardWriteAccess(getBoardVoterKey()).then(async (access) => {
      if (cancelled || access.allowed) {
        return;
      }

      await alertWriteAccessDenied(alert, access);
    });

    return () => {
      cancelled = true;
    };
  }, [showWriteForm, canManageWithPassword, alert]);

  // 탭 전환 시에만 선택·작성 UI 초기화 (설정 폴링 등으로 loadPosts가 바뀌어도 리셋하지 않음)
  useEffect(() => {
    setSelectedPostId(null);
    setSelectedPostContent(null);
    setShowWriteForm(false);
    setShowEditForm(false);
    setShowEditPrompt(false);
    setShowComments(false);
    setShowDeleteForm(false);
    setMessage("");
    setCurrentPage(1);
  }, [activeBoard]);

  // 탭 전환·수동 refreshKey 일 때만 목록 재조회 — 설정 갱신으로 인한 자동 새로고침 방지
  useEffect(() => {
    void loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadPosts 참조 변경만으로 재조회하지 않음
  }, [activeBoard, refreshKey]);

  useEffect(() => {
    const availableSorts: BoardSort[] = [];
    if (sortLatestEnabled) availableSorts.push("latest");
    if (sortRecommendedEnabled) availableSorts.push("recommended");
    if (sortViewsEnabled) availableSorts.push("views");

    if (availableSorts.length === 0) {
      return;
    }

    if (!availableSorts.includes(sortOrder)) {
      setSortOrder(availableSorts[0]);
    }
  }, [sortLatestEnabled, sortRecommendedEnabled, sortViewsEnabled, sortOrder]);

  useEffect(() => {
    if (selectedPostId) {
      setUserReaction(getStoredPostReaction(selectedPostId));
    } else {
      setUserReaction(null);
    }
  }, [selectedPostId]);

  async function handleReaction(reaction: "like" | "dislike") {
    if (!selectedPost || !reactionsEnabled) {
      return;
    }

    const { data, error } = await supabase.rpc("react_board_post", {
      p_post_id: selectedPost.id,
      p_reaction: reaction,
      p_voter_key: getBoardVoterKey(),
    });

    if (error) {
      setMessage(
        error.message.includes("Could not find the function")
          ? "Supabase SQL Editor에서 feature-update-v1.sql을 실행해 주세요."
          : `반응 저장 실패: ${error.message}`,
      );
      return;
    }

    const result = data as {
      like_count: number;
      dislike_count: number;
      reaction: "like" | "dislike" | null;
    };

    setPosts((prev) =>
      prev.map((post) =>
        post.id === selectedPost.id
          ? {
              ...post,
              like_count: result.like_count,
              dislike_count: result.dislike_count,
            }
          : post,
      ),
    );
    setUserReaction(result.reaction);
    setStoredPostReaction(selectedPost.id, result.reaction);
  }

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  );
  const reportReasons = useMemo(
    () => getBoardReportReasons(siteSettings),
    [siteSettings, siteSettings.board_report_reasons],
  );
  const navigableBoardPosts = useMemo(
    () => sortAllBoardPostsForList(rawBoardPosts, sortOrder, activeBoard),
    [rawBoardPosts, sortOrder, activeBoard],
  );
  const boardPopupNavigation = useMemo(
    () => getPopupListNavigation(navigableBoardPosts, selectedPostId),
    [navigableBoardPosts, selectedPostId],
  );
  const goToPreviousBoardPost = useCallback(() => {
    const previous = boardPopupNavigation.previous;
    if (!previous) {
      return;
    }

    setSelectedPostId(previous.id);
    setCurrentPage(getPageForListIndex(boardPopupNavigation.index - 1, postsPerPage));
  }, [boardPopupNavigation, postsPerPage]);
  const goToNextBoardPost = useCallback(() => {
    const next = boardPopupNavigation.next;
    if (!next) {
      return;
    }

    setSelectedPostId(next.id);
    setCurrentPage(getPageForListIndex(boardPopupNavigation.index + 1, postsPerPage));
  }, [boardPopupNavigation, postsPerPage]);
  const canUserManageSelectedPost = useMemo(
    () => (selectedPost ? isUserManagedBoardPost(boards, selectedPost) : false),
    [boards, selectedPost],
  );
  const needsSecretUnlock = Boolean(
    selectedPost?.is_secret && !selectedPostContent && !selectedPost?.is_hidden,
  );
  const isSelectedPostAdminHidden = isAdminHiddenBoardPost(selectedPost);
  const showBoardList = !selectedPost || boardPostPopupEnabled;
  const showInlinePostDetail = Boolean(selectedPost && !boardPostPopupEnabled);
  const showBoardPostModal = Boolean(
    selectedPost && boardPostPopupEnabled && !isPopupPresentation,
  );
  const showPopupInlineSplit = Boolean(isPopupPresentation && showBoardTabletSplit);
  /** 게시판 팝업(폰): 목록 위에 상세 모달을 겹쳐 좌우 스와이프·댓글 UX를 맞춤 */
  const showPopupPhoneDetailModal = Boolean(
    isPopupPresentation && selectedPost && boardPostPopupEnabled && !tabletSplitPane,
  );

  useEffect(() => {
    if (!selectedPost) {
      setSelectedPostContent(null);
      setSecretUnlockPassword("");
      return;
    }

    if (selectedPost.is_hidden) {
      setSelectedPostContent(null);
      setSecretUnlockPassword("");
      return;
    }

    if (secretContentCache[selectedPost.id]) {
      setSelectedPostContent(secretContentCache[selectedPost.id]);
      return;
    }

    if (!selectedPost.is_secret) {
      void supabase
        .from("board_posts")
        .select("content")
        .eq("id", selectedPost.id)
        .maybeSingle()
        .then(({ data }) => {
          setSelectedPostContent(data?.content ?? "");
        });
      return;
    }

    setSelectedPostContent(null);
  }, [selectedPost, secretContentCache]);

  useEffect(() => {
    const postId = selectedPost?.id;
    if (!postViewsEnabled || !postId || needsSecretUnlock || selectedPost?.is_hidden) {
      return;
    }

    if (hasViewedBoardPost(postId)) {
      return;
    }

    let cancelled = false;

    void supabase
      .rpc("increment_board_post_view", { p_post_id: postId })
      .then(({ data, error }) => {
        if (cancelled || error) {
          return;
        }

        const nextCount = typeof data === "number" ? data : Number(data);
        if (!Number.isFinite(nextCount)) {
          return;
        }

        markBoardPostViewed(postId);
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId ? { ...post, view_count: nextCount } : post,
          ),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [postViewsEnabled, selectedPost?.id, needsSecretUnlock]);

  function resetWriteForm() {
    setTitle("");
    setAuthorName("");
    setContent("");
    setPassword("");
    setWriteIsSecret(false);
  }

  function resetPostPanels() {
    setShowComments(false);
    setShowDeleteForm(false);
    setShowEditPrompt(false);
  }

  function resetEditForm() {
    setEditTitle("");
    setEditAuthorName("");
    setEditContent("");
    setEditPassword("");
    setDeletePassword("");
    setShowEditForm(false);
    setShowEditPrompt(false);
  }

  function toggleEditPrompt() {
    setShowEditPrompt((prev) => !prev);
    setShowDeleteForm(false);
    setShowComments(false);
    setShowEditForm(false);
    setEditPassword("");
    setMessage("");
  }

  async function verifyEditPassword() {
    if (!selectedPost) {
      return;
    }

    if (!editPassword.trim()) {
      setMessage("비밀번호를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.rpc("update_user_board_post", {
      p_id: selectedPost.id,
      p_password: editPassword,
      p_title: selectedPost.title,
      p_author_name: selectedPost.author_name,
      p_content: selectedPostContent ?? "",
    });

    if (error) {
      const lower = error.message.toLowerCase();
      const missingRpc =
        lower.includes("could not find the function") ||
        lower.includes("pgrst202") ||
        lower.includes("schema cache");

      if (missingRpc) {
        const response = await fetch(`/api/board/${selectedPost.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: editPassword,
            title: selectedPost.title,
            author_name: selectedPost.author_name,
            content: selectedPostContent ?? "",
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          const errorMessage = body.error?.includes("Incorrect password")
              ? "비밀번호가 일치하지 않습니다."
            : (body.error ?? "비밀번호 확인에 실패했습니다.");

          if (await resolveBoardActionError(alert, errorMessage)) {
            setSubmitting(false);
            return;
          }

          setMessage(errorMessage);
          setSubmitting(false);
          return;
        }
      } else {
        const errorMessage = error.message.includes("Incorrect password")
            ? "비밀번호가 일치하지 않습니다."
          : `비밀번호 확인 실패: ${error.message}`;

        if (await resolveBoardActionError(alert, errorMessage)) {
          setSubmitting(false);
          return;
        }

        setMessage(errorMessage);
        setSubmitting(false);
        return;
      }
    }

    setEditTitle(selectedPost.title);
    setEditAuthorName(selectedPost.author_name);
    setEditContent(selectedPostContent ?? "");
    setShowEditPrompt(false);
    setShowEditForm(true);
    setSubmitting(false);
  }

  function toggleComments() {
    setShowComments((prev) => !prev);
    setShowDeleteForm(false);
    setShowEditPrompt(false);
    setShowEditForm(false);
    setMessage("");
  }

  function toggleDeleteForm() {
    setShowDeleteForm((prev) => !prev);
    setShowComments(false);
    setShowEditPrompt(false);
    setShowEditForm(false);
    setDeletePassword("");
    setMessage("");
  }

  function goToList() {
    setSelectedPostId(null);
    setSelectedPostContent(null);
    resetEditForm();
    resetPostPanels();
    setMessage("");
  }

  async function handleUnlockSecretPost() {
    if (!selectedPost) {
      return;
    }

    if (!secretUnlockPassword.trim()) {
      setMessage("비밀글 비밀번호를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { data, error } = await supabase.rpc("unlock_secret_board_post", {
      p_id: selectedPost.id,
      p_password: secretUnlockPassword,
    });

    if (error) {
      const errorMessage = error.message.includes("Incorrect password")
          ? "비밀번호가 일치하지 않습니다."
          : error.message.includes("Could not find the function")
            ? "Supabase에 board-secret-posts.sql을 실행해 주세요."
          : `비밀글 열람 실패: ${error.message}`;

      if (await resolveBoardActionError(alert, errorMessage)) {
        setSubmitting(false);
        return;
      }

      setMessage(errorMessage);
      setSubmitting(false);
      return;
    }

    const content = String(data ?? "");
    setSecretContentCache((prev) => ({ ...prev, [selectedPost.id]: content }));
    setSelectedPostContent(content);
    markSecretPostUnlocked(selectedPost.id);
    setSecretUnlockPassword("");
    setSubmitting(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!canManageWithPassword) {
      return;
    }

    if (!title.trim() || !authorName.trim() || !content.trim() || !password.trim()) {
      setMessage("제목, 작성자, 내용, 비밀번호를 모두 입력해 주세요.");
      return;
    }

    if (containsProfanity(title, authorName, content)) {
      await alertProfanityBlocked(alert);
      return;
    }

    setSubmitting(true);
    setMessage("");

    const response = await fetch("/api/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        board_type: activeBoard,
        title: title.trim(),
        author_name: authorName.trim(),
        content,
        password,
        is_secret: secretPostsEnabled && writeIsSecret,
        voter_key: getBoardVoterKey(),
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        ban_reason?: string | null;
        ban_type?: "ip" | "device" | null;
      };
      const apiError = body.error ?? "등록에 실패했습니다.";

      if (response.status !== 503) {
        const errorMessage =
          apiError.includes("Could not find the function") ||
          apiError.includes("pgrst202") ||
          apiError.includes("schema cache")
            ? "Supabase SQL Editor에서 supabase/board-ip-moderation.sql을 실행해 주세요."
            : apiError.includes("Incorrect password")
              ? "비밀번호가 일치하지 않습니다."
              : apiError.includes("at least 4")
                ? "비밀번호는 4자 이상이어야 합니다."
                : apiError;

        if (await resolveBoardActionError(alert, errorMessage, body.ban_reason, body.ban_type)) {
          setSubmitting(false);
          return;
        }

        setMessage(errorMessage);
        setSubmitting(false);
        return;
      }

    const { error } = await supabase.rpc("create_user_board_post", {
      p_board_type: activeBoard,
      p_title: title.trim(),
      p_author_name: authorName.trim(),
      p_content: content,
      p_password: password,
      p_is_secret: secretPostsEnabled && writeIsSecret,
        p_voter_key: getBoardVoterKey(),
    });

    if (error) {
        const errorMessage = error.message.includes("Could not find the function")
          ? "Supabase SQL Editor에서 supabase/board-ip-moderation.sql을 실행해 주세요."
          : error.message.includes("Incorrect password")
            ? "비밀번호가 일치하지 않습니다."
            : error.message.includes("at least 4")
              ? "비밀번호는 4자 이상이어야 합니다."
              : error.message.includes("Voter key banned")
                ? "현재 기기에서는 게시글을 작성할 수 없습니다."
              : error.message.includes("IP banned")
                ? "현재 IP에서는 게시글을 작성할 수 없습니다."
                : `등록 실패: ${error.message}`;

        if (error.message.includes("Voter key banned") || error.message.includes("IP banned")) {
          const access = await fetchBoardWriteAccess(getBoardVoterKey());
          if (await resolveBoardActionError(alert, errorMessage, access.reason, access.ban_type)) {
            setSubmitting(false);
            return;
          }
        } else if (await resolveBoardActionError(alert, errorMessage)) {
      setSubmitting(false);
      return;
        }

        setMessage(errorMessage);
        setSubmitting(false);
        return;
      }
    }

    resetWriteForm();
    setShowWriteForm(false);
    setMessage("게시글이 등록되었습니다.");
    setCurrentPage(1);
    await loadPosts();
    setSubmitting(false);
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();

    if (!selectedPost || !canUserManageSelectedPost) {
      return;
    }

    if (
      !editTitle.trim() ||
      !editAuthorName.trim() ||
      !editContent.trim() ||
      !editPassword.trim()
    ) {
      setMessage("제목, 작성자, 내용, 비밀번호를 모두 입력해 주세요.");
      return;
    }

    if (containsProfanity(editTitle, editAuthorName, editContent)) {
      await alertProfanityBlocked(alert);
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.rpc("update_user_board_post", {
      p_id: selectedPost.id,
      p_password: editPassword,
      p_title: editTitle.trim(),
      p_author_name: editAuthorName.trim(),
      p_content: editContent,
    });

    if (error) {
      const lower = error.message.toLowerCase();
      const missingRpc =
        lower.includes("could not find the function") ||
        lower.includes("pgrst202") ||
        lower.includes("schema cache");

      if (missingRpc) {
        const response = await fetch(`/api/board/${selectedPost.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: editPassword,
            title: editTitle.trim(),
            author_name: editAuthorName.trim(),
            content: editContent,
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          const errorMessage = body.error?.includes("Incorrect password")
              ? "비밀번호가 일치하지 않습니다."
            : (body.error ?? "수정에 실패했습니다.");

          if (await resolveBoardActionError(alert, errorMessage)) {
            setSubmitting(false);
            return;
          }

          setMessage(errorMessage);
          setSubmitting(false);
          return;
        }
      } else {
        const errorMessage = error.message.includes("Incorrect password")
            ? "비밀번호가 일치하지 않습니다."
          : (error.message ?? "수정에 실패했습니다.");

        if (await resolveBoardActionError(alert, errorMessage)) {
          setSubmitting(false);
          return;
        }

        setMessage(errorMessage);
        setSubmitting(false);
        return;
      }
    }

    setMessage("게시글이 수정되었습니다.");
    resetEditForm();
    await loadPosts();
    setSelectedPostId(selectedPost.id);
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!selectedPost || !canUserManageSelectedPost) {
      return;
    }

    if (!deletePassword.trim()) {
      setMessage("삭제하려면 비밀번호를 입력해 주세요.");
      return;
    }

    const confirmed = await confirmDeletion(confirm, "이 게시글을 삭제하시겠습니까?");
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.rpc("delete_user_board_post", {
      p_id: selectedPost.id,
      p_password: deletePassword,
    });

    if (error) {
      const errorMessage = error.message.includes("Incorrect password")
          ? "비밀번호가 일치하지 않습니다."
        : (error.message ?? "삭제에 실패했습니다.");

      if (await resolveBoardActionError(alert, errorMessage)) {
        setSubmitting(false);
        return;
      }

      setMessage(errorMessage);
      setSubmitting(false);
      return;
    }

    setSelectedPostId(null);
    resetEditForm();
    setMessage("게시글이 삭제되었습니다.");
    await loadPosts();
    setSubmitting(false);
  }

  async function handleReportPost() {
    if (!selectedPost || isSelectedPostAdminHidden || isAdminManagedBoardPost(selectedPost)) {
      return;
    }

    const reason = await requestBoardReportReason(prompt, reportReasons);
    if (!reason) {
      return;
    }

    setSubmitting(true);
                setMessage("");

    try {
      await submitBoardReport({ postId: selectedPost.id, reason });
      await alertReportSuccess(alert, siteSettings);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "신고 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (visibleTabs.length === 0) {
    return null;
  }

  function renderBoardPostDetailView(closeLabel: string, editorKeyPrefix: string) {
    if (!selectedPost) {
      return null;
    }

    return (
      <BoardPostDetailView
        post={selectedPost}
        closeLabel={closeLabel}
        editorKeyPrefix={editorKeyPrefix}
        showEditForm={showEditForm}
        isAdminHidden={isSelectedPostAdminHidden}
        hiddenPostDisplay={hiddenPostDisplay}
        needsSecretUnlock={needsSecretUnlock}
        postContent={selectedPostContent}
        boardFontSizeStyle={boardFontSizeStyle}
        secretUnlockPassword={secretUnlockPassword}
        onSecretUnlockPasswordChange={setSecretUnlockPassword}
        submitting={submitting}
        onUnlockSecretPost={handleUnlockSecretPost}
        postViewsEnabled={postViewsEnabled}
        reactionsEnabled={reactionsEnabled}
        userReaction={userReaction}
        onReaction={handleReaction}
        onClose={goToList}
        showComments={showComments}
        onToggleComments={toggleComments}
        canUserManage={canUserManageSelectedPost}
        showEditPrompt={showEditPrompt}
        onToggleEditPrompt={toggleEditPrompt}
        showDeleteForm={showDeleteForm}
        onToggleDeleteForm={toggleDeleteForm}
        editPassword={editPassword}
        onEditPasswordChange={setEditPassword}
        onVerifyEditPassword={verifyEditPassword}
        deletePassword={deletePassword}
        onDeletePasswordChange={setDeletePassword}
        onDelete={handleDelete}
                      secretCommentsEnabled={secretCommentsEnabled}
        adminSecretMainVisibleEnabled={adminSecretMainVisibleEnabled}
        adminSecretReplyParentUnlockEnabled={adminSecretReplyParentUnlockEnabled}
        onEnableComments={() => setShowComments(true)}
        onEditSubmit={handleEditSubmit}
        editTitle={editTitle}
        onEditTitleChange={setEditTitle}
        editAuthorName={editAuthorName}
        onEditAuthorNameChange={setEditAuthorName}
        editContent={editContent}
        onEditContentChange={setEditContent}
        onResetEditForm={resetEditForm}
        message={message}
        mobileMediaUploadEnabled={boardMobileMediaUploadEnabled}
        onReportPost={
          isAdminManagedBoardPost(selectedPost) ? undefined : () => void handleReportPost()
        }
        reportReasons={reportReasons}
        reportSuccessSettings={siteSettings}
      />
    );
  }

  function renderBoardMasterContent() {
    return (
      <>
        {showInlinePostDetail && selectedPost && renderBoardPostDetailView("목록", "inline")}
        {showBoardList &&
          (loading ? (
          <p className="py-8 text-center text-sm text-gray-500">게시글을 불러오는 중...</p>
        ) : (
          <>
            {showListToolbar && (
              <div
                  className={`flex flex-wrap items-center justify-between gap-2 ${effectiveCompactLayout ? "mb-1.5" : "mb-3"}`}
              >
                <div className="flex flex-wrap gap-2">
                  {sortLatestEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setSortOrder("latest");
                        setCurrentPage(1);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium sm:text-sm ${
                        sortOrder === "latest"
                          ? "bg-emerald-500 text-white"
                          : "border border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      최신순
                    </button>
                  )}
                  {sortRecommendedEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setSortOrder("recommended");
                        setCurrentPage(1);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium sm:text-sm ${
                        sortOrder === "recommended"
                          ? "bg-emerald-500 text-white"
                          : "border border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      추천순
                    </button>
                  )}
                  {sortViewsEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setSortOrder("views");
                        setCurrentPage(1);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium sm:text-sm ${
                        sortOrder === "views"
                          ? "bg-emerald-500 text-white"
                          : "border border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                        조회순
                    </button>
                  )}
                </div>
                {boardListRefreshEnabled && (
                  <button
                    type="button"
                    onClick={() => void handleRefresh()}
                    disabled={refreshing || loading}
                    className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 sm:text-sm"
                  >
                    {refreshing ? "새로고침 중..." : "새로고침"}
                  </button>
                )}
              </div>
            )}
            {posts.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                {`${activeBoardLabel} 게시글이 없습니다.`}
              </p>
            ) : (
          <>
                  <p
                    className={`text-xs text-gray-500 sm:text-sm ${effectiveCompactLayout ? "mb-1.5" : "mb-3"}`}
                  >
                    총 {posts.length}개 · {currentPage}/{totalPages} 페이지
            </p>
            <div
                    className={`max-w-full ${effectiveCompactLayout ? "overflow-x-hidden" : "md:-mx-1 md:overflow-x-auto md:px-1 lg:mx-0 lg:px-0"}`}
              style={listMaxWidth ? { maxWidth: listMaxWidth } : undefined}
            >
            <ul
              className={
                numberedListEnabled
                          ? `board-community-list w-full max-w-full ${effectiveCompactLayout ? "board-community-list--compact" : ""}${showBoardTabletSplit ? " board-community-list--split-master" : ""}`
                          : "board-simple-list divide-y divide-gray-100"
              }
                      style={boardFontSizeStyle}
            >
              {numberedListEnabled && (
                <li
                          className={`board-community-header border-b border-gray-200 text-gray-500 ${getBoardCommunityGridClass(
                            {
                              compact: effectiveCompactLayout,
                    viewsEnabled: postViewsEnabled,
                    reactionsEnabled: reactionsEnabled,
                            },
                          )}`}
                >
                  <span className="board-community-cell board-community-cell-num">번호</span>
                          {!effectiveCompactLayout && (
                            <span className="board-community-cell board-community-cell-category">
                              말머리
                            </span>
                          )}
                          <span className="board-community-cell board-community-cell-title">
                            {effectiveCompactLayout ? "제목 · 글쓴이" : "제목"}
                          </span>
                          {effectiveCompactLayout && (
                            <span
                              className="board-community-cell board-community-cell-badge"
                              aria-hidden
                            />
                          )}
                          {!effectiveCompactLayout && (
                            <span className="board-community-cell board-community-cell-author">
                              <span className="board-community-author-inner">
                                <span className="board-community-author-badges" aria-hidden />
                                <span className="board-community-author-name">글쓴이</span>
                              </span>
                            </span>
                  )}
                  <span className="board-community-cell board-community-cell-time">날짜</span>
                  {postViewsEnabled && (
                            <span className="board-community-cell board-community-cell-views">
                              조회
                            </span>
                  )}
                  {reactionsEnabled && (
                    <span className="board-community-cell board-community-cell-rec">추천</span>
                  )}
                </li>
              )}
              {boardListRows.map((row) => {
                const { post } = row;
                const commentCount = commentCountsByPostId[post.id] ?? 0;
                        const { isPinnedForDisplay, showAsNoticeBar } =
                          resolvePinnedListDisplayState(row, {
                            activeBoardId: activeBoard,
                            pinnedAlsoInListEnabled,
                          });
                        const postNumber = resolveBoardListPostNumber(row, createdAtPostNumbers);
                        const listTitle = post.is_hidden ? hiddenPostDisplay.title : post.title;

                const handleSelect = () => {
                  setSelectedPostId(post.id);
                  setShowWriteForm(false);
                  resetEditForm();
                  resetPostPanels();
                  setMessage("");
                };

                if (numberedListEnabled) {
                  return (
                    <BoardCommunityPostRow
                              key={`${post.id}-${row.rowType}-${sortOrder}-${postNumber}`}
                      post={post}
                      boardLabel={getBoardLabel(boards, post.board_type)}
                      commentCount={commentCount}
                              postNumber={postNumber}
                      reactionsEnabled={reactionsEnabled}
                      viewsEnabled={postViewsEnabled}
                      isSecret={Boolean(post.is_secret)}
                              isHidden={Boolean(post.is_hidden)}
                      isPinned={isPinnedForDisplay}
                              displayTitle={listTitle}
                              compactLayout={effectiveCompactLayout}
                      onSelect={handleSelect}
                    />
                  );
                }

                return (
                <li key={`${post.id}-${row.rowType}`}>
                  <button
                    type="button"
                    onClick={handleSelect}
                              className={`flex w-full flex-col gap-1 px-1 text-left transition sm:flex-row sm:items-center sm:justify-between ${getSimplePinnedRowButtonClasses(showAsNoticeBar)}`}
                  >
                    <span
                                className={`board-simple-list-title font-medium text-gray-900 ${getSimplePinnedTitleClasses(showAsNoticeBar)}`}
                              >
                                {showAsNoticeBar && (
                                  <span className="mr-2 inline-flex shrink-0 items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 sm:text-xs">
                                    {BOARD_PINNED_NOTICE_LABEL}
                        </span>
                      )}
                      {post.is_secret && (
                        <span className="mr-1" aria-hidden>
                          🔒
                        </span>
                      )}
                                {post.is_hidden && (
                                  <span className="mr-1.5 rounded border border-gray-300 bg-gray-100 px-1 py-0.5 text-[10px] font-medium text-gray-600">
                                    숨김
                    </span>
                                )}
                                {listTitle}
                              </span>
                              <span className="board-simple-list-meta text-gray-500">
                      {post.author_name} · {formatDate(post.created_at)}
                      {postViewsEnabled && (
                        <span className="ml-2 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-800">
                          조회 {post.view_count ?? 0}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
                );
              })}
            </ul>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
                    scrollTargetId={scrollTopEnabled ? "board-section-anchor" : undefined}
            />
          </>
            )}
          </>
          ))}

        {canManageWithPassword && showBoardList && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setShowWriteForm((prev) => !prev);
                setShowEditForm(false);
                setMessage("");
              }}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              aria-expanded={showWriteForm}
              aria-controls="board-write-form"
            >
              {showWriteForm ? "작성 취소" : "글쓰기"}
            </button>
          </div>
        )}

        {showWriteForm && canManageWithPassword && showBoardList && (
          <form
            id="board-write-form"
            onSubmit={handleSubmit}
            className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
                제목
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                작성자
                <input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  required
                  placeholder="닉네임 또는 이름"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                비밀번호
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={4}
                  placeholder="수정/삭제 시 사용 (4자 이상)"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
            </div>

            <div className="mt-4">
              <p id="board-write-content-label" className="mb-2 text-sm font-medium text-gray-700">
                내용
              </p>
              <RichTextEditor
                key={`write-${activeBoard}`}
                value={content}
                onChange={setContent}
                mobileMediaUploadEnabled={boardMobileMediaUploadEnabled}
                ariaLabelledBy="board-write-content-label"
              />
            </div>

            {secretPostsEnabled && (
              <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={writeIsSecret}
                  onChange={(e) => setWriteIsSecret(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                비밀글로 등록
              </label>
            )}

            {message ? (
              <p className="mt-3 text-sm text-emerald-700" role="status" aria-live="polite">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? "등록 중..." : "등록하기"}
            </button>
          </form>
        )}

        {!showWriteForm && showBoardList && message && !canManageWithPassword && (
          <p className="mt-3 text-sm text-emerald-700">{message}</p>
        )}
      </>
    );
  }

  function renderBoardTabs() {
    return (
      <div className={`grid border-b border-gray-100 ${tabGridClass}`}>
        {visibleTabs.map((tab) => {
          const isActive = activeBoard === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === activeBoard) {
                  return;
                }

                setActiveBoard(tab.id);
              }}
              className={`px-3 py-2.5 text-sm font-semibold transition sm:px-3 sm:py-3 sm:text-base ${
                isActive
                  ? "border-b-2"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
              style={isActive ? getBoardTabActiveStyle(tab.color) : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  }

  function renderBoardSplitMaster() {
    return (
      <>
        {renderBoardTabs()}
        <div className={showBoardTabletSplit ? "p-2 sm:p-3" : compactLayout ? "p-3 sm:p-5" : "p-4 sm:p-5"}>
          {renderBoardMasterContent()}
      </div>
        </>
    );
  }

  function renderBoardSplitDetailPane() {
    return (
      <TabletSplitDetailPane
        ariaLabel={selectedPost?.title.trim() || "게시글"}
        emptyTitle="선택된 글이 없습니다"
        emptyMessage="왼쪽 목록에서 게시글을 선택해 주세요."
        selected={Boolean(selectedPost)}
        onClose={goToList}
        onPrevious={goToPreviousBoardPost}
        onNext={goToNextBoardPost}
        hasPrevious={boardPopupNavigation.hasPrevious}
        hasNext={boardPopupNavigation.hasNext}
        navigationSummary={
          boardPopupNavigation.total > 0
            ? `${boardPopupNavigation.index + 1} / ${boardPopupNavigation.total}`
            : null
        }
        backHandlerId="board-post-detail-modal"
      >
        {selectedPost ? renderBoardPostDetailView("닫기", "split") : null}
      </TabletSplitDetailPane>
    );
  }

  return (
    <section
      id={isPopupPresentation ? undefined : "board-section-anchor"}
      className={`rounded-2xl bg-white ${
        isPopupPresentation
          ? "board-section--popup"
          : "mb-6 shadow-sm ring-1 ring-gray-100 " + (placement === "below-partners" ? "mt-6" : "")
      }${showPopupInlineSplit ? " board-section--popup-split" : ""}`}
    >
      <div
        className="board-section-header flex items-center justify-between border-b border-gray-100 px-4 py-2"
        style={boardSectionHeaderStyles?.bar}
      >
        <p
          className="board-section-header-title text-sm font-semibold text-gray-800"
          style={boardSectionHeaderStyles?.title}
        >
          게시판
        </p>
        <div className="flex items-center gap-2">
          {collapsibleEnabled && (
            <button
              type="button"
              onClick={() => setBoardExpanded((prev) => !prev)}
              className="board-section-header-button rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              style={boardSectionHeaderStyles?.button}
            >
              {boardExpanded ? "접기" : "펼치기"}
            </button>
          )}
        </div>
      </div>

      {boardExpanded &&
        (showPopupInlineSplit ? (
          <TabletSplitLayout
            className="board-section-split-layout"
            master={renderBoardSplitMaster()}
            detail={renderBoardSplitDetailPane()}
          />
        ) : (
          <>
            {renderBoardTabs()}
            <div className={showBoardTabletSplit ? "p-2 sm:p-3" : compactLayout ? "p-3 sm:p-5" : "p-4 sm:p-5"}>
              {renderBoardMasterContent()}
            </div>
          </>
        ))}

      {showBoardPostModal && selectedPost ? (
        <BoardPostModal
          open
          wide
          wideMaxWidthRem={95}
          backHandlerId="board-post-detail-modal"
          ariaLabel={selectedPost.title.trim() || "게시글"}
          onClose={goToList}
          onPrevious={goToPreviousBoardPost}
          onNext={goToNextBoardPost}
          hasPrevious={boardPopupNavigation.hasPrevious}
          hasNext={boardPopupNavigation.hasNext}
          navigationSummary={
            boardPopupNavigation.total > 0
              ? `${boardPopupNavigation.index + 1} / ${boardPopupNavigation.total}`
              : null
          }
          tabletSplit={showBoardTabletSplit}
          splitPane={
            showBoardTabletSplit
              ? {
                  master: renderBoardSplitMaster(),
                  detail: renderBoardPostDetailView("닫기", "popup"),
                  detailSelected: true,
                  emptyTitle: "선택된 글이 없습니다",
                  emptyMessage: "왼쪽 목록에서 게시글을 선택해 주세요.",
                  onDetailClose: goToList,
                  detailAriaLabel: selectedPost.title.trim() || "게시글",
                }
              : undefined
          }
        >
          {!showBoardTabletSplit ? renderBoardPostDetailView("닫기", "popup") : null}
        </BoardPostModal>
      ) : null}

      {showPopupPhoneDetailModal && selectedPost ? (
        <BoardPostModal
          open
          wide
          wideMaxWidthRem={95}
          backHandlerId="board-post-detail-modal"
          ariaLabel={selectedPost.title.trim() || "게시글"}
          onClose={goToList}
          onPrevious={goToPreviousBoardPost}
          onNext={goToNextBoardPost}
          hasPrevious={boardPopupNavigation.hasPrevious}
          hasNext={boardPopupNavigation.hasNext}
          navigationSummary={
            boardPopupNavigation.total > 0
              ? `${boardPopupNavigation.index + 1} / ${boardPopupNavigation.total}`
              : null
          }
        >
          {renderBoardPostDetailView("닫기", "popup")}
        </BoardPostModal>
      ) : null}
    </section>
  );
}
