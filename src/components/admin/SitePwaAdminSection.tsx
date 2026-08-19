"use client";

import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import {
  DEFAULT_PWA_BACKGROUND_COLOR,
  DEFAULT_PWA_INSTALL_BUTTON_LABEL,
  DEFAULT_PWA_THEME_COLOR,
  parsePwaInstallGuideSteps,
  resolvePwaEffectiveOpenButtonLabel,
} from "@/lib/site-pwa";
import { MAX_PWA_LOADING_DURATION_MS, PWA_LOADING_IMAGE_FOLD_COVER_RECOMMENDED_HEIGHT, PWA_LOADING_IMAGE_FOLD_COVER_RECOMMENDED_WIDTH, PWA_LOADING_IMAGE_RECOMMENDED_HEIGHT, PWA_LOADING_IMAGE_RECOMMENDED_WIDTH, PWA_LOADING_IMAGE_TABLET_RECOMMENDED_HEIGHT, PWA_LOADING_IMAGE_TABLET_RECOMMENDED_WIDTH, PWA_LOADING_IMAGE_TABLET_ULTRA_RECOMMENDED_HEIGHT, PWA_LOADING_IMAGE_TABLET_ULTRA_RECOMMENDED_WIDTH } from "@/lib/site-pwa-loading";
import {
  PWA_FOLD_COVER_MAX_WIDTH,
  PWA_PHONE_MAX_WIDTH,
} from "@/lib/pwa-fold-viewport";
import {
  TABLET_LG_VIEWPORT_MAX_WIDTH,
  TABLET_VIEWPORT_MAX_WIDTH,
  TABLET_VIEWPORT_MIN_WIDTH,
} from "@/lib/partner-list-layout";
import {
  DEFAULT_PWA_BACK_EXIT_TIMEOUT_MS,
  MAX_PWA_BACK_EXIT_TIMEOUT_MS,
  normalizePwaBackExitTimeoutMs,
} from "@/lib/app-back-stack";
import { SiteSettings } from "@/lib/supabase";
import SitePwaPermissionSettingsAdminFields from "@/components/admin/SitePwaPermissionSettingsAdminFields";

export type SitePwaAdminSectionKey =
  | "basic"
  | "app-permissions"
  | "loading"
  | "permission-settings"
  | "back-exit";

type SitePwaAdminSectionProps = {
  section: SitePwaAdminSectionKey;
  settings: SiteSettings;
  iconUploading: boolean;
  loadingImageUploading: boolean;
  loadingImageFoldCoverUploading: boolean;
  loadingImageTabletUploading: boolean;
  loadingImageTabletUltraUploading: boolean;
  onChange: (patch: Partial<SiteSettings>) => void;
  onUploadIcon: (file: File) => void;
  onClearIcon: () => void;
  onUploadLoadingImage: (file: File) => void;
  onClearLoadingImage: () => void;
  onUploadLoadingImageFoldCover: (file: File) => void;
  onClearLoadingImageFoldCover: () => void;
  onUploadLoadingImageTablet: (file: File) => void;
  onClearLoadingImageTablet: () => void;
  onUploadLoadingImageTabletUltra: (file: File) => void;
  onClearLoadingImageTabletUltra: () => void;
};

function PwaDisabledNotice() {
  return (
    <p className="mt-3 text-sm text-gray-500">
      PWA 기능을 켠 뒤 설정할 수 있습니다. 「PWA (앱 설치)」 메뉴에서 PWA 기능 사용을
      활성화해 주세요.
    </p>
  );
}

