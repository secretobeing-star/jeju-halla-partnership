"use client";

import { FormEvent, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { getStorageErrorMessage, uploadPartnershipMedia } from "@/lib/storage";
import {
  getAdMediaTypeLabel,
  getAdUploadAccept,
  getAdUploadLabel,
  isVideoOrGifFile,
  validateAdMediaUpload,
} from "@/lib/ad-media";
import { getUploadSizeLimitMessage } from "@/lib/upload-file-meta";
import AdMediaContent from "@/components/AdMediaContent";
import { SiteSettings } from "@/lib/supabase";

type AdsAdminPanelProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  saveSettings: (next: SiteSettings) => Promise<{ error: { message: string } | null }>;
  onMessage: (message: string) => void;
};

export default function AdsAdminPanel({
  settings,
  setSettings,
  saveSettings,
  onMessage,
}: AdsAdminPanelProps) {
  const [mobileHeroUploading, setMobileHeroUploading] = useState(false);
  const [mobileCategoryUploading, setMobileCategoryUploading] = useState(false);
  const [sidebarLeftUploading, setSidebarLeftUploading] = useState(false);
  const [sidebarRightUploading, setSidebarRightUploading] = useState(false);
  const [bottomPcUploading, setBottomPcUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const allowVideoGif = settings.ad_video_gif_enabled ?? false;
  const uploadAccept = getAdUploadAccept(allowVideoGif);
  const uploadLabel = getAdUploadLabel(allowVideoGif);

  function validateUpload(file: File) {
    const error = validateAdMediaUpload(file, allowVideoGif);
    if (error) {
      onMessage(error);
      return false;
    }

    const maxMb = isVideoOrGifFile(file) ? 50 : null;
    const sizeError = getUploadSizeLimitMessage(file, maxMb);
    if (sizeError) {
      onMessage(sizeError);
      return false;
    }

    return true;
  }

  async function handleMobileAdUpload(slot: "hero" | "category", file: File) {
    if (!validateUpload(file)) {
      return;
    }

    const setUploading =
      slot === "hero" ? setMobileHeroUploading : setMobileCategoryUploading;
    setUploading(true);
    onMessage("");

    try {
      const folder = slot === "hero" ? "ads-mobile-hero" : "ads-mobile-category";
      const url = await uploadPartnershipMedia(file, folder);
      const imageKey =
        slot === "hero"
          ? "mobile_ad_below_hero_image_url"
          : "mobile_ad_below_category_image_url";
      const nextSettings = { ...settings, [imageKey]: url };
      setSettings(nextSettings);
      const { error } = await saveSettings(nextSettings);
      onMessage(
        error
          ? `저장 실패: ${error.message}`
          : `${slot === "hero" ? "대문 하단" : "분류 하단"} 모바일 광고(${getAdMediaTypeLabel(url)})가 저장되었습니다.`,
      );
    } catch (error) {
      onMessage(`업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleClearMobileAd(slot: "hero" | "category") {
    const imageKey =
      slot === "hero"
        ? "mobile_ad_below_hero_image_url"
        : "mobile_ad_below_category_image_url";
    const linkKey =
      slot === "hero"
        ? "mobile_ad_below_hero_link_url"
        : "mobile_ad_below_category_link_url";
    const nextSettings = { ...settings, [imageKey]: null, [linkKey]: null };
    setSettings(nextSettings);
    const { error } = await saveSettings(nextSettings);
    onMessage(error ? `삭제 실패: ${error.message}` : "모바일 광고가 삭제되었습니다.");
  }

  async function handleSidebarAdUpload(side: "left" | "right", file: File) {
    if (!validateUpload(file)) {
      return;
    }

    const setUploading = side === "left" ? setSidebarLeftUploading : setSidebarRightUploading;
    setUploading(true);
    onMessage("");

    try {
      const folder = side === "left" ? "ads-left" : "ads-right";
      const url = await uploadPartnershipMedia(file, folder);
      const imageKey = side === "left" ? "sidebar_left_image_url" : "sidebar_right_image_url";
      const nextSettings = { ...settings, [imageKey]: url };
      setSettings(nextSettings);
      const { error } = await saveSettings(nextSettings);
      onMessage(
        error
          ? `저장 실패: ${error.message}`
          : `${side === "left" ? "좌측" : "우측"} 광고(${getAdMediaTypeLabel(url)})가 저장되었습니다.`,
      );
    } catch (error) {
      onMessage(`업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleClearSidebarAd(side: "left" | "right") {
    const imageKey = side === "left" ? "sidebar_left_image_url" : "sidebar_right_image_url";
    const linkKey = side === "left" ? "sidebar_left_link_url" : "sidebar_right_link_url";
    const nextSettings = { ...settings, [imageKey]: null, [linkKey]: null };
    setSettings(nextSettings);
    const { error } = await saveSettings(nextSettings);
    onMessage(error ? `삭제 실패: ${error.message}` : "광고가 삭제되었습니다.");
  }

  async function handleBottomPcUpload(file: File) {
    if (!validateUpload(file)) {
      return;
    }

    setBottomPcUploading(true);
    onMessage("");
    try {
      const url = await uploadPartnershipMedia(file, "ads-bottom-pc");
      const nextSettings = { ...settings, bottom_pc_ad_image_url: url };
      setSettings(nextSettings);
      const { error } = await saveSettings(nextSettings);
      onMessage(
        error
          ? `저장 실패: ${error.message}`
          : `PC 하단 광고(${getAdMediaTypeLabel(url)})가 저장되었습니다.`,
      );
    } catch (error) {
      onMessage(`업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setBottomPcUploading(false);
    }
  }

  async function handleClearBottomPcAd() {
    const nextSettings = {
      ...settings,
      bottom_pc_ad_image_url: null,
      bottom_pc_ad_link_url: null,
    };
    setSettings(nextSettings);
    const { error } = await saveSettings(nextSettings);
    onMessage(error ? `삭제 실패: ${error.message}` : "PC 하단 광고가 삭제되었습니다.");
  }

  async function handleSaveLinks(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await saveSettings(settings);
    onMessage(error ? `저장 실패: ${error.message}` : "광고 링크가 저장되었습니다.");
    setSaving(false);
  }

  return (
    <form onSubmit={handleSaveLinks} className="space-y-6" data-admin-primary-form>
      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          allowVideoGif
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {allowVideoGif ? (
          <p>
            <strong>광고 동영상 / GIF</strong>가 활성화되어 있습니다. 모든 광고 영역에
            MP4·WebM·GIF 파일을 업로드할 수 있습니다.
          </p>
        ) : (
          <p>
            현재는 <strong>이미지</strong>만 업로드할 수 있습니다. 동영상·GIF는{" "}
            <strong>개발자 모드 (Beta)</strong>에서 「광고 동영상 / GIF」를 활성화·저장한 후
            이용해 주세요.
          </p>
        )}
      </div>

      <AdminCollapsibleSection
        title="모바일 광고 (가로 전체 · 960 × 300 px 권장)"
        description="모바일 화면에서만 표시됩니다. 화면 너비에 맞춰 3.2:1 비율로 표시되며, 선명하게 보이려면 960×300px(2배) 이상으로 업로드하세요."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {(["hero", "category"] as const).map((slot) => {
            const isHero = slot === "hero";
            const imageUrl = isHero
              ? settings.mobile_ad_below_hero_image_url
              : settings.mobile_ad_below_category_image_url;
            const linkUrl = isHero
              ? settings.mobile_ad_below_hero_link_url
              : settings.mobile_ad_below_category_link_url;
            const linkKey = isHero
              ? "mobile_ad_below_hero_link_url"
              : "mobile_ad_below_category_link_url";
            const uploading = isHero ? mobileHeroUploading : mobileCategoryUploading;

            return (
              <div key={slot} className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-800">
                  {isHero ? "대문 하단 (모바일)" : "분류 하단 (모바일)"}
                </p>
                <label className="mt-3 block text-sm text-gray-600">
                  {uploadLabel}
                  <input
                    type="file"
                    accept={uploadAccept}
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleMobileAdUpload(slot, file);
                      e.target.value = "";
                    }}
                    className="mt-1 block w-full touch-manipulation text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
                  />
                </label>
                <label className="mt-3 block text-sm text-gray-600">
                  클릭 시 이동 URL (선택)
                  <input
                    type="url"
                    value={linkUrl ?? ""}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, [linkKey]: e.target.value }))
                    }
                    placeholder="https://"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </label>
                {imageUrl && (
                  <>
                    <p className="mt-3 text-xs text-gray-500">
                      등록된 파일: {getAdMediaTypeLabel(imageUrl)}
                    </p>
                    <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
                      <AdMediaContent
                        mediaUrl={imageUrl}
                        label={isHero ? "모바일 대문 하단 광고" : "모바일 분류 하단 광고"}
                        className="mobile-ad-image w-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleClearMobileAd(slot)}
                      className="mt-3 text-sm text-red-600 hover:underline"
                    >
                      광고 삭제
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="PC 하단 광고 (970 × 90 px)"
        description="PC 화면에서 제휴 목록 아래에 표시됩니다. 권장 크기 970×90px입니다."
      >
        <label className="block text-sm text-gray-600">
          {uploadLabel}
          <input
            type="file"
            accept={uploadAccept}
            disabled={bottomPcUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleBottomPcUpload(file);
              e.target.value = "";
            }}
            className="mt-1 block w-full touch-manipulation text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
          />
        </label>
        <label className="mt-3 block text-sm text-gray-600">
          클릭 시 이동 URL (선택)
          <input
            type="url"
            value={settings.bottom_pc_ad_link_url ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, bottom_pc_ad_link_url: e.target.value }))
            }
            placeholder="https://"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </label>
        {settings.bottom_pc_ad_image_url && (
          <>
            <p className="mt-3 text-xs text-gray-500">
              등록된 파일: {getAdMediaTypeLabel(settings.bottom_pc_ad_image_url)}
            </p>
            <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
              <AdMediaContent
                mediaUrl={settings.bottom_pc_ad_image_url}
                label="PC 하단 광고"
                className="bottom-pc-ad-image mx-auto object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleClearBottomPcAd()}
              className="mt-3 text-sm text-red-600 hover:underline"
            >
              PC 하단 광고 삭제
            </button>
          </>
        )}
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="좌·우 사이드 광고 (PC) (400 × 1200 px)">
        <div className="grid gap-6 lg:grid-cols-2">
          {(["left", "right"] as const).map((side) => {
            const imageUrl =
              side === "left" ? settings.sidebar_left_image_url : settings.sidebar_right_image_url;
            const linkKey =
              side === "left" ? "sidebar_left_link_url" : "sidebar_right_link_url";
            const uploading = side === "left" ? sidebarLeftUploading : sidebarRightUploading;

            return (
              <div key={side} className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-800">
                  {side === "left" ? "좌측 광고" : "우측 광고"}
                </p>
                <label className="mt-3 block text-sm text-gray-600">
                  {uploadLabel}
                  <input
                    type="file"
                    accept={uploadAccept}
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleSidebarAdUpload(side, file);
                      e.target.value = "";
                    }}
                    className="mt-1 block w-full touch-manipulation text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
                  />
                </label>
                <label className="mt-3 block text-sm text-gray-600">
                  클릭 시 이동 URL (선택)
                  <input
                    type="url"
                    value={settings[linkKey] ?? ""}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, [linkKey]: e.target.value }))
                    }
                    placeholder="https://"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </label>
                {imageUrl && (
                  <>
                    <p className="mt-3 text-xs text-gray-500">
                      등록된 파일: {getAdMediaTypeLabel(imageUrl)}
                    </p>
                    <div className="mt-2 w-32 overflow-hidden rounded-lg border border-gray-200">
                      <AdMediaContent
                        mediaUrl={imageUrl}
                        label={`${side} 광고`}
                        className="aspect-[3/4] w-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleClearSidebarAd(side)}
                      className="mt-3 text-sm text-red-600 hover:underline"
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </AdminCollapsibleSection>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving ? "저장 중..." : "광고 링크 저장"}
      </button>
    </form>
  );
}
