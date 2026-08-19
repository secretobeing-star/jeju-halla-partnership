"use client";

import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import {
  DEFAULT_SITE_LOGIN_BUTTON_LABEL,
  DEFAULT_SITE_LOGIN_MODAL_TITLE,
  DEFAULT_SITE_LOGIN_PROVIDER_LABEL,
} from "@/lib/site-member-settings";
import { SiteSettings } from "@/lib/supabase";

type SiteLoginAdminPanelProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  loginLogoUploading?: boolean;
  onLoginLogoUpload?: (file: File) => void | Promise<void>;
  onClearLoginLogo?: () => void | Promise<void>;
};

export default function SiteLoginAdminPanel({
  settings,
  setSettings,
  loginLogoUploading = false,
  onLoginLogoUpload,
  onClearLoginLogo,
}: SiteLoginAdminPanelProps) {
  return (
    <AdminCollapsibleSection
      title="로그인"
      description="상단 우측 로그인 버튼·로그인 창 문구·로고를 설정합니다."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settings.site_login_enabled ?? false}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, site_login_enabled: e.target.checked }))
            }
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          로그인 버튼 표시
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settings.site_login_preview_enabled ?? false}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, site_login_preview_enabled: e.target.checked }))
            }
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          로그인 미리보기(테스트)
        </label>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          로그인 창 로고
          <span className="ml-1 text-xs font-normal text-gray-500">
            (로그인 창 제목·연동 로그인 버튼에 표시)
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={loginLogoUploading || !onLoginLogoUpload}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onLoginLogoUpload) {
                void onLoginLogoUpload(file);
              }
              e.target.value = "";
            }}
            className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
          />
        </label>
        {loginLogoUploading ? (
          <p className="text-sm text-gray-500 sm:col-span-2">로고 업로드 중...</p>
        ) : null}
        {settings.site_login_logo_url ? (
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:col-span-2">
            <img
              src={settings.site_login_logo_url}
              alt="로그인 로고 미리보기"
              className="h-12 w-12 rounded-lg object-contain"
            />
            {onClearLoginLogo ? (
              <button
                type="button"
                onClick={() => void onClearLoginLogo()}
                className="text-sm text-red-600 hover:underline"
              >
                로고 삭제
              </button>
            ) : null}
          </div>
        ) : null}

        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          로그인 창 제목
          <input
            value={settings.site_login_modal_title ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_login_modal_title: e.target.value.trim() ? e.target.value : null,
              }))
            }
            placeholder={DEFAULT_SITE_LOGIN_MODAL_TITLE}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          로그인 버튼 문구
          <input
            value={settings.site_login_button_label ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_login_button_label: e.target.value.trim() ? e.target.value : null,
              }))
            }
            placeholder={DEFAULT_SITE_LOGIN_BUTTON_LABEL}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          연동 로그인 버튼 문구
          <span className="ml-1 text-xs font-normal text-gray-500">
            (파란 연동 로그인 버튼에 그대로 표시)
          </span>
          <input
            value={settings.site_login_provider_label ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_login_provider_label: e.target.value.trim() ? e.target.value : null,
              }))
            }
            placeholder={DEFAULT_SITE_LOGIN_PROVIDER_LABEL}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          안내 문구 1
          <span className="ml-1 text-xs font-normal text-gray-500">(회색 안내 · 목록 1번째)</span>
          <textarea
            rows={2}
            value={settings.site_login_notice_line1 ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_login_notice_line1: e.target.value.trim() ? e.target.value : null,
              }))
            }
            placeholder=""
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          안내 문구 2
          <span className="ml-1 text-xs font-normal text-gray-500">(회색 안내 · 목록 2번째)</span>
          <textarea
            rows={2}
            value={settings.site_login_notice_line2 ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_login_notice_line2: e.target.value.trim() ? e.target.value : null,
              }))
            }
            placeholder=""
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          로그인 실패·오류 안내
          <span className="ml-1 text-xs font-normal text-gray-500">
            (로그인 실패 시 노란색으로 표시)
          </span>
          <textarea
            rows={2}
            value={settings.site_login_status_notice ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_login_status_notice: e.target.value.trim() ? e.target.value : null,
              }))
            }
            placeholder=""
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
      </div>
    </AdminCollapsibleSection>
  );
}