export default function SitePwaAdminSection({
  section,
  settings,
  iconUploading,
  loadingImageUploading,
  loadingImageFoldCoverUploading,
  loadingImageTabletUploading,
  loadingImageTabletUltraUploading,
  onChange,
  onUploadIcon,
  onClearIcon,
  onUploadLoadingImage,
  onClearLoadingImage,
  onUploadLoadingImageFoldCover,
  onClearLoadingImageFoldCover,
  onUploadLoadingImageTablet,
  onClearLoadingImageTablet,
  onUploadLoadingImageTabletUltra,
  onClearLoadingImageTabletUltra,
}: SitePwaAdminSectionProps) {
  const enabled = settings.site_pwa_enabled ?? false;
  const pwaIconUrl = settings.site_pwa_icon_url?.trim() || null;
  const installGuidePreviewSteps = parsePwaInstallGuideSteps(
    settings.site_pwa_install_guide_steps,
  );
  const installPreviewLabel =
    settings.site_pwa_install_button_label?.trim() || DEFAULT_PWA_INSTALL_BUTTON_LABEL;
  const openPreviewLabel = resolvePwaEffectiveOpenButtonLabel(settings);
  const hasInstallPreviewContent =
    Boolean(settings.site_pwa_install_guide_message?.trim()) ||
    installGuidePreviewSteps.length > 0 ||
    Boolean(settings.site_pwa_install_button_label?.trim());
  const hasOpenPreviewContent = Boolean(openPreviewLabel);

  if (section === "basic") {
    return (
      <AdminCollapsibleSection
        title="PWA (앱 설치)"
        description="홈 화면에 추가해 앱처럼 사용할 수 있게 합니다. 앱 이름·아이콘·설치 안내 문구를 설정할 수 있습니다."
      >
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onChange({ site_pwa_enabled: event.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          PWA 기능 사용
        </label>

        {enabled ? (
          <div className="mt-4 space-y-4">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={settings.site_pwa_install_prompt_enabled ?? true}
                onChange={(event) =>
                  onChange({ site_pwa_install_prompt_enabled: event.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              설치 안내 배너 표시
              <span className="ml-1 text-xs font-normal text-gray-500">(Android·갤럭시)</span>
            </label>

            <label className="block text-sm font-medium text-gray-700">
              앱 이름 (전체)
              <input
                value={settings.site_pwa_name ?? ""}
                onChange={(event) =>
                  onChange({
                    site_pwa_name: event.target.value.trim() ? event.target.value : null,
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
            <p className="text-xs text-gray-500">
              홈 화면·설치 창에 표시되는 전체 이름입니다. 비우면 사이트 제목을 사용합니다.
            </p>

            <label className="block text-sm font-medium text-gray-700">
              앱 이름 (짧게)
              <input
                value={settings.site_pwa_short_name ?? ""}
                onChange={(event) =>
                  onChange({
                    site_pwa_short_name: event.target.value.trim() ? event.target.value : null,
                  })
                }
                maxLength={12}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
            <p className="text-xs text-gray-500">홈 화면 아이콘 아래에 표시됩니다. 최대 12자.</p>

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
                업로드 시 512×512 PNG로 자동 맞춤됩니다. 이름·아이콘 변경 후에는 모바일에서
                새로고침하세요. 이미 설치한 앱은 삭제 후 다시 설치해야 아이콘이 바뀝니다.
              </p>
              {pwaIconUrl ? (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                  <img
                    src={pwaIconUrl}
                    alt="PWA 아이콘 미리보기"
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
              테마 색상
              <p className="mt-0.5 text-xs font-normal text-gray-500">
                크롬 탭·PWA 태스크바(하단 내비게이션 바)에 공통 적용됩니다.
              </p>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={
                    settings.site_pwa_chrome_tab_theme_color ??
                    settings.site_pwa_theme_color ??
                    DEFAULT_PWA_THEME_COLOR
                  }
                  onChange={(event) =>
                    onChange({
                      site_pwa_chrome_tab_theme_color: event.target.value,
                      site_pwa_taskbar_theme_color: null,
                    })
                  }
                  className="h-10 w-14 cursor-pointer rounded border border-gray-300 bg-white"
                />
                <input
                  value={settings.site_pwa_chrome_tab_theme_color ?? ""}
                  onChange={(event) =>
                    onChange({
                      site_pwa_chrome_tab_theme_color: event.target.value.trim()
                        ? event.target.value.trim()
                        : null,
                      site_pwa_taskbar_theme_color: null,
                    })
                  }
                  placeholder={settings.site_pwa_theme_color ?? DEFAULT_PWA_THEME_COLOR}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>
            </label>

            <label className="block text-sm font-medium text-gray-700">
              배경 색상
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={settings.site_pwa_background_color ?? DEFAULT_PWA_BACKGROUND_COLOR}
                  onChange={(event) =>
                    onChange({ site_pwa_background_color: event.target.value })
                  }
                  className="h-10 w-14 cursor-pointer rounded border border-gray-300 bg-white"
                />
                <input
                  value={settings.site_pwa_background_color ?? ""}
                  onChange={(event) =>
                    onChange({
                      site_pwa_background_color: event.target.value.trim()
                        ? event.target.value.trim()
                        : null,
                    })
                  }
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>
            </label>

            <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50/80 p-4">
              <div>
                <p className="text-sm font-medium text-gray-800">설치 안내 문구</p>
                <p className="mt-1 text-xs text-gray-500">
                  Android·갤럭시(Chrome 등) 하단 배너 전용입니다. iPhone Safari 안내는 「Safari 앱
                  설치 안내」에서 설정하세요.
                </p>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                안내 문구
                <textarea
                  value={settings.site_pwa_install_guide_message ?? ""}
                  onChange={(event) =>
                    onChange({
                      site_pwa_install_guide_message: event.target.value.trim()
                        ? event.target.value
                        : null,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                설치 단계 (선택)
                <textarea
                  value={settings.site_pwa_install_guide_steps ?? ""}
                  onChange={(event) =>
                    onChange({
                      site_pwa_install_guide_steps: event.target.value.trim()
                        ? event.target.value
                        : null,
                    })
                  }
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <p className="text-xs text-gray-500">
                한 줄에 하나씩 입력하면 번호 목록으로 표시됩니다.
              </p>

              <label className="block text-sm font-medium text-gray-700">
                설치 버튼 텍스트
                <input
                  value={settings.site_pwa_install_button_label ?? ""}
                  onChange={(event) =>
                    onChange({
                      site_pwa_install_button_label: event.target.value.trim()
                        ? event.target.value
                        : null,
                    })
                  }
                  placeholder={DEFAULT_PWA_INSTALL_BUTTON_LABEL}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                열기 버튼 텍스트
                <span className="mt-0.5 block text-xs font-normal text-gray-500">
                  앱이 이미 설치된 Android·갤럭시에서 Chrome 등으로 접속할 때 표시됩니다.
                </span>
                <input
                  value={settings.site_pwa_open_button_label ?? ""}
                  onChange={(event) =>
                    onChange({
                      site_pwa_open_button_label: event.target.value.trim()
                        ? event.target.value
                        : null,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <p className="text-xs text-gray-500">
                설치 버튼을 비우면 「{DEFAULT_PWA_INSTALL_BUTTON_LABEL}」을 사용합니다.
              </p>

              {(hasInstallPreviewContent || hasOpenPreviewContent) && (
                <div className="space-y-3">
                  {hasInstallPreviewContent ? (
                    <div className="rounded-lg border border-emerald-100 bg-white p-3 text-sm">
                      <p className="font-medium text-gray-800">설치 배너 미리보기</p>
                      {settings.site_pwa_install_guide_message?.trim() ? (
                        <p className="mt-2 text-xs leading-relaxed text-gray-600">
                          {settings.site_pwa_install_guide_message.trim()}
                        </p>
                      ) : null}
                      {installGuidePreviewSteps.length > 0 ? (
                        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-gray-600">
                          {installGuidePreviewSteps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      ) : null}
                      <button
                        type="button"
                        disabled
                        className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white opacity-90"
                      >
                        {installPreviewLabel}
                      </button>
                    </div>
                  ) : null}
                  {hasOpenPreviewContent ? (
                    <div className="rounded-lg border border-sky-100 bg-white p-3 text-sm">
                      <p className="font-medium text-gray-800">열기 배너 미리보기</p>
                      <p className="mt-2 text-xs leading-relaxed text-gray-500">
                        Android·갤럭시에서 앱이 이미 설치됐거나 설치 API를 쓸 수 없을 때 표시됩니다.
                      </p>
                      {settings.site_pwa_install_guide_message?.trim() ? (
                        <p className="mt-2 text-xs leading-relaxed text-gray-600">
                          {settings.site_pwa_install_guide_message.trim()}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        disabled
                        className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white opacity-90"
                      >
                        {openPreviewLabel}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            PWA를 켜면 방문자가 홈 화면에 사이트를 추가할 수 있습니다. 푸시 알림과 함께 사용할
            수 있습니다.
          </p>
        )}
      </AdminCollapsibleSection>
    );
  }

  if (!enabled) {
    return <PwaDisabledNotice />;
  }

  if (section === "app-permissions") {
    return (
      <AdminCollapsibleSection
        title="PWA 앱 권한"
        description="홈 화면에 추가한 앱(PWA)으로 실행할 때만 적용됩니다. 최초 실행 안내와 우측 상단 앱 전용 설정(톱니)을 관리합니다."
      >
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.site_pwa_first_run_notification_prompt_enabled ?? true}
              onChange={(event) =>
                onChange({
                  site_pwa_first_run_notification_prompt_enabled: event.target.checked,
                })
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            최초 실행 시 알림 권한 안내
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.site_pwa_first_run_location_prompt_enabled ?? true}
              onChange={(event) =>
                onChange({
                  site_pwa_first_run_location_prompt_enabled: event.target.checked,
                })
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            최초 실행 시 위치 권한 안내
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.site_pwa_app_settings_enabled ?? true}
              onChange={(event) =>
                onChange({ site_pwa_app_settings_enabled: event.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            PWA 앱 전용 설정(톱니) 표시
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.site_pwa_app_settings_notification_enabled ?? true}
              onChange={(event) =>
                onChange({
                  site_pwa_app_settings_notification_enabled: event.target.checked,
                })
              }
              disabled={!(settings.site_pwa_app_settings_enabled ?? true)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
            />
            앱 설정에 푸시 알림 온오프 표시
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.site_pwa_app_settings_location_enabled ?? true}
              onChange={(event) =>
                onChange({
                  site_pwa_app_settings_location_enabled: event.target.checked,
                })
              }
              disabled={!(settings.site_pwa_app_settings_enabled ?? true)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
            />
            앱 설정에 위치 온오프 표시
          </label>
        </div>
      </AdminCollapsibleSection>
    );
  }

  if (section === "loading") {
    return (
      <AdminCollapsibleSection
        title="앱 로딩 화면"
        description="홈 화면에 추가한 앱(PWA)으로 실행할 때 PC·모바일 모두 표시됩니다. 데이터 로딩이 끝나도 최소 표시 시간만큼은 유지됩니다."
      >
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.site_pwa_loading_enabled ?? true}
              onChange={(event) => onChange({ site_pwa_loading_enabled: event.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            PWA 앱 로딩 화면 사용
          </label>

          <label className="block text-sm font-medium text-gray-700">
            로딩 문구 (선택)
            <input
              value={settings.site_pwa_loading_message ?? ""}
              onChange={(event) =>
                onChange({
                  site_pwa_loading_message: event.target.value.trim() ? event.target.value : null,
                })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>

          <div className="overflow-hidden rounded-lg border border-emerald-100 bg-emerald-50/70">
            <p className="border-b border-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-900">
              기기별 권장 이미지 크기 (px)
            </p>
            <dl className="divide-y divide-emerald-100 text-xs text-gray-700">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-3 py-2">
                <dt className="font-medium text-gray-800">S시리즈·바형 폰</dt>
                <dd className="font-mono text-emerald-800">
                  {PWA_LOADING_IMAGE_RECOMMENDED_WIDTH}×{PWA_LOADING_IMAGE_RECOMMENDED_HEIGHT}px
                </dd>
                <dd className="col-span-2 text-[11px] text-gray-500">
                  화면 너비 {PWA_PHONE_MAX_WIDTH}px 이하 · 약 20:9
                </dd>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-3 py-2">
                <dt className="font-medium text-gray-800">폴드 외부(커버)</dt>
                <dd className="font-mono text-emerald-800">
                  {PWA_LOADING_IMAGE_FOLD_COVER_RECOMMENDED_WIDTH}×
                  {PWA_LOADING_IMAGE_FOLD_COVER_RECOMMENDED_HEIGHT}px
                </dd>
                <dd className="col-span-2 text-[11px] text-gray-500">
                  화면 너비 {PWA_FOLD_COVER_MAX_WIDTH}px 이하 · 약 10:16
                </dd>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-3 py-2">
                <dt className="font-medium text-gray-800">폴드 펼침·태블릿</dt>
                <dd className="font-mono text-emerald-800">
                  {PWA_LOADING_IMAGE_TABLET_RECOMMENDED_WIDTH}×
                  {PWA_LOADING_IMAGE_TABLET_RECOMMENDED_HEIGHT}px
                </dd>
                <dd className="col-span-2 text-[11px] text-gray-500">
                  화면 너비 {TABLET_VIEWPORT_MIN_WIDTH}–{TABLET_VIEWPORT_MAX_WIDTH}px · 약 3:4
                </dd>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-3 py-2">
                <dt className="font-medium text-gray-800">Fold Ultra·넓은 태블릿</dt>
                <dd className="font-mono text-emerald-800">
                  {PWA_LOADING_IMAGE_TABLET_ULTRA_RECOMMENDED_WIDTH}×
                  {PWA_LOADING_IMAGE_TABLET_ULTRA_RECOMMENDED_HEIGHT}px
                </dd>
                <dd className="col-span-2 text-[11px] text-gray-500">
                  화면 너비 {TABLET_VIEWPORT_MAX_WIDTH + 1}–{TABLET_LG_VIEWPORT_MAX_WIDTH}px · 약
                  10:9
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              휴대폰 로딩 이미지
              <span className="ml-1 font-mono font-normal text-emerald-700">
                {PWA_LOADING_IMAGE_RECOMMENDED_WIDTH}×{PWA_LOADING_IMAGE_RECOMMENDED_HEIGHT}px
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={loadingImageUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onUploadLoadingImage(file);
                  }
                  event.target.value = "";
                }}
                className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
              />
            </label>
            {loadingImageUploading ? (
              <p className="mt-2 text-sm text-gray-500">업로드 중...</p>
            ) : null}
            <p className="mt-1 text-xs text-gray-500">
              Galaxy S시리즈·바형 폰. 화면 너비 {PWA_PHONE_MAX_WIDTH}px 이하. 권장{" "}
              <span className="font-mono text-gray-700">
                {PWA_LOADING_IMAGE_RECOMMENDED_WIDTH}×{PWA_LOADING_IMAGE_RECOMMENDED_HEIGHT}px
              </span>{" "}
              (20:9). 비우면 앱 아이콘을 사용합니다.
            </p>
            {settings.site_pwa_loading_image_url?.trim() ? (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                <img
                  src={settings.site_pwa_loading_image_url.trim()}
                  alt="휴대폰 PWA 로딩 이미지 미리보기"
                  className="max-h-32 w-auto rounded-lg object-contain"
                />
                <button
                  type="button"
                  onClick={onClearLoadingImage}
                  className="text-sm text-red-600 hover:underline"
                >
                  삭제
                </button>
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fold 커버 로딩 이미지
              <span className="ml-1 font-mono font-normal text-emerald-700">
                {PWA_LOADING_IMAGE_FOLD_COVER_RECOMMENDED_WIDTH}×
                {PWA_LOADING_IMAGE_FOLD_COVER_RECOMMENDED_HEIGHT}px
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={loadingImageFoldCoverUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onUploadLoadingImageFoldCover(file);
                  }
                  event.target.value = "";
                }}
                className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
              />
            </label>
            {loadingImageFoldCoverUploading ? (
              <p className="mt-2 text-sm text-gray-500">업로드 중...</p>
            ) : null}
            <p className="mt-1 text-xs text-gray-500">
              폴드 외부(접힌 커버). 화면 너비 {PWA_FOLD_COVER_MAX_WIDTH}px 이하. 권장{" "}
              <span className="font-mono text-gray-700">
                {PWA_LOADING_IMAGE_FOLD_COVER_RECOMMENDED_WIDTH}×
                {PWA_LOADING_IMAGE_FOLD_COVER_RECOMMENDED_HEIGHT}px
              </span>{" "}
              (10:16). S시리즈·바형 폰은 위 휴대폰 이미지를 사용합니다. 비우면 휴대폰 이미지를
              사용합니다.
            </p>
            {settings.site_pwa_loading_image_url_fold_cover?.trim() ? (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                <img
                  src={settings.site_pwa_loading_image_url_fold_cover.trim()}
                  alt="Fold8 커버 PWA 로딩 이미지 미리보기"
                  className="max-h-32 w-auto rounded-lg object-contain"
                />
                <button
                  type="button"
                  onClick={onClearLoadingImageFoldCover}
                  className="text-sm text-red-600 hover:underline"
                >
                  삭제
                </button>
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fold 펼침·태블릿 로딩 이미지
              <span className="ml-1 font-mono font-normal text-emerald-700">
                {PWA_LOADING_IMAGE_TABLET_RECOMMENDED_WIDTH}×
                {PWA_LOADING_IMAGE_TABLET_RECOMMENDED_HEIGHT}px
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={loadingImageTabletUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onUploadLoadingImageTablet(file);
                  }
                  event.target.value = "";
                }}
                className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
              />
            </label>
            {loadingImageTabletUploading ? (
              <p className="mt-2 text-sm text-gray-500">업로드 중...</p>
            ) : null}
            <p className="mt-1 text-xs text-gray-500">
              Fold 펼침·갤럭시탭·아이패드. 화면 너비 {TABLET_VIEWPORT_MIN_WIDTH}–
              {TABLET_VIEWPORT_MAX_WIDTH}px. 권장{" "}
              <span className="font-mono text-gray-700">
                {PWA_LOADING_IMAGE_TABLET_RECOMMENDED_WIDTH}×
                {PWA_LOADING_IMAGE_TABLET_RECOMMENDED_HEIGHT}px
              </span>{" "}
              (3:4). 세로는 화면을 꽉 채우고(cover), 가로는 잘림 없이 표시(contain)합니다. 비우면
              휴대폰 이미지를 사용합니다.
            </p>
            {settings.site_pwa_loading_image_url_tablet?.trim() ? (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                <img
                  src={settings.site_pwa_loading_image_url_tablet.trim()}
                  alt="태블릿 PWA 로딩 이미지 미리보기"
                  className="max-h-32 w-auto rounded-lg object-contain"
                />
                <button
                  type="button"
                  onClick={onClearLoadingImageTablet}
                  className="text-sm text-red-600 hover:underline"
                >
                  삭제
                </button>
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fold Ultra·넓은 태블릿 로딩 이미지
              <span className="ml-1 font-mono font-normal text-emerald-700">
                {PWA_LOADING_IMAGE_TABLET_ULTRA_RECOMMENDED_WIDTH}×
                {PWA_LOADING_IMAGE_TABLET_ULTRA_RECOMMENDED_HEIGHT}px
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={loadingImageTabletUltraUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onUploadLoadingImageTabletUltra(file);
                  }
                  event.target.value = "";
                }}
                className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
              />
            </label>
            {loadingImageTabletUltraUploading ? (
              <p className="mt-2 text-sm text-gray-500">업로드 중...</p>
            ) : null}
            <p className="mt-1 text-xs text-gray-500">
              Fold Ultra 펼침·Tab S9 Ultra 등. 화면 너비 {TABLET_VIEWPORT_MAX_WIDTH + 1}–
              {TABLET_LG_VIEWPORT_MAX_WIDTH}px. 권장{" "}
              <span className="font-mono text-gray-700">
                {PWA_LOADING_IMAGE_TABLET_ULTRA_RECOMMENDED_WIDTH}×
                {PWA_LOADING_IMAGE_TABLET_ULTRA_RECOMMENDED_HEIGHT}px
              </span>{" "}
              (10:9). 세로는 cover, 가로는 contain. 비우면 Fold 펼침·태블릿 이미지를 사용합니다.
            </p>
            {settings.site_pwa_loading_image_url_tablet_ultra?.trim() ? (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                <img
                  src={settings.site_pwa_loading_image_url_tablet_ultra.trim()}
                  alt="Fold8 Ultra PWA 로딩 이미지 미리보기"
                  className="max-h-32 w-auto rounded-lg object-contain"
                />
                <button
                  type="button"
                  onClick={onClearLoadingImageTabletUltra}
                  className="text-sm text-red-600 hover:underline"
                >
                  삭제
                </button>
              </div>
            ) : null}
          </div>

          <label className="block text-sm font-medium text-gray-700">
            최소 표시 시간 (초)
            <input
              type="number"
              min={0}
              max={MAX_PWA_LOADING_DURATION_MS / 1000}
              step={0.1}
              value={(settings.site_pwa_loading_duration_ms ?? 0) / 1000}
              onChange={(event) => {
                const seconds = Number.parseFloat(event.target.value);
                const durationMs = Number.isFinite(seconds)
                  ? Math.max(
                      0,
                      Math.min(MAX_PWA_LOADING_DURATION_MS, Math.round(seconds * 1000)),
                    )
                  : 0;
                onChange({ site_pwa_loading_duration_ms: durationMs });
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <p className="text-xs text-gray-500">
            0이면 실제 로딩이 끝나는 즉시 사라집니다. 최대 {MAX_PWA_LOADING_DURATION_MS / 1000}
            초까지 설정할 수 있습니다.
          </p>

          {(settings.site_pwa_loading_message?.trim() ||
            settings.site_pwa_loading_image_url?.trim() ||
            settings.site_pwa_loading_image_url_fold_cover?.trim() ||
            settings.site_pwa_loading_image_url_tablet?.trim() ||
            settings.site_pwa_loading_image_url_tablet_ultra?.trim() ||
            pwaIconUrl) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {(settings.site_pwa_loading_image_url?.trim() || pwaIconUrl) && (
                <div
                  className="relative aspect-[1080/2400] overflow-hidden rounded-lg border border-emerald-100 max-w-xs"
                  style={{
                    backgroundColor:
                      settings.site_pwa_background_color ?? DEFAULT_PWA_BACKGROUND_COLOR,
                  }}
                >
                  <p className="absolute left-3 top-3 z-10 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">
                    휴대폰 {PWA_LOADING_IMAGE_RECOMMENDED_WIDTH}×
                    {PWA_LOADING_IMAGE_RECOMMENDED_HEIGHT}px
                  </p>
                  <img
                    src={(settings.site_pwa_loading_image_url?.trim() || pwaIconUrl)!}
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain object-center"
                  />
                </div>
              )}
              {settings.site_pwa_loading_image_url_fold_cover?.trim() && (
                <div
                  className="relative aspect-[1080/1728] overflow-hidden rounded-lg border border-emerald-100 max-w-xs"
                  style={{
                    backgroundColor:
                      settings.site_pwa_background_color ?? DEFAULT_PWA_BACKGROUND_COLOR,
                  }}
                >
                  <p className="absolute left-3 top-3 z-10 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">
                    폴드 커버 {PWA_LOADING_IMAGE_FOLD_COVER_RECOMMENDED_WIDTH}×
                    {PWA_LOADING_IMAGE_FOLD_COVER_RECOMMENDED_HEIGHT}px
                  </p>
                  <img
                    src={settings.site_pwa_loading_image_url_fold_cover.trim()}
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain object-center"
                  />
                </div>
              )}
              {(settings.site_pwa_loading_image_url_tablet?.trim() ||
                settings.site_pwa_loading_image_url?.trim() ||
                pwaIconUrl) && (
                <div
                  className="relative aspect-[1848/2448] overflow-hidden rounded-lg border border-emerald-100 max-w-xs"
                  style={{
                    backgroundColor:
                      settings.site_pwa_background_color ?? DEFAULT_PWA_BACKGROUND_COLOR,
                  }}
                >
                  <p className="absolute left-3 top-3 z-10 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">
                    폴드 펼침 {PWA_LOADING_IMAGE_TABLET_RECOMMENDED_WIDTH}×
                    {PWA_LOADING_IMAGE_TABLET_RECOMMENDED_HEIGHT}px
                  </p>
                  <img
                    src={
                      (settings.site_pwa_loading_image_url_tablet?.trim() ||
                        settings.site_pwa_loading_image_url?.trim() ||
                        pwaIconUrl)!
                    }
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain object-center"
                  />
                </div>
              )}
              {settings.site_pwa_loading_image_url_tablet_ultra?.trim() && (
                <div
                  className="relative aspect-[2256/2504] overflow-hidden rounded-lg border border-emerald-100 max-w-xs"
                  style={{
                    backgroundColor:
                      settings.site_pwa_background_color ?? DEFAULT_PWA_BACKGROUND_COLOR,
                  }}
                >
                  <p className="absolute left-3 top-3 z-10 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">
                    Fold Ultra {PWA_LOADING_IMAGE_TABLET_ULTRA_RECOMMENDED_WIDTH}×
                    {PWA_LOADING_IMAGE_TABLET_ULTRA_RECOMMENDED_HEIGHT}px
                  </p>
                  <img
                    src={settings.site_pwa_loading_image_url_tablet_ultra.trim()}
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain object-center"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </AdminCollapsibleSection>
    );
  }

  if (section === "back-exit") {
    return (
      <AdminCollapsibleSection
        title="앱 뒤로가기 · 종료"
        description="PWA(홈 화면 앱)에서 팝업이 없을 때 뒤로가기를 두 번 누르면 종료됩니다."
      >
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.site_pwa_back_exit_enabled ?? false}
              onChange={(event) =>
                onChange({ site_pwa_back_exit_enabled: event.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            두 번 뒤로가기로 앱 종료 사용
          </label>
          <label className="block text-sm font-medium text-gray-700">
            첫 번째 뒤로가기 안내 문구
            <textarea
              value={settings.site_pwa_back_exit_message ?? ""}
              onChange={(event) =>
                onChange({
                  site_pwa_back_exit_message: event.target.value.trim()
                    ? event.target.value
                    : null,
                })
              }
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
            <span className="mt-1 block text-xs font-normal text-gray-500">
              비우면 기본 문구「한 번 더 누르면 종료됩니다」를 사용합니다.
            </span>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            두 번째 뒤로가기 허용 시간 (초)
            <input
              type="number"
              min={0.5}
              max={MAX_PWA_BACK_EXIT_TIMEOUT_MS / 1000}
              step={0.1}
              value={(settings.site_pwa_back_exit_timeout_ms ?? DEFAULT_PWA_BACK_EXIT_TIMEOUT_MS) / 1000}
              onChange={(event) => {
                const seconds = Number.parseFloat(event.target.value);
                onChange({
                  site_pwa_back_exit_timeout_ms: Number.isFinite(seconds)
                    ? normalizePwaBackExitTimeoutMs(Math.round(seconds * 1000))
                    : DEFAULT_PWA_BACK_EXIT_TIMEOUT_MS,
                });
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <p className="text-xs text-gray-500">
            기본 {DEFAULT_PWA_BACK_EXIT_TIMEOUT_MS / 1000}초 · 최대{" "}
            {MAX_PWA_BACK_EXIT_TIMEOUT_MS / 1000}초
          </p>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={settings.site_pwa_back_exit_popup_enabled ?? false}
                onChange={(event) =>
                  onChange({ site_pwa_back_exit_popup_enabled: event.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-emerald-600"
              />
              첫 번째 뒤로가기 시 종료 팝업 표시
            </label>
            <p className="text-xs text-gray-500">
              켜면 뒤로가기 1번에 팝업이 뜨고, 「종료하기」를 눌러 앱을 나갑니다. (두 번
              뒤로가기 종료 대신 이 경로를 사용합니다.)
            </p>
            <label className="block text-sm font-medium text-gray-700">
              팝업 제목
              <input
                value={settings.site_pwa_back_exit_popup_title ?? ""}
                onChange={(event) =>
                  onChange({
                    site_pwa_back_exit_popup_title: event.target.value.trim()
                      ? event.target.value
                      : null,
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              팝업 문구
              <textarea
                value={settings.site_pwa_back_exit_popup_message ?? ""}
                onChange={(event) =>
                  onChange({
                    site_pwa_back_exit_popup_message: event.target.value.trim()
                      ? event.target.value
                      : null,
                  })
                }
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.site_pwa_loading_back_exit_enabled ?? false}
              onChange={(event) =>
                onChange({ site_pwa_loading_back_exit_enabled: event.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            앱 로딩 화면에서도 두 번 뒤로가기로 종료
          </label>
          <p className="text-xs text-gray-500">
            PWA 앱 로딩(스플래시) 화면이 떠 있을 때 뒤로가기 2번으로 종료합니다. 기존 메인 화면
            뒤로가기 2번과 별도이며, 첫 번째 뒤로가기 팝업·토스트도 함께 적용됩니다.
          </p>
        </div>
      </AdminCollapsibleSection>
    );
  }

  return (
    <AdminCollapsibleSection
      title="권한 설정"
      description="Android·iPhone/iPad 각각 제목 또는 본문(또는 앱 설정 안내 문구)을 입력해야 해당 기기에서 팝업 안내가 표시됩니다. 비우면 해당 기기 안내는 건너뜁니다."
    >
      <div className="space-y-4">
        <SitePwaPermissionSettingsAdminFields
          platform="android"
          settings={settings}
          onChange={onChange}
        />
        <SitePwaPermissionSettingsAdminFields
          platform="ios"
          settings={settings}
          onChange={onChange}
        />
      </div>
    </AdminCollapsibleSection>
  );
}
