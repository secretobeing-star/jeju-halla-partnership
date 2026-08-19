"use client";

import { FormEvent, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { normalizeAdminPartnersPerPage, normalizeAdminPostsPerPage } from "@/lib/pagination-settings";
import { formatSiteSettingsSaveError } from "@/lib/site-settings-save-error";
import { SiteSettings } from "@/lib/supabase";

type DeveloperModePanelProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  saveSettings: (next: SiteSettings) => Promise<{ error: { message: string } | null }>;
  onMessage: (message: string) => void;
};

type DeveloperToggleKey =
  | "dark_mode_enabled"
  | "main_font_size_enabled"
  | "main_site_size_floating_enabled"
  | "main_board_position_enabled"
  | "page_background_enabled"
  | "site_nav_background_enabled"
  | "site_nav_floating_chips_enabled"
  | "mobile_pc_mode_enabled"
  | "google_ads_enabled"
  | "google_ads_malware_block_enabled"
  | "ad_video_gif_enabled"
  | "admin_user_password_visible"
  | "admin_partner_review_password_visible"
  | "board_secret_posts_enabled"
  | "board_secret_comments_enabled"
  | "board_ip_moderation_enabled"
  | "board_device_moderation_enabled"
  | "board_admin_secret_comments_main_visible_enabled"
  | "board_admin_secret_reply_parent_unlock_enabled"
  | "board_post_views_enabled"
  | "board_pinned_persist_pages_enabled"
  | "board_pinned_also_in_list_enabled"
  | "admin_partners_list_pagination_enabled"
  | "admin_posts_list_pagination_enabled"
  | "board_page_create_enabled"
  | "board_id_mode_enabled"
  | "board_mobile_media_upload_enabled";

type DeveloperToggleItem = {
  key: DeveloperToggleKey;
  title: string;
  description: string;
  placeholder?: boolean;
};

type DeveloperToggleGroup = {
  id: string;
  title: string;
  items: DeveloperToggleItem[];
};

