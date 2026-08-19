"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import BoardBannedIpsAdminPanel from "@/components/admin/BoardBannedIpsAdminPanel";
import {
  BoardDefinition,
  DEFAULT_BOARD_DEFINITIONS,
  getBoardDefinitions,
  getBoardLabel,
} from "@/lib/board-definitions";
import {
  BOARD_POST_STATUS_LABELS,
  getBoardPostStatusLabel,
  normalizeBoardPostStatus,
  requestIpBanReason,
  type BannedIpRow,
} from "@/lib/board-ip-moderation";
import {
  IP_ACTIVITY_TYPE_LABELS,
  isMissingIpActivityLogError,
  type IpActivityLogRow,
} from "@/lib/ip-activity-log";
import { confirmDeletion } from "@/lib/app-modal-messages";
import { usePromptModal } from "@/components/PromptModalProvider";
import { supabase } from "@/lib/supabase";

type IpActivityRow = {
  ip: string;
  postCount: number;
  commentCount: number;
  reviewCount: number;
  maxStatus: number;
  lastSeenAt: string;
  isBanned: boolean;
  banReason: string | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR");
}

function groupActivityLogs(rows: IpActivityLogRow[]) {
  return {
    posts: rows.filter((row) => row.activity_type === "post"),
    comments: rows.filter((row) => row.activity_type === "comment"),
    reviews: rows.filter((row) => row.activity_type === "review"),
  };
}

