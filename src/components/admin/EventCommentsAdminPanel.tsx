"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { usePromptModal } from "@/components/PromptModalProvider";
import { requestDeviceBanReason, formatVoterKeyLabel } from "@/lib/board-device-moderation";
import { requestIpBanReason } from "@/lib/board-ip-moderation";
import { requestAdminSuspensionReason } from "@/lib/board-reports";
import { formatEventCommentDate } from "@/lib/site-event-comments";
import { SiteEvent, supabase } from "@/lib/supabase";

type AdminEventCommentRow = {
  id: string;
  tab_id: string;
  event_id: string;
  event_title: string;
  tab_label: string;
  author_name: string;
  content: string;
  is_hidden: boolean;
  admin_action_reason?: string | null;
  user_ip?: string | null;
  voter_key?: string | null;
  created_at: string;
};

export default function EventCommentsAdminPanel() {
  const { prompt } = usePromptModal();
  const [events, setEvents] = useState<SiteEvent[]>([]);
  const [comments, setComments] = useState<AdminEventCommentRow[]>([]);
  const [filterEventId, setFilterEventId] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [ipModerationEnabled, setIpModerationEnabled] = useState(false);
  const [deviceModerationEnabled, setDeviceModerationEnabled] = useState(false);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.title.localeCompare(b.title, "ko")),
    [events],
  );

  const loadEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("site_events")
      .select("id, title")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(
        error.message.includes("site_events")
          ? "이벤트 테이블이 없습니다. site-events.sql을 실행해 주세요."
          : `이벤트 목록 불러오기 실패: ${error.message}`,
      );
      return;
    }

    setEvents((data as SiteEvent[]) ?? []);
  }, []);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("board_ip_moderation_enabled, board_device_moderation_enabled")
      .eq("id", 1)
      .maybeSingle();

    setIpModerationEnabled(data?.board_ip_moderation_enabled ?? false);
    setDeviceModerationEnabled(data?.board_device_moderation_enabled ?? false);
  }, []);

  const loadComments = useCallback(async (eventId: string) => {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.rpc("admin_list_event_comments", {
      p_event_id: eventId === "all" ? null : eventId,
    });

    setLoading(false);

    if (error) {
      if (
        error.message.toLowerCase().includes("could not find the function") ||
        error.message.toLowerCase().includes("pgrst202")
      ) {
        setMessage(
          "이벤트 댓글 관리 SQL이 없습니다. Supabase에서 site-event-comments-admin.sql을 실행해 주세요.",
        );
        setComments([]);
        return;
      }
      setMessage(`댓글 목록을 불러오지 못했습니다: ${error.message}`);
      setComments([]);
      return;
    }

    setComments((data as AdminEventCommentRow[]) ?? []);
  }, []);

  useEffect(() => {
    void loadEvents();
    void loadSettings();
  }, [loadEvents, loadSettings]);

  useEffect(() => {
    void loadComments(filterEventId);
  }, [filterEventId, loadComments]);

  const filteredComments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return comments;
    }

    return comments.filter((comment) =>
      [comment.event_title, comment.tab_label, comment.author_name, comment.content].some((field) =>
        field.toLowerCase().includes(query),
      ),
    );
  }, [comments, search]);

  async function toggleHidden(comment: AdminEventCommentRow) {
    setMessage("");

    if (!comment.is_hidden) {
      const actionReason = await requestAdminSuspensionReason(prompt, "정지");
      if (actionReason === null) {
        return;
      }

      const { error } = await supabase.rpc("admin_set_event_comment_hidden", {
        p_comment_id: comment.id,
        p_hidden: true,
        p_admin_action_reason: actionReason || null,
      });

      if (error) {
        setMessage(
          error.message.toLowerCase().includes("could not find the function")
            ? "이벤트 댓글 관리 SQL이 없습니다. site-event-comments-admin.sql을 실행해 주세요."
            : `상태 변경 실패: ${error.message}`,
        );
        return;
      }

      setMessage("댓글을 숨겼습니다.");
      void loadComments(filterEventId);
      return;
    }

    const { error } = await supabase.rpc("admin_set_event_comment_hidden", {
      p_comment_id: comment.id,
      p_hidden: false,
      p_admin_action_reason: null,
    });

    if (error) {
      setMessage(`상태 변경 실패: ${error.message}`);
      return;
    }

    setMessage("댓글을 다시 표시했습니다.");
    void loadComments(filterEventId);
  }

  async function deleteComment(comment: AdminEventCommentRow) {
    if (!window.confirm("이 댓글을 완전히 삭제할까요?")) {
      return;
    }

    setMessage("");

    const { error } = await supabase.rpc("admin_delete_event_comment", {
      p_comment_id: comment.id,
    });

    if (error) {
      setMessage(
        error.message.toLowerCase().includes("could not find the function")
          ? "이벤트 댓글 관리 SQL이 없습니다. site-event-comments-admin.sql을 실행해 주세요."
          : `삭제 실패: ${error.message}`,
      );
      return;
    }

    setMessage("댓글을 삭제했습니다.");
    void loadComments(filterEventId);
  }

  async function banCommentIp(comment: AdminEventCommentRow) {
    const ip = comment.user_ip?.trim();
    if (!ip) {
      setMessage("저장된 IP가 없습니다. site-event-comments-parity.sql 실행 후 작성된 댓글만 IP가 저장됩니다.");
      return;
    }

    const actionReason = await requestIpBanReason(prompt);
    if (actionReason === null) {
      return;
    }

    const { error } = await supabase.from("banned_ips").insert({
      ip_address: ip,
      reason:
        actionReason.trim() ||
        `이벤트 댓글 "${comment.event_title}" / ${comment.author_name}에서 차단`,
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

  async function banCommentDevice(comment: AdminEventCommentRow) {
    const voterKey = comment.voter_key?.trim();
    if (!voterKey || voterKey.length < 8) {
      setMessage(
        "저장된 기기 키가 없습니다. site-event-comments-parity.sql 실행 후 작성된 댓글만 기기 키가 저장됩니다.",
      );
      return;
    }

    const actionReason = await requestDeviceBanReason(prompt);
    if (actionReason === null) {
      return;
    }

    const { error } = await supabase.from("banned_voter_keys").insert({
      voter_key: voterKey,
      reason:
        actionReason.trim() ||
        `이벤트 댓글 "${comment.event_title}" / ${comment.author_name}에서 차단`,
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
    <AdminCollapsibleSection
      title="이벤트 댓글 관리"
      description={
        <>
          이벤트 댓글을 확인하고 숨김·삭제·IP·기기 차단을 할 수 있습니다. IP·기기 차단 토글은 관리자
          「IP 관리」「기기 관리」 설정을 따릅니다.
          {comments.length > 0 ? (
            <span className="mt-1 block">
              총 {comments.length}개
              {search.trim() ? ` · 검색 결과 ${filteredComments.length}개` : ""}
            </span>
          ) : null}
        </>
      }
      headerActions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[20rem]">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이벤트, 탭, 작성자, 내용 검색"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <select
            value={filterEventId}
            onChange={(e) => setFilterEventId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="all">전체 이벤트</option>
            {sortedEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>
      }
      contentClassName="p-0"
    >
      {message ? (
        <p className="border-b border-gray-100 px-6 py-3 text-sm text-emerald-700">{message}</p>
      ) : null}

      {loading ? (
        <p className="px-6 py-8 text-sm text-gray-500">불러오는 중...</p>
      ) : comments.length === 0 ? (
        <p className="px-6 py-8 text-sm text-gray-500">등록된 이벤트 댓글이 없습니다.</p>
      ) : filteredComments.length === 0 ? (
        <p className="px-6 py-8 text-sm text-gray-500">검색 결과가 없습니다.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {filteredComments.map((comment) => (
            <div key={comment.id} className="px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      {comment.event_title}
                    </span>
                    <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {comment.tab_label}
                    </span>
                    <span className="font-semibold text-gray-900">{comment.author_name}</span>
                    {comment.is_hidden ? (
                      <span className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                        숨김
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatEventCommentDate(comment.created_at)}
                    {ipModerationEnabled && comment.user_ip ? (
                      <span className="ml-2 font-mono">IP {comment.user_ip}</span>
                    ) : null}
                    {deviceModerationEnabled &&
                    comment.voter_key &&
                    comment.voter_key.trim().length >= 8 ? (
                      <span className="ml-2 font-mono" title={comment.voter_key}>
                        기기 {formatVoterKeyLabel(comment.voter_key)}
                      </span>
                    ) : null}
                  </p>
                  {comment.is_hidden && comment.admin_action_reason?.trim() ? (
                    <p className="mt-1 text-xs text-amber-700">
                      사유: {comment.admin_action_reason.trim()}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {deviceModerationEnabled &&
                  comment.voter_key &&
                  comment.voter_key.trim().length >= 8 ? (
                    <button
                      type="button"
                      onClick={() => void banCommentDevice(comment)}
                      className="rounded-lg border border-violet-200 px-3 py-1.5 text-sm text-violet-700 hover:bg-violet-50"
                    >
                      기기 차단
                    </button>
                  ) : null}
                  {ipModerationEnabled && comment.user_ip ? (
                    <button
                      type="button"
                      onClick={() => void banCommentIp(comment)}
                      className="rounded-lg border border-orange-200 px-3 py-1.5 text-sm text-orange-700 hover:bg-orange-50"
                    >
                      IP 차단
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void toggleHidden(comment)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {comment.is_hidden ? "표시" : "숨김"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteComment(comment)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-white p-3 ring-1 ring-gray-100">
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminCollapsibleSection>
  );
}
