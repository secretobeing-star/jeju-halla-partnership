"use client";

import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import SiteNavLinksListEditor from "@/components/admin/SiteNavLinksListEditor";
import {
  DEFAULT_SITE_NAV_SEARCH_PLACEHOLDER,
  type SiteNavLinkItem,
} from "@/lib/site-nav-links";

type SiteNavLinksAdminPanelProps = {
  enabled: boolean;
  hintsEnabled: boolean;
  notifyEnabled: boolean;
  floatingChipsUserToggleEnabled?: boolean;
  searchPlaceholder: string | null;
  items: SiteNavLinkItem[];
  onEnabledChange: (enabled: boolean) => void;
  onHintsEnabledChange: (enabled: boolean) => void;
  onNotifyEnabledChange: (enabled: boolean) => void;
  onFloatingChipsUserToggleEnabledChange?: (enabled: boolean) => void;
  onSearchPlaceholderChange: (value: string | null) => void;
  onItemsChange: (items: SiteNavLinkItem[]) => void;
  onUploadIcon?: (index: number, file: File) => Promise<void>;
  uploadingIndex?: number | null;
  onUploadImage?: (index: number, file: File) => Promise<void>;
  uploadingImageIndex?: number | null;
};

export default function SiteNavLinksAdminPanel({
  enabled,
  hintsEnabled,
  notifyEnabled,
  floatingChipsUserToggleEnabled = true,
  searchPlaceholder,
  items,
  onEnabledChange,
  onHintsEnabledChange,
  onNotifyEnabledChange,
  onFloatingChipsUserToggleEnabledChange,
  onSearchPlaceholderChange,
  onItemsChange,
  onUploadIcon,
  uploadingIndex = null,
  onUploadImage,
  uploadingImageIndex = null,
}: SiteNavLinksAdminPanelProps) {
  return (
    <AdminCollapsibleSection
      nested
      title="상단 메뉴 / 검색창"
      description="메인 상단 2줄 헤더의 가로 메뉴와 우측 제휴 검색창을 설정합니다."
      headerActions={
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          메인에 표시
        </label>
      }
    >
      <label className="mt-0 block text-sm font-medium text-gray-700">
        검색창 안내 문구
        <input
          value={searchPlaceholder ?? ""}
          onChange={(event) =>
            onSearchPlaceholderChange(event.target.value.trim() ? event.target.value : null)
          }
          placeholder={DEFAULT_SITE_NAV_SEARCH_PLACEHOLDER}
          maxLength={80}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
        />
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={hintsEnabled}
            onChange={(event) => onHintsEnabledChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          호버·탭 힌트 표시
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={notifyEnabled}
            onChange={(event) => onNotifyEnabledChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          클릭 알림(토스트) 표시
        </label>
        {onFloatingChipsUserToggleEnabledChange ? (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={floatingChipsUserToggleEnabled}
              onChange={(event) =>
                onFloatingChipsUserToggleEnabledChange(event.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            사용자 설정에서 상단 메뉴 변경(pill) 온/오프 허용
          </label>
        ) : null}
      </div>

      <div className="mt-4">
        <SiteNavLinksListEditor
          items={items}
          onItemsChange={onItemsChange}
          onUploadIcon={onUploadIcon}
          uploadingIndex={uploadingIndex}
          onUploadImage={onUploadImage}
          uploadingImageIndex={uploadingImageIndex}
        />
      </div>
    </AdminCollapsibleSection>
  );
}
