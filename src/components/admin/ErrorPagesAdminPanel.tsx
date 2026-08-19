"use client";

import { useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import SiteErrorPage from "@/components/SiteErrorPage";
import {
  DEFAULT_ERROR_PAGE_BUTTON_LABEL,
  DEFAULT_ERROR_PAGE_COLORS,
  DEFAULT_ERROR_PAGE_NOT_FOUND,
  DEFAULT_ERROR_PAGE_SERVER_ERROR,
  getErrorPageDisplaySettings,
} from "@/lib/error-page-settings";
import { getStorageErrorMessage, uploadPartnershipImage } from "@/lib/storage";
import { SiteSettings } from "@/lib/supabase";

type ErrorPagesAdminPanelProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  onMessage: (message: string) => void;
};

export default function ErrorPagesAdminPanel({
  settings,
  setSettings,
  onMessage,
}: ErrorPagesAdminPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [previewVariant, setPreviewVariant] = useState<"404" | "500">("404");

  const previewSettings = getErrorPageDisplaySettings(settings, previewVariant);

  async function handleLogoUpload(file: File) {
    setUploading(true);
    onMessage("");

    try {
      const url = await uploadPartnershipImage(file, "error-pages");
      setSettings((prev) => ({ ...prev, error_page_logo_url: url }));
      onMessage("오류 페이지 로고가 업로드되었습니다. 저장 버튼을 눌러 반영해 주세요.");
    } catch (error) {
      onMessage(`로고 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminCollapsibleSection
      nested
      title="404 / 500 오류 페이지"
      description="존재하지 않는 주소(404)와 서버 오류(500) 화면의 로고, 색상, 문구를 설정합니다."
      headerActions={
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settings.error_pages_enabled ?? true}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, error_pages_enabled: e.target.checked }))
            }
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          사용
        </label>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            로고 (선택)
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleLogoUpload(file);
                    }
                    e.target.value = "";
                  }}
                />
                {uploading ? "업로드 중..." : "로고 업로드"}
              </label>
              {settings.error_page_logo_url ? (
                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, error_page_logo_url: null }))}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                >
                  로고 삭제
                </button>
              ) : null}
            </div>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-gray-700">
              배경 색상
              <input
                type="color"
                value={settings.error_page_bg_color ?? DEFAULT_ERROR_PAGE_COLORS.bgColor}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, error_page_bg_color: e.target.value }))
                }
                className="mt-1 block h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              글자 색상
              <input
                type="color"
                value={settings.error_page_text_color ?? DEFAULT_ERROR_PAGE_COLORS.textColor}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, error_page_text_color: e.target.value }))
                }
                className="mt-1 block h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              버튼 배경
              <input
                type="color"
                value={settings.error_page_button_bg_color ?? DEFAULT_ERROR_PAGE_COLORS.buttonBgColor}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, error_page_button_bg_color: e.target.value }))
                }
                className="mt-1 block h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              버튼 글자
              <input
                type="color"
                value={
                  settings.error_page_button_text_color ?? DEFAULT_ERROR_PAGE_COLORS.buttonTextColor
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    error_page_button_text_color: e.target.value,
                  }))
                }
                className="mt-1 block h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                error_page_bg_color: null,
                error_page_text_color: null,
                error_page_button_bg_color: null,
                error_page_button_text_color: null,
              }))
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            색상 기본값
          </button>

          <label className="block text-sm font-medium text-gray-700">
            메인으로 돌아가기 버튼 문구
            <input
              value={settings.error_page_button_label ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  error_page_button_label: e.target.value || null,
                }))
              }
              placeholder={DEFAULT_ERROR_PAGE_BUTTON_LABEL}
              maxLength={40}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-800">404 문구</p>
            <label className="mt-3 block text-sm font-medium text-gray-700">
              제목
              <input
                value={settings.error_page_not_found_title ?? ""}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    error_page_not_found_title: e.target.value || null,
                  }))
                }
                placeholder={DEFAULT_ERROR_PAGE_NOT_FOUND.title}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-gray-700">
              설명
              <textarea
                value={settings.error_page_not_found_message ?? ""}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    error_page_not_found_message: e.target.value || null,
                  }))
                }
                placeholder={DEFAULT_ERROR_PAGE_NOT_FOUND.message}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-800">500 문구</p>
            <label className="mt-3 block text-sm font-medium text-gray-700">
              제목
              <input
                value={settings.error_page_server_error_title ?? ""}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    error_page_server_error_title: e.target.value || null,
                  }))
                }
                placeholder={DEFAULT_ERROR_PAGE_SERVER_ERROR.title}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-gray-700">
              설명
              <textarea
                value={settings.error_page_server_error_message ?? ""}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    error_page_server_error_message: e.target.value || null,
                  }))
                }
                placeholder={DEFAULT_ERROR_PAGE_SERVER_ERROR.message}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
          </div>
        </div>

        <div>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setPreviewVariant("404")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                previewVariant === "404"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200"
              }`}
            >
              404 미리보기
            </button>
            <button
              type="button"
              onClick={() => setPreviewVariant("500")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                previewVariant === "500"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200"
              }`}
            >
              500 미리보기
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="scale-[0.85] origin-top">
              <SiteErrorPage variant={previewVariant} settings={previewSettings} compact />
            </div>
          </div>
        </div>
      </div>
    </AdminCollapsibleSection>
  );
}