const TOGGLE_GROUPS: DeveloperToggleGroup[] = [
  {
    id: "mobile",
    title: "모바일",
    items: [
      {
        key: "mobile_pc_mode_enabled",
        title: "모바일 PC 레이아웃",
        description:
          "활성화 시 모바일 설정(톱니바퀴)에 PC 1280px 레이아웃 선택이 나타납니다. 레이아웃이 깨져 보이면 비활성화하세요. 비활성화 시 이미 켜 둔 PC 모드도 자동 해제됩니다.",
        placeholder: true,
      },
      {
        key: "board_mobile_media_upload_enabled",
        title: "게시판 사진·동영상 첨부",
        description:
          "비활성화 시 PC·모바일 모두 게시판 글쓰기·수정 시 사진 추가·동영상 업로드 버튼이 숨겨집니다.",
        placeholder: true,
      },
    ],
  },
  {
    id: "settings",
    title: "설정",
    items: [
      {
        key: "dark_mode_enabled",
        title: "다크 모드",
        description:
          "활성화 시 메인 우측 상단 톱니바퀴(설정) 패널에 다크 모드 항목이 표시됩니다. 사용자가 직접 켜야 적용됩니다.",
        placeholder: true,
      },
      {
        key: "main_font_size_enabled",
        title: "사이트 크기 설정",
        description:
          "활성화 시 메인 설정 패널 실험실에서 사이트 크기(축소·기본·확대)를 선택할 수 있습니다. 제휴 목록과 게시글 목록·본문 등 화면 전체에 적용됩니다.",
        placeholder: true,
      },
      {
        key: "main_site_size_floating_enabled",
        title: "사이트 크기 +/- 버튼",
        description:
          "활성화 시 화면 우측 하단(맨 위로 버튼 위)에 사이트 크기 +/- 버튼이 표시됩니다. 사이트 크기 설정도 함께 활성화해야 적용됩니다.",
        placeholder: true,
      },
      {
        key: "main_board_position_enabled",
        title: "게시판 위치 설정",
        description:
          "활성화 시 메인 설정 패널에서 게시판을 제휴 목록 위 또는 아래 중 선택할 수 있습니다.",
        placeholder: true,
      },
      {
        key: "page_background_enabled",
        title: "페이지 배경",
        description:
          "활성화 시 메인 설정 패널(실험실)에서 사용자가 페이지 배경을 켜고 끌 수 있습니다. 배경 색·이미지는 설정 탭에서 지정합니다.",
        placeholder: true,
      },
      {
        key: "site_nav_background_enabled",
        title: "상단 메뉴 배경",
        description:
          "활성화 시 상단·메뉴 탭에서 메인 네비게이션 배경 이미지를 업로드하고 표시 여부를 설정할 수 있습니다. 배경 이미지가 있으면 사용자 설정 패널(실험실)에서 「상단 메뉴 배경 변경」을 켜고 끌 수 있습니다.",
        placeholder: true,
      },
      {
        key: "site_nav_floating_chips_enabled",
        title: "상단 메뉴 플로팅 칩",
        description:
          "상단 메뉴 배경이 없을 때 제목·메뉴·검색을 흰색 pill과 그림자로 구분합니다. 기본 켜짐이며, 끄면 배경 없을 때도 메뉴 pill이 적용되지 않습니다. 활성화 시 메인 설정 패널(실험실)에서 사용자가 「상단 메뉴 변경」을 켜고 끌 수 있습니다.",
        placeholder: true,
      },
    ],
  },
  {
    id: "ads",
    title: "광고",
    items: [
      {
        key: "google_ads_enabled",
        title: "구글 광고",
        description: "구글 애드센스 연동 설정입니다. 개발 중입니다.",
        placeholder: true,
      },
      {
        key: "google_ads_malware_block_enabled",
        title: "구글 광고 애드센스 악성광고 차단",
        description: "애드센스 악성광고 차단 설정입니다. 개발 중입니다.",
        placeholder: true,
      },
      {
        key: "ad_video_gif_enabled",
        title: "광고 동영상 / GIF",
        description:
          "활성화 시 광고 탭에서 이미지 외 동영상(MP4, WebM)·GIF 파일도 업로드할 수 있습니다.",
        placeholder: true,
      },
    ],
  },
  {
    id: "board",
    title: "게시판",
    items: [
      {
        key: "board_secret_posts_enabled",
        title: "비밀글 설정",
        description:
          "활성화 시 사용자가 게시글 작성 시 비밀글을 선택할 수 있습니다. 비밀글은 목록에서 제목만 보이고, 비밀번호 입력 후 내용을 확인할 수 있습니다.",
        placeholder: true,
      },
      {
        key: "board_secret_comments_enabled",
        title: "댓글/답글 비밀글",
        description:
          "활성화 시 사용자가 댓글·답글 작성 시 비밀글을 선택할 수 있습니다. 비밀 댓글은 비밀번호 입력 후 내용을 확인할 수 있습니다.",
        placeholder: true,
      },
      {
        key: "board_ip_moderation_enabled",
        title: "비회원 IP 관리",
        description:
          "활성화 시 비회원 게시글 작성 시 IP를 저장하고, 차단 IP·상태(경고/숨김) 규칙을 적용합니다. supabase/board-ip-moderation.sql 실행 후 사용하세요.",
        placeholder: true,
      },
      {
        key: "board_device_moderation_enabled",
        title: "비회원 기기 관리",
        description:
          "활성화 시 비회원 글·댓글·후기 작성 기기 키(voter key)를 저장하고, 관리자 화면·신고 목록에 표시합니다. supabase/device-voter-key-ban.sql, board-device-moderation-setting.sql 실행 후 사용하세요.",
        placeholder: true,
      },
      {
        key: "board_admin_secret_comments_main_visible_enabled",
        title: "관리자 비밀댓글 메인 표시",
        description:
          "활성화 시 관리자가 작성한 비밀댓글·답글 내용이 메인 화면에 비밀번호 없이 표시됩니다. 비활성화 시 내용이 숨겨집니다.",
        placeholder: true,
      },
      {
        key: "board_admin_secret_reply_parent_unlock_enabled",
        title: "비밀댓글 작성자 관리자 답글 열람",
        description:
          "활성화 시 사용자가 작성한 비밀댓글에 관리자가 단 비밀답글을, 원댓글 작성 시 설정한 비밀번호로 메인에서도 열람할 수 있습니다. 댓글/답글 비밀글 기능이 켜져 있으면 기본적으로 동작합니다.",
        placeholder: true,
      },
      {
        key: "board_post_views_enabled",
        title: "게시글 조회수",
        description:
          "활성화 시 게시글 상세 열람 시 조회수가 증가하고, 목록·상세 화면에 조회수가 표시됩니다.",
        placeholder: true,
      },
      {
        key: "board_pinned_persist_pages_enabled",
        title: "고정 게시글 페이지 유지",
        description:
          "활성화 시 고정 게시글이 목록 상단에 항상 표시되고, 페이지를 넘겨도 사라지지 않습니다.",
        placeholder: true,
      },
      {
        key: "board_pinned_also_in_list_enabled",
        title: "고정 게시글 목록 중복 표시",
        description:
          "활성화 시 고정 게시글이 상단 공지로 표시되면서, 일반 목록에도 번호가 있는 글로 함께 나타납니다.",
        placeholder: true,
      },
      {
        key: "board_page_create_enabled",
        title: "페이지 분류 생성",
        description: "활성화 시 게시판 관리 탭에서 새 게시판(페이지 분류)을 추가할 수 있습니다.",
        placeholder: true,
      },
      {
        key: "board_id_mode_enabled",
        title: "ID 모드",
        description:
          "활성화 시 게시글 분류·게시판 관리에서 게시판 ID를 확인하고 수정할 수 있습니다. ID 변경 시 해당 게시판 글의 분류도 함께 변경됩니다.",
        placeholder: true,
      },
    ],
  },
  {
    id: "admin",
    title: "관리자",
    items: [
      {
        key: "admin_user_password_visible",
        title: "사용자 비밀번호 관리자 표시",
        description:
          "활성화 후 일반 사용자가 작성하는 게시글·댓글·답글 비밀번호를 게시글 관리에서 확인할 수 있습니다.",
        placeholder: true,
      },
      {
        key: "admin_partner_review_password_visible",
        title: "제휴 후기 비밀번호 관리자 표시",
        description:
          "활성화 후 일반 사용자가 작성하는 제휴 후기 비밀번호를 제휴 후기 관리에서 확인할 수 있습니다.",
        placeholder: true,
      },
      {
        key: "admin_partners_list_pagination_enabled",
        title: "등록된 업체 목록 페이지 분류",
        description:
          "활성화 시 관리자 제휴업체 관리의 등록된 업체 목록을 페이지별로 나누어 표시합니다.",
        placeholder: true,
      },
      {
        key: "admin_posts_list_pagination_enabled",
        title: "게시글 관리 페이지 분류",
        description:
          "활성화 시 관리자 게시글 관리 탭의 등록된 게시글 목록을 페이지별로 나누어 표시합니다.",
        placeholder: true,
      },
    ],
  },
];

