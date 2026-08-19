"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import {
  BoardDefinition,
  DEFAULT_BOARD_DEFINITIONS,
  getBoardDefinitions,
  getBoardLabel,
} from "@/lib/board-definitions";
import {
  getBoardReportReasons,
  getBoardReportSuccessMessage,
  normalizeBoardReportReasons,
  BoardReport,
  requestAdminSuspensionReason,
  requestReportBanType,
  DEFAULT_BOARD_REPORT_SUCCESS_MESSAGE,
} from "@/lib/board-reports";
import { requestIpBanReason } from "@/lib/board-ip-moderation";
import {
  formatVoterKeyLabel,
  requestDeviceBanReason,
} from "@/lib/board-device-moderation";
import { formatSiteSettingsSaveError } from "@/lib/site-settings-save-error";
import { usePromptModal } from "@/components/PromptModalProvider";
import { confirmDeletion } from "@/lib/app-modal-messages";
import { BoardComment, BoardPost, supabase } from "@/lib/supabase";

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR");
}

type PartnerReviewReportTarget = {
  id: string;
  partner_name: string;
  author_name: string;
  content: string;
  user_ip?: string | null;
  voter_key?: string | null;
};

type ReportTargetModeration = {
  user_ip: string | null;
  voter_key: string | null;
};

const REPORT_SELECT_FIELDS =
  "id, post_id, comment_id, partner_review_id, reason, reporter_ip, is_reviewed, is_admin_created, admin_action_reason, created_at";

