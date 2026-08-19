"use client";

import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import {
  createSiteNoticeItem,
  DEFAULT_NOTICE_CAROUSEL_AUTO_INTERVAL_SECONDS,
  DEFAULT_SITE_NOTICE_BADGE_LABEL,
  MAX_NOTICE_CAROUSEL_AUTO_INTERVAL_SECONDS,
  MIN_NOTICE_CAROUSEL_AUTO_INTERVAL_SECONDS,
  type SiteNoticeItem,
} from "@/lib/site-notices";

type SiteNoticeFieldsProps = {
  items: SiteNoticeItem[];
  enabled: boolean;
  textColor: string | null;
  autoEnabled: boolean;
  autoIntervalSeconds: number;
  onItemsChange: (items: SiteNoticeItem[]) => void;
  onEnabledChange: (enabled: boolean) => void;
  onTextColorChange: (color: string | null) => void;
  onAutoEnabledChange: (enabled: boolean) => void;
  onAutoIntervalSecondsChange: (seconds: number) => void;
};

export default function SiteNoticeFields({
  items,
  enabled,
  textColor,
  autoEnabled,
  autoIntervalSeconds,
  onItemsChange,
  onEnabledChange,
  onTextColorChange,
  onAutoEnabledChange,
  onAutoIntervalSecondsChange,
}: SiteNoticeFieldsProps) {
  function updateItem(index: number, patch: Partial<SiteNoticeItem>) {
    onItemsChange(
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  function addItem() {
    if (items.length >= 20) {
      return;
    }

    onItemsChange([...items, createSiteNoticeItem({ text: "새 공지 문구를 입력하세요." })]);
  }

  function removeItem(index: number) {
    onItemsChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) {
      return;
    }

    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    nextItems.splice(nextIndex, 0, moved);
    onItemsChange(nextItems);
  }

  return (
    <AdminCollapsibleSection
      nested
      title="공지사항"
      description="여러 공지를 등록하면 메인 상단에서 캐러셀로 표시됩니다. 공지마다 뱃지 이름을 다르게 설정할 수 있습니다."
      headerActions={
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          메인에 표시
        </label>
      }
    >
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-700">캐러셀 재생 방식</p>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="notice-carousel-mode"
              checked={!autoEnabled}
              onChange={() => onAutoEnabledChange(false)}
              className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            수동 (화살표로 넘기기)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="notice-carousel-mode"
              checked={autoEnabled}
              onChange={() => onAutoEnabledChange(true)}
              className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            자동 (일정 시간마다 넘어감)
          </label>
        </div>
        {autoEnabled ? (
          <label className="mt-3 block max-w-xs text-sm font-medium text-gray-700">
            자동 넘김 간격 (초)
            <input
              type="number"
              min={MIN_NOTICE_CAROUSEL_AUTO_INTERVAL_SECONDS}
              max={MAX_NOTICE_CAROUSEL_AUTO_INTERVAL_SECONDS}
              value={autoIntervalSeconds}
              onChange={(e) =>
                onAutoIntervalSecondsChange(Number(e.target.value) || DEFAULT_NOTICE_CAROUSEL_AUTO_INTERVAL_SECONDS)
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
            <span className="mt-1 block text-xs font-normal text-gray-500">
              {MIN_NOTICE_CAROUSEL_AUTO_INTERVAL_SECONDS}~{MAX_NOTICE_CAROUSEL_AUTO_INTERVAL_SECONDS}초 사이로 설정할 수 있습니다. 마우스를 올리면 일시 정지됩니다.
            </span>
          </label>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-500">
            등록된 공지가 없습니다. 아래 버튼으로 공지를 추가해 주세요.
          </p>
        ) : null}

        {items.map((item, index) => (
          <div
            key={item.id}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-700">공지 {index + 1}</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) => updateItem(index, { enabled: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  표시
                </label>
                <button
                  type="button"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                >
                  삭제
                </button>
              </div>
            </div>

            <label className="block text-sm font-medium text-gray-700">
              뱃지 이름
              <input
                value={item.tag ?? ""}
                onChange={(e) => updateItem(index, { tag: e.target.value || null })}
                placeholder={DEFAULT_SITE_NOTICE_BADGE_LABEL}
                maxLength={20}
                className="mt-1 w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
              <span className="mt-1 block text-xs font-normal text-gray-500">
                메인 캐러셀 왼쪽 주황색 뱃지에 표시됩니다. 비워두면 &quot;{DEFAULT_SITE_NOTICE_BADGE_LABEL}&quot;가 사용됩니다.
              </span>
            </label>

            <label className="mt-3 block text-sm font-medium text-gray-700">
              공지 문구
              <textarea
                value={item.text}
                onChange={(e) => updateItem(index, { text: e.target.value })}
                rows={2}
                maxLength={300}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>

            <label className="mt-3 block text-sm font-medium text-gray-700">
              링크 (선택)
              <input
                type="url"
                value={item.link_url ?? ""}
                onChange={(e) => updateItem(index, { link_url: e.target.value || null })}
                placeholder="https://example.com"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        disabled={items.length >= 20}
        className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        공지 추가
      </button>

      <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-gray-200 pt-4">
        <label className="block text-sm font-medium text-gray-700">
          공지 문구 색상
          <input
            type="color"
            value={textColor ?? "#111827"}
            onChange={(e) => onTextColorChange(e.target.value)}
            className="mt-1 block h-10 w-16 cursor-pointer rounded-lg border border-gray-300"
          />
        </label>
        <button
          type="button"
          onClick={() => onTextColorChange(null)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          기본 색상
        </button>
      </div>
    </AdminCollapsibleSection>
  );
}
