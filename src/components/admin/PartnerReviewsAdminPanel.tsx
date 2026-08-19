"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { formatPartnerReviewDate } from "@/lib/partner-review";
import { requestIpBanReason } from "@/lib/board-ip-moderation";
import { formatVoterKeyLabel, requestDeviceBanReason } from "@/lib/board-device-moderation";
import { requestAdminSuspensionReason } from "@/lib/board-reports";
import { usePromptModal } from "@/components/PromptModalProvider";
import { formatSiteSettingsSaveError } from "@/lib/site-settings-save-error";
import { Partner, SiteSettings, supabase } from "@/lib/supabase";

type AdminPartnerReviewRow = {
  id: string;
  partner_id: string;
  partner_name: string;
  author_name: string;
  content: string;
  is_hidden: boolean;
  admin_visible_password?: string | null;
  user_ip?: string | null;
  voter_key?: string | null;
  created_at: string;
};

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

export default function PartnerReviewsAdminPanel() {
  const { prompt } = usePromptModal();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [reviews, setReviews] = useState<AdminPartnerReviewRow[]>([]);
  const [filterPartnerId, setFilterPartnerId] = useState<string>("all");
  const [reviewSearch, setReviewSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [hiddenReviewTitle, setHiddenReviewTitle] = useState("");
  const [hiddenReviewMessage, setHiddenReviewMessage] = useState("");
  const [adminPasswordVisible, setAdminPasswordVisible] = useState(false);
  const [ipModerationEnabled, setIpModerationEnabled] = useState(false);
  const [deviceModerationEnabled, setDeviceModerationEnabled] = useState(false);

  const sortedPartners = useMemo(
    () => [...partners].sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [partners],
  );

  const loadPartners = useCallback(async () => {
    const { data, error } = await supabase
      .from("partners")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      setMessage(`업체 목록을 불러오지 못했습니다: ${error.message}`);
      return;
    }

    setPartners((data as Partner[]) ?? []);
  }, []);

  const loadSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select(
        "partner_hidden_review_title, partner_hidden_review_message, admin_partner_review_password_visible, board_ip_moderation_enabled, board_device_moderation_enabled",
      )
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      setMessage(formatSiteSettingsSaveError(error.message));
      return;
    }

    setHiddenReviewTitle(data?.partner_hidden_review_title ?? "");
    setHiddenReviewMessage(data?.partner_hidden_review_message ?? "");
    setAdminPasswordVisible(data?.admin_partner_review_password_visible ?? false);
    setIpModerationEnabled(data?.board_ip_moderation_enabled ?? false);
    setDeviceModerationEnabled(data?.board_device_moderation_enabled ?? false);
  }, []);

  const loadReviews = useCallback(async (partnerId: string) => {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.rpc("admin_list_partner_reviews", {
      p_partner_id: partnerId === "all" ? null : partnerId,
    });

    setLoading(false);

    if (error) {
      if (
        error.message.toLowerCase().includes("could not find the function") ||
        error.message.toLowerCase().includes("pgrst202")
      ) {
        setMessage(
          "후기 관리 SQL이 Supabase에 아직 없습니다. partner-reviews-admin.sql을 실행해 주세요.",
        );
        return;
      }
      setMessage(`후기 목록을 불러오지 못했습니다: ${error.message}`);
      return;
    }

    setReviews((data as AdminPartnerReviewRow[]) ?? []);
  }, []);

  useEffect(() => {
    void loadPartners();
    void loadSettings();
  }, [loadPartners, loadSettings]);

  useEffect(() => {
    void loadReviews(filterPartnerId);
  }, [filterPartnerId, loadReviews]);

  const filteredReviews = useMemo(() => {
    const query = reviewSearch.trim().toLowerCase();
    if (!query) {
      return reviews;
    }

    return reviews.filter((review) =>
      [review.partner_name, review.author_name, review.content].some((field) =>
        field.toLowerCase().includes(query),
      ),
    );
  }, [reviews, reviewSearch]);

  async function saveHiddenReviewSettings(e: FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    setMessage("");

    const payload: Pick<
      SiteSettings,
      "partner_hidden_review_title" | "partner_hidden_review_message"
    > = {
      partner_hidden_review_title: hiddenReviewTitle.trim() || null,
      partner_hidden_review_message: hiddenReviewMessage.trim() || null,
    };

    const { error } = await supabase.from("site_settings").update(payload).eq("id", 1);

    setSettingsSaving(false);

    if (error) {
      setMessage(formatSiteSettingsSaveError(error.message));
      return;
    }

    setMessage("숨김 후기 안내 문구를 저장했습니다.");
  }

  async function toggleHidden(review: AdminPartnerReviewRow) {
    setMessage("");

    if (!review.is_hidden) {
      const actionReason = await requestAdminSuspensionReason(prompt, "정지");
      if (actionReason === null) {
        return;
      }

      const { error } = await supabase.rpc("admin_set_partner_review_hidden", {
        p_review_id: review.id,
        p_hidden: true,
        p_admin_action_reason: actionReason || null,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("could not find the function") ||
          error.message.toLowerCase().includes("pgrst202")
        ) {
          setMessage(
            "후기 관리 SQL이 Supabase에 아직 없습니다. content-admin-action-reason.sql을 실행해 주세요.",
          );
          return;
        }
        setMessage(`상태 변경 실패: ${error.message}`);
        return;
      }

      setMessage("후기를 숨겼습니다.");
      void loadReviews(filterPartnerId);
      return;
    }

    const { error } = await supabase.rpc("admin_set_partner_review_hidden", {
      p_review_id: review.id,
      p_hidden: false,
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("could not find the function") ||
        error.message.toLowerCase().includes("pgrst202")
      ) {
        setMessage(
          "후기 관리 SQL이 Supabase에 아직 없습니다. partner-reviews-admin.sql을 실행해 주세요.",
        );
        return;
      }
      setMessage(`상태 변경 실패: ${error.message}`);
      return;
    }

    setMessage(review.is_hidden ? "후기를 다시 표시했습니다." : "후기를 숨겼습니다.");
    void loadReviews(filterPartnerId);
  }

  async function deleteReview(review: AdminPartnerReviewRow) {
    if (!window.confirm("이 후기를 완전히 삭제할까요?")) {
      return;
    }

    setMessage("");

    const { error } = await supabase.rpc("admin_delete_partner_review", {
      p_review_id: review.id,
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("could not find the function") ||
        error.message.toLowerCase().includes("pgrst202")
      ) {
        setMessage(
          "후기 관리 SQL이 Supabase에 아직 없습니다. partner-reviews-admin.sql을 실행해 주세요.",
        );
        return;
      }
      setMessage(`삭제 실패: ${error.message}`);
      return;
    }

    setMessage("후기를 삭제했습니다.");
    void loadReviews(filterPartnerId);
  }

  async function banReviewIp(review: AdminPartnerReviewRow) {
    const ip = review.user_ip?.trim();
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
      reason:
        actionReason.trim() ||
        `제휴 후기 "${review.partner_name}" / ${review.author_name}에서 차단`,
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

  async function banReviewDevice(review: AdminPartnerReviewRow) {
    const voterKey = review.voter_key?.trim();
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
      reason:
        actionReason.trim() ||
        `제휴 후기 "${review.partner_name}" / ${review.author_name}에서 차단`,
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
      <AdminCollapsibleSection
        title={
          <>
            숨김 후기 안내 문구
            <span className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Beta
            </span>
          </>
        }
        description="관리자가 숨김 처리한 제휴 후기를 메인에서 보여줄 때 사용할 제목과 내용입니다. 비우면 기본 문구가 표시됩니다."
      >
        <form onSubmit={saveHiddenReviewSettings} className="grid gap-4">
          <label className="block text-sm font-medium text-gray-700">
            숨김 제목
            <input
              value={hiddenReviewTitle}
              onChange={(e) => setHiddenReviewTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            숨김 내용
            <textarea
              value={hiddenReviewMessage}
              onChange={(e) => setHiddenReviewMessage(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <button
            type="submit"
            disabled={settingsSaving}
            className="w-fit rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {settingsSaving ? "저장 중..." : "안내 문구 저장"}
          </button>
        </form>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title={
          <>
            제휴 후기 관리
            <span className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Beta
            </span>
          </>
        }
        description={
          <>
            후기를 확인하고 숨김·삭제할 수 있습니다. 숨김 처리된 후기는 메인에서 안내 문구로
            표시됩니다.
            {reviews.length > 0 && (
              <span className="mt-1 block">
                총 {reviews.length}개
                {reviewSearch.trim() ? ` · 검색 결과 ${filteredReviews.length}개` : ""}
              </span>
            )}
          </>
        }
        headerActions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[20rem]">
            <input
              type="search"
              value={reviewSearch}
              onChange={(e) => setReviewSearch(e.target.value)}
              placeholder="업체명, 작성자, 후기 내용 검색"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <select
              value={filterPartnerId}
              onChange={(e) => setFilterPartnerId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              <option value="all">전체 업체</option>
              {sortedPartners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </div>
        }
        contentClassName="p-0"
      >
        {message && <p className="border-b border-gray-100 px-6 py-3 text-sm text-emerald-700">{message}</p>}

        {loading ? (
          <p className="px-6 py-8 text-sm text-gray-500">불러오는 중...</p>
        ) : reviews.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500">등록된 후기가 없습니다.</p>
        ) : filteredReviews.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500">검색 결과가 없습니다.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredReviews.map((review) => (
              <div key={review.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        {review.partner_name}
                      </span>
                      <span className="font-semibold text-gray-900">{review.author_name}</span>
                      {review.is_hidden && (
                        <span className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                          숨김
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatPartnerReviewDate(review.created_at)}
                      {ipModerationEnabled && review.user_ip ? (
                        <span className="ml-2 font-mono">IP {review.user_ip}</span>
                      ) : null}
                      {deviceModerationEnabled && review.voter_key && review.voter_key.trim().length >= 8 ? (
                        <span className="ml-2 font-mono" title={review.voter_key}>
                          기기 {formatVoterKeyLabel(review.voter_key)}
                        </span>
                      ) : null}
                    </p>
                    <AdminPasswordBadge
                      password={review.admin_visible_password}
                      visible={adminPasswordVisible}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {deviceModerationEnabled && review.voter_key && review.voter_key.trim().length >= 8 ? (
                      <button
                        type="button"
                        onClick={() => void banReviewDevice(review)}
                        className="rounded-lg border border-violet-200 px-3 py-1.5 text-sm text-violet-700 hover:bg-violet-50"
                      >
                        기기 차단
                      </button>
                    ) : null}
                    {ipModerationEnabled && review.user_ip ? (
                      <button
                        type="button"
                        onClick={() => void banReviewIp(review)}
                        className="rounded-lg border border-orange-200 px-3 py-1.5 text-sm text-orange-700 hover:bg-orange-50"
                      >
                        IP 차단
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void toggleHidden(review)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {review.is_hidden ? "표시" : "숨김"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteReview(review)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-white p-3">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                    {review.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCollapsibleSection>
    </div>
  );
}