export default function BoardIpManagementAdminPanel() {
  const { prompt, confirm } = usePromptModal();
  const [boardDefinitions, setBoardDefinitions] = useState<BoardDefinition[]>(
    DEFAULT_BOARD_DEFINITIONS,
  );
  const [ipModerationEnabled, setIpModerationEnabled] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [message, setMessage] = useState("");
  const [activityRows, setActivityRows] = useState<IpActivityRow[]>([]);
  const [bannedItems, setBannedItems] = useState<BannedIpRow[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedIp, setExpandedIp] = useState<string | null>(null);
  const [loadingDetailIp, setLoadingDetailIp] = useState<string | null>(null);
  const [activityDetailByIp, setActivityDetailByIp] = useState<Map<string, IpActivityLogRow[]>>(
    () => new Map(),
  );
  const [dismissingLogId, setDismissingLogId] = useState<number | null>(null);

  const bannedByIp = useMemo(
    () => new Map(bannedItems.map((item) => [item.ip_address, item])),
    [bannedItems],
  );

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    const { data } = await supabase
      .from("site_settings")
      .select(
        "board_ip_moderation_enabled, board_definitions, board_notice_label, board_free_label, board_inquiry_label, free_board_enabled, inquiry_board_enabled",
      )
      .eq("id", 1)
      .maybeSingle();

    setBoardDefinitions(getBoardDefinitions(data));
    setIpModerationEnabled(Boolean(data?.board_ip_moderation_enabled));
    setLoadingSettings(false);
  }, []);

  const loadBannedItems = useCallback(async (): Promise<BannedIpRow[] | null> => {
    const { data, error } = await supabase
      .from("banned_ips")
      .select("id, ip_address, reason, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      if (error.message.includes("banned_ips")) {
        setMessage(
          "IP 관리 SQL이 필요합니다. Supabase SQL Editor에서 board-ip-moderation.sql을 실행해 주세요.",
        );
      }
      setBannedItems([]);
      return null;
    }

    const items = (data ?? []).map((row) => ({
      id: row.id,
      ip_address: String(row.ip_address),
      reason: row.reason,
      created_at: row.created_at,
    }));
    setBannedItems(items);
    return items;
  }, []);

  const loadActivity = useCallback(async () => {
    setLoadingActivity(true);
    setMessage("");

    const bannedList = await loadBannedItems();
    if (!bannedList) {
      setActivityRows([]);
      setLoadingActivity(false);
      return;
    }

    const { data, error } = await supabase.rpc("admin_list_ip_activity_summary");

    if (error) {
      if (isMissingIpActivityLogError(error.message)) {
        setMessage(
          "활동 IP 로그 SQL이 필요합니다. Supabase SQL Editor에서 ip-activity-log.sql을 실행해 주세요.",
        );
      } else {
        setMessage(`활동 IP 목록 불러오기 실패: ${error.message}`);
      }
      setActivityRows([]);
      setLoadingActivity(false);
      return;
    }

    const bannedMap = new Map(bannedList.map((item) => [item.ip_address, item]));

    setActivityRows(
      ((data ?? []) as {
        ip: string;
        post_count: number;
        comment_count: number;
        review_count: number;
        max_status: number;
        last_seen_at: string;
      }[]).map((row) => ({
        ip: row.ip,
        postCount: Number(row.post_count) || 0,
        commentCount: Number(row.comment_count) || 0,
        reviewCount: Number(row.review_count) || 0,
        maxStatus: normalizeBoardPostStatus(row.max_status),
        lastSeenAt: row.last_seen_at,
        isBanned: bannedMap.has(row.ip),
        banReason: bannedMap.get(row.ip)?.reason ?? null,
      })),
    );

    setLoadingActivity(false);
  }, [loadBannedItems]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadActivity();
    setExpandedIp(null);
    setActivityDetailByIp(new Map());
  }, [loadActivity, refreshKey]);

  async function loadIpActivityDetail(ip: string) {
    const { data, error } = await supabase.rpc("admin_list_ip_activity_for_ip", { p_ip: ip });

    if (error) {
      if (isMissingIpActivityLogError(error.message)) {
        setMessage(
          "활동 IP 로그 SQL이 필요합니다. Supabase SQL Editor에서 ip-activity-log.sql을 실행해 주세요.",
        );
      } else {
        setMessage(`활동 내역 불러오기 실패: ${error.message}`);
      }
      return null;
    }

    return (data as IpActivityLogRow[]) ?? [];
  }

  async function banIp(ip: string) {
    if (bannedByIp.has(ip)) {
      setMessage("이미 차단된 IP입니다.");
      return;
    }

    const actionReason = await requestIpBanReason(prompt);
    if (actionReason === null) {
      return;
    }

    const { error } = await supabase.from("banned_ips").insert({
      ip_address: ip,
      reason: actionReason || null,
    });

    if (error) {
      setMessage(
        error.message.includes("duplicate")
          ? "이미 차단된 IP입니다."
          : `IP 차단 실패: ${error.message}`,
      );
      return;
    }

    setMessage(`${ip} IP를 차단했습니다.`);
    setRefreshKey((value) => value + 1);
  }

  async function toggleIpActivityDetail(ip: string) {
    if (expandedIp === ip) {
      setExpandedIp(null);
      return;
    }

    setExpandedIp(ip);

    if (activityDetailByIp.has(ip)) {
      return;
    }

    setLoadingDetailIp(ip);
    const rows = await loadIpActivityDetail(ip);
    if (rows) {
      setActivityDetailByIp((prev) => {
        const next = new Map(prev);
        next.set(ip, rows);
        return next;
      });
    }
    setLoadingDetailIp(null);
  }

  async function dismissActivityLog(ip: string, logId: number) {
    const confirmed = await confirmDeletion(confirm, "이 활동 기록을 목록에서 삭제하시겠습니까?");
    if (!confirmed) {
      return;
    }

    setDismissingLogId(logId);
    setMessage("");

    const { error } = await supabase.rpc("admin_dismiss_ip_activity_log", { p_log_id: logId });

    setDismissingLogId(null);

    if (error) {
      setMessage(
        isMissingIpActivityLogError(error.message)
          ? "활동 IP 로그 SQL이 필요합니다. Supabase SQL Editor에서 ip-activity-log.sql을 실행해 주세요."
          : `활동 기록 삭제 실패: ${error.message}`,
      );
      return;
    }

    setActivityDetailByIp((prev) => {
      const next = new Map(prev);
      const current = next.get(ip) ?? [];
      const filtered = current.filter((row) => row.id !== logId);
      if (filtered.length > 0) {
        next.set(ip, filtered);
      } else {
        next.delete(ip);
        setExpandedIp(null);
      }
      return next;
    });

    setMessage("활동 기록을 목록에서 삭제했습니다.");
    setRefreshKey((value) => value + 1);
  }

  async function unbanIp(ip: string) {
    const row = bannedByIp.get(ip);
    if (!row) {
      return;
    }

    const { error } = await supabase.from("banned_ips").delete().eq("id", row.id);

    if (error) {
      setMessage(`IP 차단 해제 실패: ${error.message}`);
      return;
    }

    setMessage(`${ip} IP 차단을 해제했습니다.`);
    setRefreshKey((value) => value + 1);
  }

  function renderActivityItem(ip: string, item: IpActivityLogRow) {
    const typeLabel = IP_ACTIVITY_TYPE_LABELS[item.activity_type];

    return (
      <li
        key={item.id}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-sky-100 px-2 py-0.5 font-medium text-sky-800">
                {typeLabel}
              </span>
              {item.source_deleted ? (
                <span className="rounded-md bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                  사용자 삭제
                </span>
              ) : null}
              {item.is_hidden ? (
                <span className="rounded-md bg-red-100 px-2 py-0.5 font-medium text-red-700">
                  숨김
                </span>
              ) : null}
              {item.activity_type === "post" ? (
                <>
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                    {getBoardLabel(boardDefinitions, item.board_type ?? "")}
                  </span>
                  <span className="text-gray-500">{getBoardPostStatusLabel(item.status)}</span>
                </>
              ) : null}
            </div>

            {item.activity_type === "post" ? (
              <p className="mt-1 font-medium text-gray-900">{item.title ?? "제목 없음"}</p>
            ) : null}

            {item.activity_type === "comment" ? (
              <p className="mt-1 font-medium text-gray-900">
                {item.post_title ?? "게시글"} · {item.author_name}
              </p>
            ) : null}

            {item.activity_type === "review" ? (
              <p className="mt-1 font-medium text-gray-900">
                {item.partner_name ?? "업체"} · {item.author_name}
              </p>
            ) : null}

            {item.activity_type === "post" ? (
              <p className="mt-0.5 text-gray-600">{item.author_name}</p>
            ) : null}

            {item.activity_type !== "post" ? (
              <p className="mt-1 whitespace-pre-line text-gray-700">{item.content_preview}</p>
            ) : null}

            <p className="mt-1 text-gray-500">{formatDate(item.created_at)}</p>
          </div>

          <button
            type="button"
            disabled={dismissingLogId === item.id}
            onClick={() => void dismissActivityLog(ip, item.id)}
            className="shrink-0 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100 disabled:opacity-60"
          >
            {dismissingLogId === item.id ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </li>
    );
  }

  function renderActivitySection(
    ip: string,
    title: string,
    items: IpActivityLogRow[],
  ) {
    return (
      <div>
        <p className="text-sm font-semibold text-gray-900">
          {title} ({items.length})
        </p>
        {items.length === 0 ? (
          <p className="mt-1 text-xs text-gray-500">없음</p>
        ) : (
          <ul className="mt-2 space-y-2">{items.map((item) => renderActivityItem(ip, item))}</ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <AdminCollapsibleSection
        title="IP 관리 안내"
        description="비회원 게시글·댓글·후기 작성 IP를 추적하고 차단할 수 있습니다."
        defaultExpanded
      >
        {loadingSettings ? (
          <p className="text-sm text-gray-500">설정 불러오는 중...</p>
        ) : (
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              IP 기록·단계별 제재:{" "}
              <span className={ipModerationEnabled ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                {ipModerationEnabled ? "사용 중" : "꺼짐"}
              </span>
            </p>
            {!ipModerationEnabled ? (
              <p className="text-xs text-gray-500">
                IP 저장·단계 제재를 쓰려면 <strong>고급 → 개발자 모드</strong>에서 「IP 기록·차단」을 켜 주세요.
                차단 목록은 IP 관리가 꺼져 있어도 등록·해제할 수 있습니다.
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                1차 경고 → 2차 임시숨김 → 3차 영구숨김 규칙은 게시글 관리에서 IP별 상태로 조정할 수 있습니다.
              </p>
            )}
            <p className="text-xs text-gray-500">
              활동 IP 목록은 사용자가 글을 삭제해도 관리자에게 남습니다. 목록에서 삭제하면 관리자 화면에서만
              숨겨집니다.
            </p>
          </div>
        )}
      </AdminCollapsibleSection>

      <BoardBannedIpsAdminPanel onChanged={() => setRefreshKey((value) => value + 1)} />

      <AdminCollapsibleSection
        title="활동 IP 목록"
        description="게시글·댓글·제휴 후기 IP 활동입니다. 사용자가 삭제한 글도 「사용자 삭제」로 표시됩니다."
        defaultExpanded
      >
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
              <tr>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">게시글</th>
                <th className="px-3 py-2">댓글</th>
                <th className="px-3 py-2">후기</th>
                <th className="px-3 py-2">최고 단계</th>
                <th className="px-3 py-2">최근 활동</th>
                <th className="px-3 py-2">차단</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {loadingActivity ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-gray-500">
                    불러오는 중...
                  </td>
                </tr>
              ) : activityRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-gray-500">
                    기록된 IP가 없습니다.
                  </td>
                </tr>
              ) : (
                activityRows.map((row) => {
                  const detailRows = activityDetailByIp.get(row.ip) ?? [];
                  const grouped = groupActivityLogs(detailRows);
                  const isExpanded = expandedIp === row.ip;
                  const isLoadingDetail = loadingDetailIp === row.ip;

                  return (
                    <Fragment key={row.ip}>
                      <tr className="border-t border-gray-100 align-top">
                        <td className="px-3 py-2 font-mono text-xs">{row.ip}</td>
                        <td className="px-3 py-2">{row.postCount}</td>
                        <td className="px-3 py-2">{row.commentCount}</td>
                        <td className="px-3 py-2">{row.reviewCount}</td>
                        <td className="px-3 py-2">
                          {row.postCount > 0
                            ? BOARD_POST_STATUS_LABELS[
                                normalizeBoardPostStatus(row.maxStatus) as keyof typeof BOARD_POST_STATUS_LABELS
                              ]
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {row.lastSeenAt ? formatDate(row.lastSeenAt) : "-"}
                        </td>
                        <td className="px-3 py-2">
                          {row.isBanned ? (
                            <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                              차단됨
                            </span>
                          ) : (
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                              정상
                            </span>
                          )}
                          {row.banReason ? (
                            <p className="mt-1 max-w-[12rem] text-xs text-gray-600">{row.banReason}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end gap-1">
                            <button
                              type="button"
                              onClick={() => void toggleIpActivityDetail(row.ip)}
                              className="text-xs text-sky-700 hover:underline"
                            >
                              {isExpanded ? "닫기" : "활동 보기"}
                            </button>
                            {row.isBanned ? (
                              <button
                                type="button"
                                onClick={() => void unbanIp(row.ip)}
                                className="text-xs text-emerald-700 hover:underline"
                              >
                                해제
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void banIp(row.ip)}
                                className="text-xs text-red-600 hover:underline"
                              >
                                차단
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="border-t border-gray-100 bg-gray-50">
                          <td colSpan={8} className="px-4 py-4">
                            {isLoadingDetail ? (
                              <p className="text-sm text-gray-500">활동 내역 불러오는 중...</p>
                            ) : detailRows.length > 0 ? (
                              <div className="space-y-4">
                                {renderActivitySection(row.ip, "게시글", grouped.posts)}
                                {renderActivitySection(row.ip, "댓글", grouped.comments)}
                                {renderActivitySection(row.ip, "제휴 후기", grouped.reviews)}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">활동 내역이 없습니다.</p>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </AdminCollapsibleSection>
    </div>
  );
}
