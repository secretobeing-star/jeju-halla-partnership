"use client";

import { useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { DEFAULT_PAGE_BACKGROUND_COLOR } from "@/lib/page-background";
import { getStorageErrorMessage, uploadPartnershipImage } from "@/lib/storage";
import { SiteSettings } from "@/lib/supabase";

type PageBackgroundAdminSectionProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  onMessage: (message: string) => void;
};

export default function PageBackgroundAdminSection({
  settings,
  setSettings,
  onMessage,
}: PageBackgroundAdminSectionProps) {
  const [uploading, setUploading] = useState(false);
  const featureEnabled = settings.page_background_enabled ?? false;

  async function handleImageUpload(file: File) {
    setUploading(true);
    onMessage("");

    try {
      const url = await uploadPartnershipImage(file, "backgrounds");
      setSettings((prev) => ({ ...prev, page_background_image_url: url }));
      onMessage("페이지 배경 이미지가 업로드되었습니다. 저장 버튼을 눌러 반영해 주세요.");
    } catch (error) {
      onMessage(`페이지 배경 이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminCollapsibleSection
      title={
        <>
          페이지 배경
          <span className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Beta
          </span>
        </>
      }
      description={
        <>
          개발자 모드 → 설정에서 &quot;페이지 배경&quot;을 활성화하면, 메인 설정 패널(실험실)에서
          사용자가 배경을 켜고 끌 수 있습니다.
        </>
      }
    >
      {!featureEnabled ? (
        <p className="mt-4 rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          현재 비활성화 상태입니다. 개발자 모드에서 페이지 배경 기능을 켠 뒤 저장해 주세요.
        </p>
      ) : (
        <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">첫 방문 시 배경 표시</p>
            <p className="mt-1 text-xs text-gray-500">
              켜두면 설정을 열지 않은 사용자도 처음부터 페이지 배경을 볼 수 있습니다.
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.page_background_default_enabled ?? true}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  page_background_default_enabled: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            {settings.page_background_default_enabled ?? true ? "켜짐" : "꺼짐"}
          </span>
        </label>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="block text-sm font-medium text-gray-700">
          배경 색상
          <input
            type="color"
            value={settings.page_background_color ?? DEFAULT_PAGE_BACKGROUND_COLOR}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                page_background_color: e.target.value,
              }))
            }
            className="mt-1 block h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
          />
        </label>
        <button
          type="button"
          onClick={() =>
            setSettings((prev) => ({ ...prev, page_background_color: null }))
          }
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          기본 색상
        </button>
      </div>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        배경 이미지 URL (선택)
        <input
          type="url"
          value={settings.page_background_image_url ?? ""}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              page_background_image_url: e.target.value || null,
            }))
          }
          placeholder="https://"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleImageUpload(file);
              }
              e.target.value = "";
            }}
          />
          {uploading ? "업로드 중..." : "이미지 업로드"}
        </label>
        {settings.page_background_image_url ? (
          <button
            type="button"
            onClick={() =>
              setSettings((prev) => ({ ...prev, page_background_image_url: null }))
            }
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            이미지 삭제
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        권장 해상도: <strong>2560 × 1440px</strong> (16:9) · 최소 <strong>1920 × 1080px</strong>
        <br />
        JPG·WEBP·PNG · 화면 한 장(viewport) 기준 cover · 중요한 요소는 가운데에 배치 (가장자리는 잘릴
        수 있음)
        <br />
        밝고 단순한 패턴·그라데이션이 본문 가독성에 좋으며, 500KB~1MB 이하 권장입니다.
      </p>

      {settings.page_background_image_url ? (
        <div
          className="mt-4 overflow-hidden rounded-xl border border-gray-200"
          style={{
            backgroundColor: settings.page_background_color ?? DEFAULT_PAGE_BACKGROUND_COLOR,
            backgroundImage: `url("${settings.page_background_image_url}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="flex h-32 items-end bg-gradient-to-t from-black/35 to-transparent p-3">
            <p className="text-xs font-medium text-white">배경 미리보기</p>
          </div>
        </div>
      ) : (
        <div
          className="mt-4 flex h-16 items-center justify-center rounded-xl border border-gray-200 text-sm text-gray-500"
          style={{
            backgroundColor: settings.page_background_color ?? DEFAULT_PAGE_BACKGROUND_COLOR,
          }}
        >
          배경 색상 미리보기
        </div>
      )}
    </AdminCollapsibleSection>
  );
}
