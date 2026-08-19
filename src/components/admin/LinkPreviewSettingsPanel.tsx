"use client";

import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import type { SiteSettings } from "@/lib/supabase";
import {
  resolveLinkPreviewDescription,
  resolveLinkPreviewImageUrl,
  resolveLinkPreviewTitle,
} from "@/lib/link-preview";

type LinkPreviewSettingsPanelProps = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
  onUploadImage: (file: File) => void;
  uploading: boolean;
  previewDomain?: string | null;
};

export default function LinkPreviewSettingsPanel({
  settings,
  onChange,
  onUploadImage,
  uploading,
  previewDomain,
}: LinkPreviewSettingsPanelProps) {
  const previewTitle = resolveLinkPreviewTitle(settings);
  const previewDescription = resolveLinkPreviewDescription(settings);
  const previewImageUrl = resolveLinkPreviewImageUrl(settings);
  const previewHost = previewDomain?.replace(/^https?:\/\//, "") || "chu.gg";

  return (
    <AdminCollapsibleSection
      nested
      contentClassName="p-4"
      title="링크 미리보기 (카카오톡·SNS 공유)"
      description="비워 두면 브라우저 탭 제목·메인 부제·배너 이미지를 자동으로 사용합니다."
    >
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-[#bacee0] p-3">
        <p className="mb-2 text-[11px] font-medium text-gray-700">미리보기 예시</p>
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          {previewImageUrl ? (
            <img
              src={previewImageUrl}
              alt=""
              className="aspect-[1.91/1] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[1.91/1] w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700 px-4 text-center text-sm font-semibold text-white">
              {previewTitle}
            </div>
          )}
          <div className="border-t border-gray-100 px-3 py-2.5">
            <p className="line-clamp-1 text-xs font-semibold text-gray-900">{previewTitle}</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-600">
              {previewDescription}
            </p>
            <p className="mt-1 text-[10px] text-gray-400">{previewHost}</p>
          </div>
        </div>
      </div>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        미리보기 제목
        <input
          value={settings.link_preview_title ?? ""}
          onChange={(e) =>
            onChange({
              link_preview_title: e.target.value.trim() ? e.target.value : null,
            })
          }
          placeholder="비우면 사이트/메인 타이틀 사용"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
        />
      </label>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        미리보기 설명
        <textarea
          value={settings.link_preview_description ?? ""}
          onChange={(e) =>
            onChange({
              link_preview_description: e.target.value.trim() ? e.target.value : null,
            })
          }
          placeholder="비우면 메인 부제 사용"
          rows={2}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
        />
      </label>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        미리보기 이미지 URL
        <input
          value={settings.link_preview_image_url ?? ""}
          onChange={(e) =>
            onChange({
              link_preview_image_url: e.target.value.trim() ? e.target.value : null,
            })
          }
          placeholder="비우면 메인 배너 사용"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100">
          {uploading ? "업로드 중..." : "이미지 업로드"}
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadImage(file);
              e.target.value = "";
            }}
          />
        </label>
        {settings.banner_image_url && (
          <button
            type="button"
            onClick={() =>
              onChange({
                link_preview_image_url: settings.banner_image_url,
              })
            }
            className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            메인 배너 사용
          </button>
        )}
        {settings.link_preview_image_url && (
          <button
            type="button"
            onClick={() => onChange({ link_preview_image_url: null })}
            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            이미지 지우기
          </button>
        )}
      </div>
    </AdminCollapsibleSection>
  );
}