function ToggleRow({
  title,
  description,
  enabled,
  placeholder,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  placeholder?: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {placeholder && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Beta
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
          <input
            type="checkbox"
            role="switch"
            checked={enabled}
            aria-checked={enabled}
            aria-label={`${title} ${enabled ? "활성화" : "비활성화"}`}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span aria-hidden>{enabled ? "활성화" : "비활성화"}</span>
        </label>
      </div>
    </div>
  );
}

export default function DeveloperModePanel({
  settings,
  setSettings,
  saveSettings,
  onMessage,
}: DeveloperModePanelProps) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onMessage("");

    const { error } = await saveSettings({
      ...settings,
      admin_partners_per_page: normalizeAdminPartnersPerPage(settings.admin_partners_per_page),
      admin_posts_per_page: normalizeAdminPostsPerPage(settings.admin_posts_per_page),
    });
    if (error) {
      onMessage(formatSiteSettingsSaveError(error.message));
      setSaving(false);
      return;
    }

    onMessage("개발자 모드 설정이 저장되었습니다.");
    setSaving(false);
  }

  function toggle(key: DeveloperToggleKey, value: boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-admin-primary-form>
      <AdminCollapsibleSection
        title="개발자 모드 (Beta)"
        description="Beta 버전에서는 정상적으로 작동하지 않을 수도 있습니다. 저장 오류가 나면 Supabase에서 supabase/pending-developer-mode-columns.sql을 실행해 주세요."
      >
        <div className="space-y-3">
          {TOGGLE_GROUPS.map((group) => (
            <AdminCollapsibleSection
              key={group.id}
              nested
              title={group.title}
              contentClassName="space-y-3 bg-white p-3"
            >
              {group.items.map((item) => (
                <ToggleRow
                  key={item.key}
                  title={item.title}
                  description={item.description}
                  enabled={settings[item.key] ?? false}
                  placeholder={item.placeholder}
                  onChange={(value) => toggle(item.key, value)}
                />
              ))}

              {group.id === "admin" && settings.admin_partners_list_pagination_enabled && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-amber-900">
                      관리자 등록된 업체 목록 페이지당 개수
                    </h3>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Beta
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800">
                    제휴업체 관리 탭의 등록된 업체 목록에서 한 페이지에 표시할 업체 수입니다. 1~50
                    사이로 설정할 수 있습니다.
                  </p>
                  <label className="mt-3 block text-sm font-medium text-amber-900">
                    페이지당 업체 수
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={settings.admin_partners_per_page ?? 10}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          admin_partners_per_page: normalizeAdminPartnersPerPage(
                            Number(e.target.value),
                          ),
                        }))
                      }
                      className="mt-1 w-full max-w-xs rounded-lg border border-amber-200 bg-white px-3 py-2 outline-none focus:border-amber-400"
                    />
                  </label>
                </div>
              )}

              {group.id === "admin" && settings.admin_posts_list_pagination_enabled && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-amber-900">
                      관리자 게시글 목록 페이지당 개수
                    </h3>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Beta
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800">
                    게시글 관리 탭의 등록된 게시글 목록에서 한 페이지에 표시할 게시글 수입니다.
                    1~50 사이로 설정할 수 있습니다.
                  </p>
                  <label className="mt-3 block text-sm font-medium text-amber-900">
                    페이지당 게시글 수
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={settings.admin_posts_per_page ?? 10}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          admin_posts_per_page: normalizeAdminPostsPerPage(Number(e.target.value)),
                        }))
                      }
                      className="mt-1 w-full max-w-xs rounded-lg border border-amber-200 bg-white px-3 py-2 outline-none focus:border-amber-400"
                    />
                  </label>
                </div>
              )}
            </AdminCollapsibleSection>
          ))}
        </div>
      </AdminCollapsibleSection>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving ? "저장 중..." : "개발자 모드 설정 저장"}
      </button>
    </form>
  );
}
