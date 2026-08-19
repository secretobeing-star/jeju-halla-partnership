"use client";

import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import SiteNavLinksListEditor from "@/components/admin/SiteNavLinksListEditor";
import type { SiteNavLinkItem } from "@/lib/site-nav-links";

type SiteNavDropdownLinksAdminPanelProps = {
  enabled: boolean;
  items: SiteNavLinkItem[];
  onEnabledChange: (enabled: boolean) => void;
  onItemsChange: (items: SiteNavLinkItem[]) => void;
  onUploadIcon?: (index: number, file: File) => Promise<void>;
  uploadingIndex?: number | null;
  onUploadImage?: (index: number, file: File) => Promise<void>;
  uploadingImageIndex?: number | null;
};

export default function SiteNavDropdownLinksAdminPanel({
  enabled,
  items,
  onEnabledChange,
  onItemsChange,
  onUploadIcon,
  uploadingIndex = null,
  onUploadImage,
  uploadingImageIndex = null,
}: SiteNavDropdownLinksAdminPanelProps) {
  return (
    <AdminCollapsibleSection
      nested
      title="제목 드롭다운 메뉴"
      description="메인 상단 제목 옆 화살표를 눌렀을 때 펼쳐지는 목록입니다. 상단 가로 메뉴와 별도로 관리할 수 있습니다."
      headerActions={
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          드롭다운 사용
        </label>
      }
    >
      <p className="text-xs text-gray-500">
        메뉴를 비워 두면 상단 가로 메뉴와 동일한 목록이 표시됩니다. 항목을 추가하면
        드롭다운만 따로 관리됩니다.
      </p>

      <div className="mt-4">
        <SiteNavLinksListEditor
          items={items}
          onItemsChange={onItemsChange}
          onUploadIcon={onUploadIcon}
          uploadingIndex={uploadingIndex}
          onUploadImage={onUploadImage}
          uploadingImageIndex={uploadingImageIndex}
          emptyMessage="드롭다운 전용 메뉴가 없습니다. 비어 있으면 상단 가로 메뉴를 그대로 사용합니다."
          linkHint="다른 홈페이지 URL, #partner-list-anchor, #board-popup, #gift-inbox, #frame-inventory 등을 입력할 수 있습니다."
        />
      </div>
    </AdminCollapsibleSection>
  );
}
