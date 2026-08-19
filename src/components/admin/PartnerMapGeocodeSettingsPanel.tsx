"use client";

import { FormEvent, useRef } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { uploadPartnershipImage, getStorageErrorMessage } from "@/lib/storage";
import {
  DEFAULT_PARTNER_DETAIL_POPUP_MAX_WIDTH_REM,
  MAX_PARTNER_DETAIL_POPUP_MAX_WIDTH_REM,
  MIN_PARTNER_DETAIL_POPUP_MAX_WIDTH_REM,
  normalizePartnerDetailPopupMaxWidthRem,
} from "@/lib/partner-detail-display";
import { formatSiteSettingsSaveError } from "@/lib/site-settings-save-error";
import { SiteSettings } from "@/lib/supabase";

type PartnerMapGeocodeSettingsPanelProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  saveSettings: (next: SiteSettings) => Promise<{ error: { message: string } | null }>;
  onMessage: (message: string) => void;
};

export default function PartnerMapGeocodeSettingsPanel({
  settings,
  setSettings,
  saveSettings,
  onMessage,
}: PartnerMapGeocodeSettingsPanelProps) {
  function toggleSetting<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const { error } = await saveSettings(settings);
    onMessage(error ? formatSiteSettingsSaveError(error.message) : "제휴 상세·지도 설정이 저장되었습니다.");
  }

  function MarkerImageUploadField({
    label,
    value,
    onChange,
    onMessage: notify,
  }: {
    label: string;
    value: string | null | undefined;
    onChange: (url: string | null) => void;
    onMessage: (msg: string) => void;
  }) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {value ? (
          <div className="mt-1 flex items-center gap-2">
            <img src={value} alt="" className="h-10 w-10 rounded border object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-red-600 hover:underline"
            >
              삭제
            </button>
          </div>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="mt-1 block w-full text-sm text-gray-500"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const url = await uploadPartnershipImage(file, "map-marker-settings");
              onChange(url);
            } catch (err) {
              notify(getStorageErrorMessage(err));
            }
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      </label>
    );
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6" data-admin-primary-form>
      <AdminCollapsibleSection title="자세히 보기 표시">
        <p className="text-sm text-gray-600">
          메인 「자세히 보기」 팝업의 섹션 제목과 가로 너비를 설정합니다. 비워 두면 제목 없이
          표시됩니다.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            상세 안내 제목
            <input
              value={settings.partner_detail_section_label ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partner_detail_section_label: e.target.value.trim() ? e.target.value : null,
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            위치 · 지도 제목
            <input
              value={settings.partner_map_section_label ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partner_map_section_label: e.target.value.trim() ? e.target.value : null,
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
            팝업 최대 가로 너비 (rem)
            <input
              type="number"
              min={MIN_PARTNER_DETAIL_POPUP_MAX_WIDTH_REM}
              max={MAX_PARTNER_DETAIL_POPUP_MAX_WIDTH_REM}
              value={settings.partner_detail_popup_max_width_rem ?? DEFAULT_PARTNER_DETAIL_POPUP_MAX_WIDTH_REM}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partner_detail_popup_max_width_rem: normalizePartnerDetailPopupMaxWidthRem(
                    Number(e.target.value),
                  ),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 sm:max-w-xs"
            />
            <span className="mt-1 block text-xs text-gray-500">
              {MIN_PARTNER_DETAIL_POPUP_MAX_WIDTH_REM}~{MAX_PARTNER_DETAIL_POPUP_MAX_WIDTH_REM} rem
              (기본 {DEFAULT_PARTNER_DETAIL_POPUP_MAX_WIDTH_REM}). 숫자가 클수록 팝업이 넓어집니다.
            </span>
          </label>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="지도 API 설정">
        <p className="text-sm text-gray-600">
          제휴업체 등록 시 「주소로 등록 (API)」 사용 여부와 API 제공자를 설정합니다. 지도
          링크 등록은 이 설정과 관계없이 사용할 수 있습니다.
        </p>
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.partner_map_geocode_api_enabled ?? true}
              onChange={(e) =>
                toggleSetting("partner_map_geocode_api_enabled", e.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            주소 지도 API 활성화
          </label>
          {(settings.partner_map_geocode_api_enabled ?? true) && (
            <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">주소 지도 API 제공자</p>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.partner_map_geocode_naver_enabled ?? true}
                  onChange={(e) =>
                    toggleSetting("partner_map_geocode_naver_enabled", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                네이버 지도 API
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.partner_map_geocode_nominatim_enabled ?? true}
                  onChange={(e) =>
                    toggleSetting("partner_map_geocode_nominatim_enabled", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                OpenStreetMap (보조)
              </label>
            </div>
          )}
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="메인 화면 지도">
        <p className="text-sm text-gray-600">
          카테고리·지역 검색 아래, 제휴 목록 위에 제휴 업체 위치 지도를 표시합니다. 좌표가
          등록된 업체만 마커로 표시됩니다.
        </p>
        <div className="mt-4 space-y-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.main_partner_map_enabled ?? false}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  main_partner_map_enabled: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            메인 화면 지도 표시
          </label>
          {(settings.main_partner_map_enabled ?? false) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
                지도 제목
                <input
                  value={settings.main_partner_map_title ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      main_partner_map_title: e.target.value.trim() ? e.target.value : null,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={settings.main_partner_map_default_expanded ?? true}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      main_partner_map_default_expanded: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                처음 들어왔을 때 지도 펼침
              </label>
              <div className="rounded-xl border border-gray-200 bg-white p-4 sm:col-span-2">
                <p className="text-sm font-semibold text-gray-900">지도 위치</p>
                <p className="mt-1 text-xs text-gray-500">
                  제휴 목록 기준으로 지도를 위 또는 아래에 배치합니다.
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-700">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="main_partner_map_position"
                      checked={(settings.main_partner_map_position ?? "above_list") !== "below_list"}
                      onChange={() =>
                        setSettings((prev) => ({
                          ...prev,
                          main_partner_map_position: "above_list",
                        }))
                      }
                      className="h-4 w-4 border-gray-300 text-emerald-600"
                    />
                    목록 위
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="main_partner_map_position"
                      checked={(settings.main_partner_map_position ?? "above_list") === "below_list"}
                      onChange={() =>
                        setSettings((prev) => ({
                          ...prev,
                          main_partner_map_position: "below_list",
                        }))
                      }
                      className="h-4 w-4 border-gray-300 text-emerald-600"
                    />
                    목록 아래
                  </label>
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={settings.partner_map_locate_enabled ?? true}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      partner_map_locate_enabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                지도 「내 위치」 버튼 표시 (메인·상세)
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={settings.main_map_user_toggle_enabled ?? true}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      main_map_user_toggle_enabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                사용자 설정에서 지도 온/오프 허용
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={settings.main_category_region_user_toggle_enabled ?? true}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      main_category_region_user_toggle_enabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                사용자 설정에서 카테고리·지역 온/오프 허용
              </label>
            </div>
          )}
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="지도 마커 커스텀">
        <p className="text-sm text-gray-600">
          메인 지도 마커의 테두리, 배경, 썸네일, 상단 아이콘, 시간 표시를 설정합니다.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            마커 테두리 색상
            <input
              type="color"
              value={settings.site_map_marker_border_color ?? "#ec4899"}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  site_map_marker_border_color: e.target.value,
                }))
              }
              className="mt-1 block h-10 w-full cursor-pointer rounded-lg border border-gray-300"
            />
          </label>
          <MarkerImageUploadField
            label="마커 배경 이미지"
            value={settings.site_map_marker_bg_img}
            onChange={(url) =>
              setSettings((prev) => ({ ...prev, site_map_marker_bg_img: url }))
            }
            onMessage={onMessage}
          />
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.site_map_marker_thumbnail_enabled ?? true}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  site_map_marker_thumbnail_enabled: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            업체 썸네일 마커에 노출
          </label>
          <MarkerImageUploadField
            label="상단 마커 아이콘 이미지"
            value={settings.site_map_marker_top_icon_img}
            onChange={(url) =>
              setSettings((prev) => ({ ...prev, site_map_marker_top_icon_img: url }))
            }
            onMessage={onMessage}
          />
          <label className="block text-sm font-medium text-gray-700">
            시간 영역 아이콘 (이모지 또는 텍스트)
            <input
              value={settings.site_map_marker_time_icon ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  site_map_marker_time_icon: e.target.value.trim() || null,
                }))
              }
              placeholder="⏰"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            시간 노출 형식
            <select
              value={settings.site_map_marker_time_format ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  site_map_marker_time_format: e.target.value || null,
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            >
              <option value="">미표시</option>
              <option value="d-day">D-day</option>
              <option value="remaining-hours">남은 시간</option>
              <option value="remaining-days">남은 일수</option>
            </select>
          </label>
        </div>
      </AdminCollapsibleSection>

      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        제휴 상세·지도 설정 저장
      </button>
    </form>
  );
}
