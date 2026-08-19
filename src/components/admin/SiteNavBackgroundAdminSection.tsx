"use client";

import { useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { getStorageErrorMessage, uploadPartnershipImage } from "@/lib/storage";
import {
  DEFAULT_SITE_NAV_BACKGROUND_DARK_OVERLAY_OPACITY,
  buildSiteNavBackgroundDarkOverlayStyle,
  normalizeSiteNavBackgroundDarkOverlayOpacity,
} from "@/lib/site-nav-background";
import { SiteSettings } from "@/lib/supabase";

type SiteNavBackgroundAdminSectionProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  onMessage: (message: string) => void;
};

export default function SiteNavBackgroundAdminSection({
  settings,
  setSettings,
  onMessage,
}: SiteNavBackgroundAdminSectionProps) {
  const [uploading, setUploading] = useState(false);
  const featureEnabled = settings.site_nav_background_enabled ?? false;
  const displayEnabled = settings.site_nav_background_display_enabled ?? false;
  const darkBackgroundEnabled = settings.site_nav_background_dark_enabled ?? false;
  const darkOverlayOpacity = normalizeSiteNavBackgroundDarkOverlayOpacity(
    settings.site_nav_background_dark_overlay_opacity,
  );
  const imageUrl = settings.site_nav_background_image_url?.trim() || null;

  async function handleImageUpload(file: File) {
    setUploading(true);
    onMessage("");

    try {
      const url = await uploadPartnershipImage(file, "nav-backgrounds");
      setSettings((prev) => ({
        ...prev,
        site_nav_background_image_url: url,
        site_nav_background_display_enabled: true,
      }));
      onMessage("상단 배경 이미지가 업로드되었습니다. 저장 버튼을 눌러 반영해 주세요.");
    } catch (error) {
      onMessage(`상단 배경 이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminCollapsibleSection
      nested
      title={
        <>
          상단 메뉴 배경
          <span className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Beta
          </span>
        </>
      }
      description={
        <>
          개발자 모드 → 설정에서 &quot;상단 메뉴 배경&quot;을 활성화하면, 메인 설정 패널(실험실)에서
          사용자가 「상단 메뉴 배경 변경」을 켜고 끌 수 있습니다. 배경 톤(밝음/어두움)은 이 탭에서
          관리자만 지정합니다.
        </>
      }
    >
      {!featureEnabled ? (
        <p className="mt-4 rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          현재 비활성화 상태입니다. 개발자 모드에서 상단 메뉴 배경 기능을 켠 뒤 저장해 주세요.
        </p>
      ) : (
        <>
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">첫 방문 시 배경 표시</p>
              <p className="mt-1 text-xs text-gray-500">
                켜두면 설정을 열지 않은 사용자도 처음부터 상단 메뉴 배경을 볼 수 있습니다.
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={displayEnabled}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    site_nav_background_display_enabled: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              {displayEnabled ? "켜짐" : "꺼짐"}
            </span>
          </label>

          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">사용자 설정에서 배경 변경 허용</p>
              <p className="mt-1 text-xs text-gray-500">
                켜두면 메인 설정 패널(실험실)에 「상단 메뉴 배경 변경」 토글이 표시됩니다.
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={settings.site_nav_background_user_toggle_enabled ?? true}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    site_nav_background_user_toggle_enabled: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              {settings.site_nav_background_user_toggle_enabled ?? true ? "허용" : "비허용"}
            </span>
          </label>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">배경 톤</p>
            <p className="mt-1 text-xs text-gray-500">
              사이트 다크 모드와 별도로, 상단 메뉴 배경 위 오버레이와 메뉴 칩 색을 밝게 또는
              어둡게 표시합니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-700">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="site_nav_background_theme"
                  checked={!darkBackgroundEnabled}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      site_nav_background_dark_enabled: false,
                    }))
                  }
                  className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                밝은 배경
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="site_nav_background_theme"
                  checked={darkBackgroundEnabled}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      site_nav_background_dark_enabled: true,
                    }))
                  }
                  className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                어두운 배경
              </label>
            </div>

            {darkBackgroundEnabled ? (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">어두운 배경 투명도</p>
                    <p className="mt-1 text-xs text-gray-500">
                      검은색 오버레이 농도입니다. 숫자가 낮을수록 뒤 배경 이미지가 더 잘 보입니다.
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-gray-900">{darkOverlayOpacity}%</p>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={darkOverlayOpacity}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      site_nav_background_dark_overlay_opacity: Number(event.target.value),
                    }))
                  }
                  className="mt-3 w-full accent-emerald-600"
                />
                <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                  <span>투명 (0%)</span>
                  <span>기본 ({DEFAULT_SITE_NAV_BACKGROUND_DARK_OVERLAY_OPACITY}%)</span>
                  <span>불투명 (100%)</span>
                </div>
              </div>
            ) : null}
          </div>

          <label className="mt-4 block text-sm font-medium text-gray-700">
            배경 이미지 URL (선택)
            <input
              type="url"
              value={settings.site_nav_background_image_url ?? ""}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  site_nav_background_image_url: event.target.value.trim() || null,
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
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleImageUpload(file);
                  }
                  event.target.value = "";
                }}
              />
              {uploading ? "업로드 중..." : "이미지 업로드"}
            </label>
            {imageUrl ? (
              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    site_nav_background_image_url: null,
                    site_nav_background_display_enabled: false,
                  }))
                }
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                이미지 삭제
              </button>
            ) : null}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            권장 해상도: <strong>2400 × 400px</strong> (가로형, 약 6:1) · 최소{" "}
            <strong>1920 × 320px</strong>
            <br />
            JPG·PNG·WEBP · 가로로 긴 이미지 · 중요한 요소는 가운데에 배치 (위아래는 잘릴 수 있음)
            <br />
            상단 높이는 약 100~160px(모바일은 더 높음)이며, 화면 너비에 맞춰 cover로 표시됩니다.
          </p>

          {imageUrl ? (
            <div
              className={[
                "site-top-nav site-top-nav--has-background mt-4 overflow-hidden rounded-xl border border-gray-200",
                darkBackgroundEnabled ? "site-top-nav--background-dark site-top-nav--floating-chips" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                position: "relative",
                ...(darkBackgroundEnabled
                  ? buildSiteNavBackgroundDarkOverlayStyle(darkOverlayOpacity)
                  : {}),
              }}
            >
              <div
                className="site-top-nav__background"
                aria-hidden
                style={{ backgroundImage: `url("${imageUrl}")` }}
              />
              <div className="site-top-nav__inner relative z-[1]">
                <div className="rounded-lg border border-dashed border-gray-300/80 bg-white/70 px-3 py-2 text-xs text-gray-600">
                  배경 미리보기 (실제 메뉴는 저장 후 메인에서 확인)
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </AdminCollapsibleSection>
  );
}
