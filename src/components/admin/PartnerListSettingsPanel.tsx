"use client";

import { FormEvent, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import {
  normalizePartnersGridColumns,
  normalizePartnersPerPage,
} from "@/lib/pagination-settings";
import {
  DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MINI,
  DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MOBILE,
  DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_TABLET,
  normalizePartnerBenefitHeight,
} from "@/lib/partner-benefit-height";
import {
  DEFAULT_PARTNER_FAVORITES_EMPTY_MESSAGE,
  DEFAULT_PARTNER_FAVORITES_LABEL,
} from "@/lib/partner-favorites-display";
import { formatSiteSettingsSaveError } from "@/lib/site-settings-save-error";
import { SiteSettings } from "@/lib/supabase";

type PartnerListSettingsPanelProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  saveSettings: (next: SiteSettings) => Promise<{ error: { message: string } | null }>;
  onMessage: (message: string) => void;
};

export default function PartnerListSettingsPanel({
  settings,
  setSettings,
  saveSettings,
  onMessage,
}: PartnerListSettingsPanelProps) {
  const [saving, setSaving] = useState(false);

  function toggleSetting(key: keyof SiteSettings, value: boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    onMessage("");

    const nextSettings: SiteSettings = {
      ...settings,
      partners_per_page: normalizePartnersPerPage(settings.partners_per_page),
      partners_per_page_mobile: normalizePartnersPerPage(settings.partners_per_page_mobile),
      partners_grid_columns_mobile: normalizePartnersGridColumns(
        settings.partners_grid_columns_mobile,
      ),
      partners_per_page_mini: normalizePartnersPerPage(settings.partners_per_page_mini),
      partners_grid_columns_mini: normalizePartnersGridColumns(
        settings.partners_grid_columns_mini,
      ),
      partners_per_page_tablet: normalizePartnersPerPage(settings.partners_per_page_tablet),
      partners_grid_columns_tablet: normalizePartnersGridColumns(settings.partners_grid_columns_tablet),
      partners_per_page_wide: normalizePartnersPerPage(settings.partners_per_page_wide),
      partner_benefit_min_height_mobile: normalizePartnerBenefitHeight(
        settings.partner_benefit_min_height_mobile,
        DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MOBILE,
      ),
      partner_benefit_min_height_mini: normalizePartnerBenefitHeight(
        settings.partner_benefit_min_height_mini,
        DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MINI,
      ),
      partner_benefit_min_height_tablet: normalizePartnerBenefitHeight(
        settings.partner_benefit_min_height_tablet,
        DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_TABLET,
      ),
      partner_favorites_label: settings.partner_favorites_label?.trim() || null,
      partner_favorites_empty_message: settings.partner_favorites_empty_message?.trim() || null,
    };

    const { error } = await saveSettings(nextSettings);
    if (error) {
      onMessage(formatSiteSettingsSaveError(error.message));
      setSaving(false);
      return;
    }

    setSettings(nextSettings);
    onMessage("제휴 목록·정렬 설정이 저장되었습니다.");
    setSaving(false);
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6" data-admin-primary-form>
      <AdminCollapsibleSection title="제휴 목록 설정">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            제휴 페이지당 개수
            <span className="mt-0.5 block text-xs font-normal text-gray-500">
              일반 PC 화면(1280~1919px) 기본값입니다.
            </span>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.partners_per_page ?? 8}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partners_per_page: normalizePartnersPerPage(Number(e.target.value)),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.partner_sort_old_enabled ?? true}
              onChange={(e) => toggleSetting("partner_sort_old_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            제휴 오래된순 활성화
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.partner_sort_new_enabled ?? true}
              onChange={(e) => toggleSetting("partner_sort_new_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            제휴 최신순 활성화
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.partner_sort_recommended_enabled ?? true}
              onChange={(e) =>
                toggleSetting("partner_sort_recommended_enabled", e.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            제휴 추천순 활성화
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.partner_reactions_enabled ?? true}
              onChange={(e) => toggleSetting("partner_reactions_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            제휴 추천 활성화
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.partner_favorites_enabled ?? true}
              onChange={(e) => toggleSetting("partner_favorites_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            제휴 즐겨찾기 활성화
          </label>
          <div
            className={`rounded-xl border border-gray-200 bg-white p-4 sm:col-span-2 ${
              settings.partner_favorites_enabled ?? true ? "" : "pointer-events-none opacity-50"
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">즐겨찾기 표시 문구</p>
            <p className="mt-1 text-xs text-gray-500">
              목록 필터 버튼·빈 목록 안내·접근성 문구에 쓰이는 이름입니다. 비워 두면 기본값(
              {DEFAULT_PARTNER_FAVORITES_LABEL})이 사용됩니다. 찜 데이터는 기기(localStorage)에만
              저장됩니다.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
                필터 버튼 이름
                <input
                  type="text"
                  maxLength={24}
                  placeholder={DEFAULT_PARTNER_FAVORITES_LABEL}
                  value={settings.partner_favorites_label ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      partner_favorites_label: e.target.value.trim() ? e.target.value : null,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
                빈 목록 안내 문구
                <textarea
                  rows={2}
                  maxLength={200}
                  placeholder={DEFAULT_PARTNER_FAVORITES_EMPTY_MESSAGE}
                  value={settings.partner_favorites_empty_message ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      partner_favorites_empty_message: e.target.value.trim()
                        ? e.target.value
                        : null,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.partner_reviews_enabled ?? true}
              onChange={(e) => toggleSetting("partner_reviews_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            <span className="flex flex-wrap items-center gap-2">
              제휴 후기 활성화
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Beta
              </span>
            </span>
          </label>
          <div className="rounded-xl border border-gray-200 bg-white p-4 sm:col-span-2">
            <p className="text-sm font-semibold text-gray-900">메인 기본 정렬</p>
            <p className="mt-1 text-xs text-gray-500">
              메인 화면에 처음 들어왔을 때 적용되는 제휴 목록 정렬입니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-700">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="partner_default_sort"
                  checked={!(settings.partner_default_sort_new ?? false)}
                  onChange={() =>
                    setSettings((prev) => ({ ...prev, partner_default_sort_new: false }))
                  }
                  className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                오래된순
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="partner_default_sort"
                  checked={settings.partner_default_sort_new ?? false}
                  onChange={() =>
                    setSettings((prev) => ({ ...prev, partner_default_sort_new: true }))
                  }
                  className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                최신순
              </label>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.partner_year_filter_enabled ?? true}
              onChange={(e) => toggleSetting("partner_year_filter_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            연도별 필터 활성화
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.partner_category_section_enabled ?? true}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partner_category_section_enabled: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            카테고리·지역 섹션 표시
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.partner_region_filter_enabled ?? true}
              onChange={(e) => toggleSetting("partner_region_filter_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            지역별 필터 활성화
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.partner_list_refresh_enabled ?? true}
              onChange={(e) => toggleSetting("partner_list_refresh_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            제휴 목록 새로고침 활성화
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.pagination_scroll_top_enabled ?? true}
              onChange={(e) => toggleSetting("pagination_scroll_top_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            페이지 이동 시 상단으로 스크롤
          </label>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title={
          <>
            모바일 제휴 목록 설정
            <span className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Beta
            </span>
          </>
        }
        description="일반 스마트폰·폴드 접힌 화면 등 376~767px 모바일 화면에서 적용됩니다. 아이폰 미니(375px 이하)는 아래 별도 설정을 사용합니다."
      >
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settings.partners_mobile_settings_enabled ?? false}
            onChange={(e) => toggleSetting("partners_mobile_settings_enabled", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          모바일 별도 설정 사용
        </label>
        <div
          className={`mt-4 grid gap-4 sm:grid-cols-2 ${
            settings.partners_mobile_settings_enabled ? "" : "pointer-events-none opacity-50"
          }`}
        >
          <label className="block text-sm font-medium text-gray-700">
            모바일 페이지당 개수
            <input
              type="number"
              min={1}
              max={50}
              value={settings.partners_per_page_mobile ?? 6}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partners_per_page_mobile: normalizePartnersPerPage(Number(e.target.value)),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            모바일 한 줄 카드 개수
            <input
              type="number"
              min={1}
              max={4}
              value={settings.partners_grid_columns_mobile ?? 1}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partners_grid_columns_mobile: normalizePartnersGridColumns(Number(e.target.value)),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
            모바일 혜택 칸 최소 높이(px)
            <input
              type="number"
              min={80}
              max={600}
              value={settings.partner_benefit_min_height_mobile ?? 150}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partner_benefit_min_height_mobile: normalizePartnerBenefitHeight(
                    Number(e.target.value),
                    DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MOBILE,
                  ),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title={
          <>
            아이폰 미니 제휴 목록 설정
            <span className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Beta
            </span>
          </>
        }
        description="iPhone 12 mini · 13 mini 등 375px 이하 좁은 화면(376px 미만)에서만 적용됩니다. 상단 제목·설정 버튼 겹침도 이 구간에서 자동으로 여백을 조정합니다."
      >
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settings.partners_mini_settings_enabled ?? false}
            onChange={(e) => toggleSetting("partners_mini_settings_enabled", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          아이폰 미니 별도 설정 사용
        </label>
        <div
          className={`mt-4 grid gap-4 sm:grid-cols-2 ${
            settings.partners_mini_settings_enabled ? "" : "pointer-events-none opacity-50"
          }`}
        >
          <label className="block text-sm font-medium text-gray-700">
            아이폰 미니 페이지당 개수
            <input
              type="number"
              min={1}
              max={50}
              value={settings.partners_per_page_mini ?? 6}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partners_per_page_mini: normalizePartnersPerPage(Number(e.target.value)),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            아이폰 미니 한 줄 카드 개수
            <input
              type="number"
              min={1}
              max={4}
              value={settings.partners_grid_columns_mini ?? 1}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partners_grid_columns_mini: normalizePartnersGridColumns(Number(e.target.value)),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
            아이폰 미니 혜택 칸 최소 높이(px)
            <input
              type="number"
              min={80}
              max={600}
              value={settings.partner_benefit_min_height_mini ?? 150}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partner_benefit_min_height_mini: normalizePartnerBenefitHeight(
                    Number(e.target.value),
                    DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MINI,
                  ),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title={
          <>
            폴드·태블릿 제휴 목록 설정
            <span className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Beta
            </span>
          </>
        }
        description="Galaxy Fold2~8(울트라·FE), Galaxy Tab A9~A11(Plus·포함), Tab S6~S11 Ultra(FE), iPad 등 PWA·태블릿·PC(768px 이상) 화면에 적용됩니다. Fold 펼침·태블릿 세로는 768~1279px, iPad Pro·Tab Ultra·Tab A+ 가로는 1280~1439px 구간입니다."
      >
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settings.partners_tablet_settings_enabled ?? false}
            onChange={(e) => toggleSetting("partners_tablet_settings_enabled", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          폴드·태블릿 별도 설정 사용
        </label>
        <div
          className={`mt-4 grid gap-4 sm:grid-cols-2 ${
            settings.partners_tablet_settings_enabled ? "" : "pointer-events-none opacity-50"
          }`}
        >
          <label className="block text-sm font-medium text-gray-700">
            폴드·태블릿 페이지당 개수
            <input
              type="number"
              min={1}
              max={50}
              value={settings.partners_per_page_tablet ?? 9}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partners_per_page_tablet: normalizePartnersPerPage(Number(e.target.value)),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            폴드·태블릿 한 줄 카드 개수
            <input
              type="number"
              min={1}
              max={4}
              value={settings.partners_grid_columns_tablet ?? 3}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partners_grid_columns_tablet: normalizePartnersGridColumns(Number(e.target.value)),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
            폴드·태블릿 혜택 칸 최소 높이(px)
            <input
              type="number"
              min={80}
              max={600}
              value={settings.partner_benefit_min_height_tablet ?? 175}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partner_benefit_min_height_tablet: normalizePartnerBenefitHeight(
                    Number(e.target.value),
                    DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_TABLET,
                  ),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title={
          <>
            와이드·4K 제휴 목록 설정
            <span className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Beta
            </span>
          </>
        }
        description="1920px 이상 와이드·4K·울트라와이드 화면에서만 적용됩니다. 넓은 레이아웃(6열 등)에 맞게 한 페이지에 더 많이 보여줄 수 있습니다."
      >
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settings.partners_wide_settings_enabled ?? false}
            onChange={(e) => toggleSetting("partners_wide_settings_enabled", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          와이드·4K 별도 설정 사용
        </label>
        <div
          className={`mt-4 grid gap-4 sm:grid-cols-2 ${
            settings.partners_wide_settings_enabled ? "" : "pointer-events-none opacity-50"
          }`}
        >
          <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
            와이드·4K 페이지당 개수
            <input
              type="number"
              min={1}
              max={50}
              value={settings.partners_per_page_wide ?? 12}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partners_per_page_wide: normalizePartnersPerPage(Number(e.target.value)),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
        </div>
      </AdminCollapsibleSection>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving ? "저장 중..." : "제휴 목록·정렬 설정 저장"}
      </button>
    </form>
  );
}
