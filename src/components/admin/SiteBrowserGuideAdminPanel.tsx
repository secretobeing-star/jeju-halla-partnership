"use client";

import { useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import {
  DEFAULT_SAFARI_INSTALL_GUIDE_BUTTON_LABEL,
  DEFAULT_SAFARI_INSTALL_GUIDE_TITLE,
  resolveSafariInstallGuideContent,
} from "@/lib/site-browser-guide-settings";
import { resolvePwaEffectiveOpenButtonLabel } from "@/lib/site-pwa";
import { SiteSettings } from "@/lib/supabase";

type SiteBrowserGuideAdminPanelProps = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
};

export default function SiteBrowserGuideAdminPanel({
  settings,
  onChange,
}: SiteBrowserGuideAdminPanelProps) {
  const [safariHowToPreviewOpen, setSafariHowToPreviewOpen] = useState(true);
  const safariGuidePreview = resolveSafariInstallGuideContent(settings);

  const samsungOpenPreviewLabel =
    settings.site_samsung_browser_guide_open_button_label?.trim() ||
    resolvePwaEffectiveOpenButtonLabel(settings);
  const hasSamsungPreview =
    Boolean(settings.site_samsung_browser_guide_title?.trim()) ||
    Boolean(settings.site_samsung_browser_guide_message?.trim()) ||
    Boolean(settings.site_samsung_browser_guide_button_label?.trim()) ||
    Boolean(settings.site_samsung_browser_guide_chrome_button_label?.trim()) ||
    Boolean(settings.site_samsung_browser_guide_open_button_label?.trim());

  return (
    <div className="space-y-6">
      <AdminCollapsibleSection
        title="카카오톡 인앱 브라우저 안내"
        description="카카오톡 링크로 접속했을 때 표시됩니다. 문구를 입력해야 배너가 노출됩니다."
      >
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settings.site_kakao_in_app_guide_enabled ?? false}
            onChange={(event) =>
              onChange({ site_kakao_in_app_guide_enabled: event.target.checked })
            }
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          카카오톡 인앱 브라우저 안내 사용
        </label>

        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            제목
            <input
              value={settings.site_kakao_in_app_guide_title ?? ""}
              onChange={(event) =>
                onChange({
                  site_kakao_in_app_guide_title: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            안내 문구
            <textarea
              value={settings.site_kakao_in_app_guide_message ?? ""}
              onChange={(event) =>
                onChange({
                  site_kakao_in_app_guide_message: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            삼성 인터넷 열기 버튼 문구
            <span className="mt-0.5 block text-xs font-normal text-gray-500">
              Android·갤럭시에서 카카오 인앱 안내에 표시됩니다.
            </span>
            <input
              value={settings.site_kakao_in_app_guide_samsung_button_label ?? ""}
              onChange={(event) =>
                onChange({
                  site_kakao_in_app_guide_samsung_button_label: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Chrome 열기 버튼 문구
            <span className="mt-0.5 block text-xs font-normal text-gray-500">
              Android·갤럭시에서 카카오 인앱 안내에 표시됩니다.
            </span>
            <input
              value={settings.site_kakao_in_app_guide_button_label ?? ""}
              onChange={(event) =>
                onChange({
                  site_kakao_in_app_guide_button_label: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Safari 열기 버튼 문구
            <span className="mt-0.5 block text-xs font-normal text-gray-500">
              iPhone·iPad 카카오톡에서만 표시됩니다. 누르면 Safari로 이동합니다.
            </span>
            <input
              value={settings.site_kakao_in_app_guide_safari_button_label ?? ""}
              onChange={(event) =>
                onChange({
                  site_kakao_in_app_guide_safari_button_label: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="Safari 앱 설치 안내"
        description="iPhone·iPad Safari로 접속했을 때만 표시됩니다. (카카오톡 인앱에서는 표시되지 않습니다.)"
      >
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settings.site_safari_browser_guide_enabled ?? false}
            onChange={(event) =>
              onChange({ site_safari_browser_guide_enabled: event.target.checked })
            }
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          Safari 앱 설치 안내 사용
        </label>

        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            제목
            <input
              value={
                settings.site_safari_browser_guide_title ??
                settings.site_kakao_in_app_guide_ios_popup_title ??
                ""
              }
              onChange={(event) =>
                onChange({
                  site_safari_browser_guide_title: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              placeholder={DEFAULT_SAFARI_INSTALL_GUIDE_TITLE}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            안내 문구
            <textarea
              value={
                settings.site_safari_browser_guide_message ??
                settings.site_kakao_in_app_guide_ios_popup_message ??
                ""
              }
              onChange={(event) =>
                onChange({
                  site_safari_browser_guide_message: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            설치 단계
            <span className="mt-0.5 block text-xs font-normal text-gray-500">
              열기 버튼을 누르면 「설치 방법」 팝업에 표시됩니다. 한 줄에 하나씩 입력하세요.
            </span>
            <textarea
              value={
                settings.site_safari_browser_guide_steps ??
                settings.site_kakao_in_app_guide_ios_popup_steps ??
                ""
              }
              onChange={(event) =>
                onChange({
                  site_safari_browser_guide_steps: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              rows={5}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            열기 버튼 문구
            <span className="mt-0.5 block text-xs font-normal text-gray-500">
              누르면 설치 방법 팝업이 열립니다.
            </span>
            <input
              value={
                settings.site_safari_browser_guide_button_label ??
                settings.site_kakao_in_app_guide_ios_safari_open_label ??
                ""
              }
              onChange={(event) =>
                onChange({
                  site_safari_browser_guide_button_label: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              placeholder={DEFAULT_SAFARI_INSTALL_GUIDE_BUTTON_LABEL}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>

          <div className="rounded-lg border border-emerald-100 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-800">팝업 미리보기</p>
              <button
                type="button"
                onClick={() => setSafariHowToPreviewOpen((open) => !open)}
                className="text-xs font-medium text-emerald-700 underline-offset-2 hover:underline"
              >
                {safariHowToPreviewOpen ? "설치 방법 팝업 닫기" : "설치 방법 팝업 열기"}
              </button>
            </div>

            <div className="relative mt-3 overflow-hidden rounded-2xl border border-emerald-200 bg-gray-50 p-3">
              {/* 1. Safari 안내 팝업 */}
              <div className="rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{safariGuidePreview.title}</p>
                  <span className="shrink-0 text-xs text-gray-500">닫기</span>
                </div>
                {safariGuidePreview.message ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-gray-600">
                    {safariGuidePreview.message}
                  </p>
                ) : (
                  <p className="mt-2 text-xs leading-relaxed text-gray-400">
                    안내 문구를 입력하면 여기에 표시됩니다.
                  </p>
                )}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setSafariHowToPreviewOpen(true)}
                    className="block w-full rounded-lg bg-emerald-600 px-2 py-2 text-center text-[11px] font-semibold text-white"
                  >
                    {safariGuidePreview.buttonLabel}
                  </button>
                </div>
              </div>

              {/* 2. 열기 → 설치 방법 중첩 팝업 */}
              {safariHowToPreviewOpen ? (
                <div className="absolute inset-0 z-10 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center">
                  <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-white p-3 shadow-lg">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">설치 방법</p>
                      <button
                        type="button"
                        onClick={() => setSafariHowToPreviewOpen(false)}
                        className="shrink-0 text-xs text-gray-500 hover:text-gray-700"
                      >
                        닫기
                      </button>
                    </div>
                    {safariGuidePreview.steps.length > 0 ? (
                      <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-gray-600">
                        {safariGuidePreview.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-2 text-xs leading-relaxed text-gray-500">
                        설치 단계를 입력하면 「설치 방법」 팝업에 표시됩니다.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              「{safariGuidePreview.buttonLabel}」을 누르면 실제 사이트처럼 설치 방법 팝업이 열립니다.
            </p>
          </div>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="삼성 브라우저 안내"
        description="삼성 인터넷으로 접속했을 때 표시됩니다. 문구를 입력해야 배너가 노출됩니다."
      >
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settings.site_samsung_browser_guide_enabled ?? false}
            onChange={(event) =>
              onChange({ site_samsung_browser_guide_enabled: event.target.checked })
            }
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          삼성 브라우저 안내 사용
        </label>

        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            제목
            <input
              value={settings.site_samsung_browser_guide_title ?? ""}
              onChange={(event) =>
                onChange({
                  site_samsung_browser_guide_title: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            안내 문구
            <textarea
              value={settings.site_samsung_browser_guide_message ?? ""}
              onChange={(event) =>
                onChange({
                  site_samsung_browser_guide_message: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            설치 버튼 문구
            <input
              value={settings.site_samsung_browser_guide_button_label ?? ""}
              onChange={(event) =>
                onChange({
                  site_samsung_browser_guide_button_label: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            크롬 열기 버튼 문구
            <input
              value={settings.site_samsung_browser_guide_chrome_button_label ?? ""}
              onChange={(event) =>
                onChange({
                  site_samsung_browser_guide_chrome_button_label: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            열기 버튼 문구
            <span className="mt-0.5 block text-xs font-normal text-gray-500">
              앱이 이미 설치된 기기에서 설치 버튼 대신 표시됩니다.
            </span>
            <input
              value={settings.site_samsung_browser_guide_open_button_label ?? ""}
              onChange={(event) =>
                onChange({
                  site_samsung_browser_guide_open_button_label: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>

          {hasSamsungPreview ? (
            <div className="rounded-lg border border-emerald-100 bg-white p-3">
              <p className="text-sm font-medium text-gray-800">팝업 미리보기</p>
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      {settings.site_samsung_browser_guide_title?.trim() ? (
                        <p className="text-sm font-semibold text-gray-900">
                          {settings.site_samsung_browser_guide_title.trim()}
                        </p>
                      ) : (
                        <span aria-hidden="true" />
                      )}
                      <span className="shrink-0 text-xs text-gray-500">닫기</span>
                    </div>
                    {settings.site_samsung_browser_guide_message?.trim() ? (
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-600">
                        {settings.site_samsung_browser_guide_message.trim()}
                      </p>
                    ) : null}
                    {(settings.site_samsung_browser_guide_chrome_button_label?.trim() ||
                      settings.site_samsung_browser_guide_button_label?.trim() ||
                      samsungOpenPreviewLabel) && (
                      <div className="flex gap-2">
                        {settings.site_samsung_browser_guide_chrome_button_label?.trim() ? (
                          <span className="flex-1 rounded-lg border border-emerald-200 px-2 py-2 text-center text-[11px] font-semibold text-emerald-700">
                            {settings.site_samsung_browser_guide_chrome_button_label.trim()}
                          </span>
                        ) : null}
                        {settings.site_samsung_browser_guide_button_label?.trim() ||
                        samsungOpenPreviewLabel ? (
                          <span className="flex-1 rounded-lg bg-emerald-600 px-2 py-2 text-center text-[11px] font-semibold text-white">
                            {settings.site_samsung_browser_guide_button_label?.trim() ||
                              samsungOpenPreviewLabel}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                앱 설치 후에는 설치 버튼 대신 열기 버튼 문구가 표시됩니다.
              </p>
            </div>
          ) : null}
        </div>
      </AdminCollapsibleSection>
    </div>
  );
}