export default function BoardReportsAdminPanel() {
  const { prompt, confirm } = usePromptModal();
  const [boardDefinitions, setBoardDefinitions] = useState<BoardDefinition[]>(
    DEFAULT_BOARD_DEFINITIONS,
  );
  const [reports, setReports] = useState<BoardReport[]>([]);
  const [postsById, setPostsById] = useState<Map<string, BoardPost>>(new Map());
  const [commentsById, setCommentsById] = useState<Map<string, BoardComment>>(new Map());
  const [partnerReviewsById, setPartnerReviewsById] = useState<
    Map<string, PartnerReviewReportTarget>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [reasonDrafts, setReasonDrafts] = useState<string[]>(() => [...getBoardReportReasons()]);
  const [successMessageDraft, setSuccessMessageDraft] = useState(
    DEFAULT_BOARD_REPORT_SUCCESS_MESSAGE,
  );
  const [reasonSaving, setReasonSaving] = useState(false);
  const [ipModerationEnabled, setIpModerationEnabled] = useState(false);
  const [deviceModerationEnabled, setDeviceModerationEnabled] = useState(false);

  const pendingCount = useMemo(
    () => reports.filter((report) => !report.is_reviewed).length,
    [reports],
  );

  useEffect(() => {
    void supabase
      .from("site_settings")
      .select(
        "board_definitions, board_notice_label, board_free_label, board_inquiry_label, free_board_enabled, inquiry_board_enabled, board_report_reasons, board_report_success_message, board_ip_moderation_enabled, board_device_moderation_enabled",
      )
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        const boards = getBoardDefinitions(data);
        setBoardDefinitions(boards);
        setReasonDrafts([...getBoardReportReasons(data)]);
        setSuccessMessageDraft(getBoardReportSuccessMessage(data));
        setIpModerationEnabled(Boolean(data?.board_ip_moderation_enabled));
        setDeviceModerationEnabled(Boolean(data?.board_device_moderation_enabled));
      });
  }, []);

  function updateReasonDraft(index: number, value: string) {
    setReasonDrafts((prev) => prev.map((reason, reasonIndex) => (reasonIndex === index ? value : reason)));
  }

  function addReasonDraft() {
    if (reasonDrafts.length >= 20) {
      return;
    }

    setReasonDrafts((prev) => [...prev, ""]);
  }

  function removeReasonDraft(index: number) {
    setReasonDrafts((prev) => prev.filter((_, reasonIndex) => reasonIndex !== index));
  }

  function moveReasonDraft(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= reasonDrafts.length) {
      return;
    }

    setReasonDrafts((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
  }

  async function saveReportReasons(event: React.FormEvent) {
    event.preventDefault();
    setReasonSaving(true);
    setMessage("");

    const defaultReasons = normalizeBoardReportReasons(
      reasonDrafts.map((reason) => reason.trim()).filter((reason) => reason.length > 0),
    );
    const successMessage = successMessageDraft.trim() || null;

    const { error } = await supabase
      .from("site_settings")
      .update({
        board_report_reasons: defaultReasons,
        board_report_reasons_by_board: {},
        partner_review_report_reasons: null,
        board_report_success_message: successMessage,
      })
      .eq("id", 1);

    setReasonSaving(false);

    if (error) {
      setMessage(formatSiteSettingsSaveError(error.message));
      return;
    }

    setReasonDrafts([...defaultReasons]);
    setSuccessMessageDraft(successMessage ?? DEFAULT_BOARD_REPORT_SUCCESS_MESSAGE);
    setMessage("신고 설정을 저장했습니다.");
  }

  const loadReportTargets = useCallback(
    async (nextReports: BoardReport[]) => {
      const postIds = new Set<string>();
      const commentIds = new Set<string>();
      const partnerReviewIds = new Set<string>();

      for (const report of nextReports) {
        if (report.post_id) {
          postIds.add(report.post_id);
        }
        if (report.comment_id) {
          commentIds.add(report.comment_id);
        }
        if (report.partner_review_id) {
          partnerReviewIds.add(report.partner_review_id);
        }
      }

      const nextPostsById = new Map<string, BoardPost>();
      const nextCommentsById = new Map<string, BoardComment>();
      const nextPartnerReviewsById = new Map<string, PartnerReviewReportTarget>();

      if (postIds.size > 0) {
        const { data: postData } = await supabase
          .from("board_posts")
          .select("id, board_type, title, author_name, is_hidden, user_ip, voter_key")
          .in("id", [...postIds]);

        for (const post of (postData as BoardPost[]) ?? []) {
          nextPostsById.set(post.id, post);
        }
      }

      if (commentIds.size > 0) {
        const { data: commentData } = await supabase
          .from("board_comments")
          .select("id, post_id, author_name, content, is_hidden, user_ip, voter_key")
          .in("id", [...commentIds]);

        for (const comment of (commentData as BoardComment[]) ?? []) {
          nextCommentsById.set(comment.id, comment);
          postIds.add(comment.post_id);
        }

        const missingPostIds = [...postIds].filter((id) => !nextPostsById.has(id));
        if (missingPostIds.length > 0) {
          const { data: extraPostData } = await supabase
            .from("board_posts")
            .select("id, board_type, title, author_name, is_hidden, user_ip, voter_key")
            .in("id", missingPostIds);

          for (const post of (extraPostData as BoardPost[]) ?? []) {
            nextPostsById.set(post.id, post);
          }
        }
      }

      if (partnerReviewIds.size > 0) {
        const { data: reviewData, error: reviewError } = await supabase.rpc(
          "admin_list_partner_reviews",
          { p_partner_id: null },
        );

        if (reviewError) {
          setMessage(`제휴 후기 정보 불러오기 실패: ${reviewError.message}`);
        } else {
          for (const review of (reviewData as PartnerReviewReportTarget[]) ?? []) {
            if (partnerReviewIds.has(review.id)) {
              nextPartnerReviewsById.set(review.id, review);
            }
          }
        }
      }

      setPostsById(nextPostsById);
      setCommentsById(nextCommentsById);
      setPartnerReviewsById(nextPartnerReviewsById);
    },
    [],
  );

  const loadReports = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("board_reports")
      .select(REPORT_SELECT_FIELDS)
      .order("is_reviewed", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      if (error.message.includes("board_reports")) {
        setMessage(
          "신고 목록을 불러오지 못했습니다. Supabase SQL Editor에서 board-reports-and-comment-ip.sql을 실행해 주세요.",
        );
      } else if (
        error.message.includes("partner_review_id") ||
        error.message.includes("is_admin_created") ||
        error.message.includes("admin_action_reason")
      ) {
        setMessage(
          "신고 관리 SQL이 필요합니다. partner-review-reports-and-ip.sql, board-reports-admin-fields.sql, content-admin-action-reason.sql을 실행해 주세요.",
        );
      } else {
        setMessage(`신고 목록 불러오기 실패: ${error.message}`);
      }
      setReports([]);
      setPostsById(new Map());
      setCommentsById(new Map());
      setPartnerReviewsById(new Map());
      setLoading(false);
      return;
    }

    const nextReports = (data as BoardReport[]) ?? [];
    setReports(nextReports);
    await loadReportTargets(nextReports);
    setLoading(false);
  }, [loadReportTargets]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function markReviewed(report: BoardReport, adminActionReason?: string | null) {
    const payload: { is_reviewed: boolean; admin_action_reason?: string | null } = {
      is_reviewed: true,
    };

    if (adminActionReason !== undefined) {
      payload.admin_action_reason = adminActionReason || null;
    }

    const { error } = await supabase.from("board_reports").update(payload).eq("id", report.id);

    if (error) {
      setMessage(`신고 처리 실패: ${error.message}`);
      return false;
    }

    await loadReports();
    return true;
  }

  async function hideReportTarget(report: BoardReport) {
    const actionReason = await requestAdminSuspensionReason(prompt, "정지");
    if (actionReason === null) {
      return;
    }

    if (report.comment_id) {
      const { error } = await supabase
        .from("board_comments")
        .update({
          is_hidden: true,
          admin_action_reason: actionReason || null,
        })
        .eq("id", report.comment_id);

      if (error) {
        setMessage(`댓글 숨김 실패: ${error.message}`);
        return;
      }
    } else if (report.partner_review_id) {
      const { error } = await supabase.rpc("admin_set_partner_review_hidden", {
        p_review_id: report.partner_review_id,
        p_hidden: true,
        p_admin_action_reason: actionReason || null,
      });

      if (error) {
        setMessage(`제휴 후기 숨김 실패: ${error.message}`);
        return;
      }
    } else if (report.post_id) {
      const { error } = await supabase
        .from("board_posts")
        .update({
          is_hidden: true,
          admin_action_reason: actionReason || null,
        })
        .eq("id", report.post_id);

      if (error) {
        setMessage(`게시글 숨김 실패: ${error.message}`);
        return;
      }
    }

    const ok = await markReviewed(report, actionReason || null);
    if (ok) {
      setMessage("대상을 숨기고 신고를 처리했습니다.");
    }
  }

  async function handleConfirmReport(report: BoardReport) {
    const actionReason = await requestAdminSuspensionReason(prompt, "처리");
    if (actionReason === null) {
      return;
    }

    const ok = await markReviewed(report, actionReason || null);
    if (ok) {
      setMessage("신고를 확인 완료했습니다.");
    }
  }

  async function handleDeleteReport(report: BoardReport) {
    const confirmed = await confirmDeletion(confirm, "이 신고 내역을 삭제하시겠습니까?");
    if (!confirmed) {
      return;
    }

    const { error } = await supabase.from("board_reports").delete().eq("id", report.id);

    if (error) {
      setMessage(`신고 삭제 실패: ${error.message}`);
      return;
    }

    setMessage("신고 내역을 삭제했습니다.");
    await loadReports();
  }

  function getReportTargetModeration(report: BoardReport): ReportTargetModeration {
    if (report.partner_review_id) {
      const review = partnerReviewsById.get(report.partner_review_id);
      return {
        user_ip: review?.user_ip ? String(review.user_ip) : null,
        voter_key: review?.voter_key?.trim() || null,
      };
    }

    if (report.comment_id) {
      const comment = commentsById.get(report.comment_id);
      return {
        user_ip: comment?.user_ip?.trim() || null,
        voter_key: comment?.voter_key?.trim() || null,
      };
    }

    const post = report.post_id ? postsById.get(report.post_id) : null;
    return {
      user_ip: post?.user_ip?.trim() || null,
      voter_key: post?.voter_key?.trim() || null,
    };
  }

  async function handleBanReport(report: BoardReport) {
    const moderation = getReportTargetModeration(report);
    const targetIp = moderation.user_ip;
    const targetVoterKey = moderation.voter_key;
    const canBanIp = ipModerationEnabled && Boolean(targetIp);
    const canBanDevice =
      deviceModerationEnabled && Boolean(targetVoterKey && targetVoterKey.length >= 8);

    if (!canBanIp && !canBanDevice) {
      setMessage("차단할 IP 또는 기기 키가 없습니다. 개발자 모드에서 IP/기기 관리를 켜 주세요.");
      return;
    }

    let banType: "ip" | "device";
    if (canBanIp && canBanDevice) {
      const selected = await requestReportBanType(prompt, true, true);
      if (!selected) {
        return;
      }
      banType = selected;
    } else {
      banType = canBanIp ? "ip" : "device";
    }

    if (banType === "ip") {
      const actionReason = await requestIpBanReason(prompt);
      if (actionReason === null) {
        return;
      }

      const { error } = await supabase.from("banned_ips").insert({
        ip_address: targetIp,
        reason: actionReason.trim() || `신고 #${report.id} 처리`,
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

      const ok = await markReviewed(report, actionReason.trim() || null);
      if (ok) {
        setMessage(`${targetIp} IP를 차단하고 신고를 처리했습니다.`);
      }
      return;
    }

    const actionReason = await requestDeviceBanReason(prompt);
    if (actionReason === null) {
      return;
    }

    const { error } = await supabase.from("banned_voter_keys").insert({
      voter_key: targetVoterKey,
      reason: actionReason.trim() || `신고 #${report.id} 처리`,
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

    const ok = await markReviewed(report, actionReason.trim() || null);
    if (ok) {
      setMessage("기기를 차단하고 신고를 처리했습니다.");
    }
  }

  function getReportTargetLabel(report: BoardReport) {
    if (report.partner_review_id) {
      const review = partnerReviewsById.get(report.partner_review_id);
      const preview = review?.content?.trim().slice(0, 80) ?? "제휴 후기";
      return `제휴 후기 · ${review?.partner_name ?? "업체"} · ${review?.author_name ?? "작성자"} · ${preview}`;
    }

    if (report.comment_id) {
      const comment = commentsById.get(report.comment_id);
      const preview = comment?.content?.trim().slice(0, 80) ?? "댓글";
      return `댓글 · ${comment?.author_name ?? "작성자"} · ${preview}`;
    }

    const post = report.post_id ? postsById.get(report.post_id) : null;
    return `게시글 · ${post?.title ?? "제목 없음"}`;
  }

  function getReportBoardLabel(report: BoardReport) {
    if (report.partner_review_id) {
      return "제휴 후기";
    }

    const postId = report.comment_id
      ? commentsById.get(report.comment_id)?.post_id ?? report.post_id
      : report.post_id;

    if (!postId) {
      return "게시판";
    }

    const post = postsById.get(postId);
    return post ? getBoardLabel(boardDefinitions, post.board_type) : "게시판";
  }

  function getReportTypeLabel(report: BoardReport) {
    if (report.partner_review_id) {
      return "제휴 후기";
    }

    return report.comment_id ? "댓글" : "게시글";
  }

  function getReportTypeBadgeClass(report: BoardReport) {
    if (report.partner_review_id) {
      return "bg-amber-100 text-amber-800";
    }

    return report.comment_id ? "bg-sky-100 text-sky-800" : "bg-violet-100 text-violet-800";
  }

  return (
    <div className="space-y-6">
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <AdminCollapsibleSection
        title="신고 사유 설정"
        description="게시글·댓글·제휴 후기에 공통으로 사용할 신고 사유 목록과 신고 완료 안내 문구를 설정합니다."
        defaultExpanded
      >
        <form onSubmit={saveReportReasons} className="grid gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">기본 신고 사유</p>
              <p className="mt-1 text-xs text-gray-500">
                사용자가 신고할 때 선택하는 사유 목록입니다. 최대 20개까지 등록할 수 있습니다.
              </p>
            </div>

            {reasonDrafts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-500">
                등록된 신고 사유가 없습니다. 아래 「목록 추가」 버튼으로 사유를 추가해 주세요.
              </p>
            ) : null}

            {reasonDrafts.map((reason, index) => (
              <div
                key={`report-reason-${index}`}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-700">사유 {index + 1}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveReasonDraft(index, -1)}
                      disabled={index === 0}
                      className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveReasonDraft(index, 1)}
                      disabled={index === reasonDrafts.length - 1}
                      className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeReasonDraft(index)}
                      className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={reason}
                  onChange={(event) => updateReasonDraft(index, event.target.value)}
                  placeholder="예: 스팸/광고"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addReasonDraft}
              disabled={reasonDrafts.length >= 20}
              className="rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-emerald-400 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              목록 추가
            </button>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            신고 완료 안내 문구
            <input
              type="text"
              value={successMessageDraft}
              onChange={(event) => setSuccessMessageDraft(event.target.value)}
              placeholder={DEFAULT_BOARD_REPORT_SUCCESS_MESSAGE}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <span className="mt-1 block text-xs text-gray-500">
              신고 접수 후 사용자에게 팝업으로 표시됩니다. 비우면 「{DEFAULT_BOARD_REPORT_SUCCESS_MESSAGE}」가
              사용됩니다.
            </span>
          </label>

          <button
            type="submit"
            disabled={reasonSaving}
            className="w-fit rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {reasonSaving ? "저장 중..." : "신고 설정 저장"}
          </button>
        </form>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title={`신고 목록${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
        description="회원·비회원 신고 내역입니다. 숨김 처리 시 정지 사유를 남길 수 있습니다."
        defaultExpanded
      >
        {loading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-gray-500">접수된 신고가 없습니다.</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {reports.map((report) => {
              const targetModeration = getReportTargetModeration(report);
              const canBanIp = ipModerationEnabled && Boolean(targetModeration.user_ip);
              const canBanDevice =
                deviceModerationEnabled &&
                Boolean(
                  targetModeration.voter_key && targetModeration.voter_key.length >= 8,
                );

              return (
              <article key={report.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {getReportBoardLabel(report)}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${getReportTypeBadgeClass(report)}`}
                      >
                        {getReportTypeLabel(report)}
                      </span>
                      {report.is_admin_created ? (
                        <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                          관리자 등록
                        </span>
                      ) : null}
                      {!report.is_reviewed ? (
                        <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                          미처리
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          처리됨
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-900">{getReportTargetLabel(report)}</p>
                    <p className="mt-1 text-sm text-gray-700">신고 사유: {report.reason}</p>
                    {report.admin_action_reason ? (
                      <p className="mt-1 text-sm text-red-700">
                        정지/처리 사유: {report.admin_action_reason}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(report.created_at)}
                      {report.reporter_ip ? (
                        <span className="ml-2 font-mono">신고자 IP {report.reporter_ip}</span>
                      ) : null}
                    </p>
                    {canBanIp || canBanDevice ? (
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                        <span className="font-medium text-gray-700">작성자</span>
                        {canBanIp && targetModeration.user_ip ? (
                          <span>
                            <span className="font-medium text-gray-700">IP </span>
                            <span className="font-mono text-gray-800">{targetModeration.user_ip}</span>
                          </span>
                        ) : null}
                        {canBanDevice && targetModeration.voter_key ? (
                          <span>
                            <span className="font-medium text-gray-700">기기 </span>
                            <span
                              className="font-mono text-gray-800"
                              title={targetModeration.voter_key}
                            >
                              {formatVoterKeyLabel(targetModeration.voter_key)}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!report.is_reviewed ? (
                      <>
                        {(canBanIp || canBanDevice) && (
                          <button
                            type="button"
                            onClick={() => void handleBanReport(report)}
                            aria-label={
                              canBanIp && canBanDevice
                                ? `${getReportTargetLabel(report)} 작성자 IP 또는 기기 차단`
                                : canBanIp
                                  ? `${getReportTargetLabel(report)} 작성자 IP 차단`
                                  : `${getReportTargetLabel(report)} 작성자 기기 차단`
                            }
                            className="rounded-lg border border-violet-200 px-3 py-1.5 text-sm text-violet-700 hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                          >
                            {canBanIp && canBanDevice ? "IP/기기 차단" : canBanIp ? "IP 차단" : "기기 차단"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void hideReportTarget(report)}
                          aria-label={`${getReportTargetLabel(report)} 숨김 처리`}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        >
                          숨김 처리
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleConfirmReport(report)}
                          aria-label={`${getReportTargetLabel(report)} 신고 확인 완료`}
                          className="rounded-lg border border-emerald-200 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                        >
                          확인 완료
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleDeleteReport(report)}
                      aria-label={`신고 #${report.id} 삭제`}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </article>
              );
            })}
          </div>
        )}
      </AdminCollapsibleSection>
    </div>
  );
}
