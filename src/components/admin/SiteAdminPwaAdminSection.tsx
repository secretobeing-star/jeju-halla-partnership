"use client";

import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import {
  ADMIN_PWA_APP_VERSION,
  ADMIN_PWA_MIN_VIEWPORT_WIDTH,
  DEFAULT_ADMIN_PWA_INSTALL_BUTTON_LABEL,
} from "@/lib/site-admin-pwa";
import { SiteSettings } from "@/lib/supabase";

type SiteAdminPwaAdminSectionProps = {
  settings: SiteSettings;
  iconUploading: boolean;
  onChange: (patch: Partial<SiteSettings>) => void;
  onUploadIcon: (file: File) => void;
  onClearIcon: () => void;
};

export default function SiteAdminPwaAdminSection({
  settings,
  iconUploading,
  onChange,
  onUploadIcon,
  onClearIcon,
}: SiteAdminPwaAdminSectionProps) {
  const enabled = settings.site_admin_pwa_enabled ?? false;
  const iconUrl = settings.site_admin_pwa_icon_url?.trim() || null;

  return (
    <AdminCollapsibleSection
      title="관리자 PWA (탭 전용)"
      description={`갤럭시탭·폴드 펼침 등 가로 ${ADMIN_PWA_MIN_VIEWPORT_WIDTH}px 이상에서 홈 화면에 추가하는 관리자 전용 앱입니다. 시작 화면은 /admin 입니다.`}
    >
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onChange({ site_admin_pwa_enabled: event.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        관리자 PWA 기능 사용
      </label>

      {enabled ? (
        <div className="mt-4 space-y-4">
          <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            버전 {ADMIN_PWA_APP_VERSION} · 테마 색상은 메인 PWA 설정을 따릅니다. 스마트폰
            브라우저의 /admin 은 계속 사용할 수 있고, 설치된 관리자 앱만 좁은 화면에서 안내가
            표시됩니다.
          </p>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.site_admin_pwa_install_prompt_enabled ?? true}
              onChange={(event) =>
                onChange({ site_admin_pwa_install_prompt_enabled: event.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            /admin 에서 설치 안내 표시
          </label>

          <label className="block text-sm font-medium text-gray-700">
            앱 이름 (전체)
            <input
              value={settings.site_admin_pwa_name ?? ""}
              onChange={(event) =>
                onChange({
                  site_admin_pwa_name: event.target.value.trim() ? event.target.value : null,
                })
              }
              placeholder="예: 한라 Pass 관리자"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <p className="text-xs text-gray-500">
            비우면 관리자 사이트 제목 또는 「메인 타이틀 + 관리자」를 사용합니다.
          </p>

          <label className="block text-sm font-medium text-gray-700">
            앱 이름 (짧게)
            <input
              value={settings.site_admin_pwa_short_name ?? ""}
              onChange={(event) =>
                onChange({
                  site_admin_pwa_short_name: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              maxLength={12}
              placeholder="예: 관리자"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <p className="text-xs text-gray-500">홈 화면 아이콘 아래. 최대 12자.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              앱 아이콘
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={iconUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onUploadIcon(file);
                  }
                  event.target.value = "";
                }}
                className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
              />
            </label>
            {iconUploading ? <p className="mt-2 text-sm text-gray-500">업로드 중...</p> : null}
            <p className="mt-1 text-xs text-gray-500">
              비우면 메인 PWA 아이콘 → 파비콘 순으로 사용합니다. 업로드 시 512×512 PNG로 자동
              맞춤됩니다.
            </p>
            {iconUrl ? (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                <img
                  src={iconUrl}
                  alt="관리자 PWA 아이콘 미리보기"
                  className="h-16 w-16 rounded-2xl border border-gray-200 bg-white object-contain"
                />
                <button
                  type="button"
                  onClick={onClearIcon}
                  className="text-sm text-red-600 hover:underline"
                >
                  앱 아이콘 삭제
                </button>
              </div>
            ) : null}
          </div>

          <label className="block text-sm font-medium text-gray-700">
            설치 안내 문구
            <textarea
              value={settings.site_admin_pwa_install_guide_message ?? ""}
              onChange={(event) =>
                onChange({
                  site_admin_pwa_install_guide_message: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            설치 버튼 문구
            <input
              value={settings.site_admin_pwa_install_button_label ?? ""}
              onChange={(event) =>
                onChange({
                  site_admin_pwa_install_button_label: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              placeholder={DEFAULT_ADMIN_PWA_INSTALL_BUTTON_LABEL}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">
          기능을 켠 뒤 앱 이름·아이콘을 설정하고, 태블릿 Chrome에서 /admin 을 열어 홈 화면에
          추가하세요.
        </p>
      )}
    </AdminCollapsibleSection>
  );
}
