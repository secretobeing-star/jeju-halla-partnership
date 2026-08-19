"use client";

import SiteNavMenuItemIcon from "@/components/SiteNavMenuItemIcon";
import { createSiteNavLinkItem, type SiteNavLinkItem } from "@/lib/site-nav-links";

type SiteNavLinksListEditorProps = {
  items: SiteNavLinkItem[];
  onItemsChange: (items: SiteNavLinkItem[]) => void;
  emptyMessage?: string;
  linkHint?: string;
  onUploadIcon?: (index: number, file: File) => Promise<void>;
  uploadingIndex?: number | null;
  onUploadImage?: (index: number, file: File) => Promise<void>;
  uploadingImageIndex?: number | null;
};

export default function SiteNavLinksListEditor({
  items,
  onItemsChange,
  emptyMessage = "등록된 메뉴가 없습니다. 아래 버튼으로 메뉴를 추가해 주세요.",
  linkHint = "페이지 안 이동은 #partner-list-anchor, 게시판 팝업은 #board-popup, 선물함은 #gift-inbox, 보관함은 #frame-inventory 을 사용하세요.",
  onUploadIcon,
  uploadingIndex = null,
  onUploadImage,
  uploadingImageIndex = null,
}: SiteNavLinksListEditorProps) {
  function updateItem(index: number, patch: Partial<SiteNavLinkItem>) {
    onItemsChange(
      items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const next = { ...item, ...patch };
        if ("href" in patch) {
          const href = patch.href?.trim() ?? "";
          next.href = href;
          if (patch.external == null) {
            next.external =
              href.startsWith("http://") ||
              href.startsWith("https://") ||
              href.startsWith("//");
          }
        }

        return next;
      }),
    );
  }

  function addItem() {
    if (items.length >= 12) {
      return;
    }

    onItemsChange([
      ...items,
      createSiteNavLinkItem({
        label: "새 메뉴",
        href: "#",
      }),
    ]);
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
    <>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-500">
            {emptyMessage}
          </p>
        ) : null}

        {items.map((item, index) => (
          <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-700">메뉴 {index + 1}</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(event) => updateItem(index, { enabled: event.target.checked })}
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
              메뉴 이름
              <input
                value={item.label}
                onChange={(event) => updateItem(index, { label: event.target.value })}
                maxLength={30}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>

            <label className="mt-3 block text-sm font-medium text-gray-700">
              링크
              <input
                value={item.href}
                onChange={(event) => updateItem(index, { href: event.target.value })}
                placeholder="https://www.halla.ac.kr 또는 #gift-inbox"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
              <span className="mt-1 block text-xs font-normal text-gray-500">{linkHint}</span>
            </label>

            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-700">메뉴 이미지 (선택)</p>
              <p className="mt-1 text-xs text-gray-500">
                상단 가로 메뉴에 표시할 배너형 이미지입니다. 넣으면 아이콘 대신 이미지가 우선
                표시됩니다.
              </p>
              <label className="mt-3 block text-sm font-medium text-gray-700">
                이미지 URL
                <input
                  value={item.image_url ?? ""}
                  onChange={(event) =>
                    updateItem(index, {
                      image_url: event.target.value.trim() ? event.target.value : null,
                    })
                  }
                  placeholder="https://..."
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              {onUploadImage ? (
                <label className="mt-3 block text-sm font-medium text-gray-700">
                  이미지 업로드
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
                    disabled={uploadingImageIndex === index}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void onUploadImage(index, file);
                      }
                      event.target.value = "";
                    }}
                    className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
                  />
                </label>
              ) : null}
              {uploadingImageIndex === index ? (
                <p className="mt-2 text-xs text-gray-500">메뉴 이미지 업로드 중...</p>
              ) : null}
              {item.image_url ? (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={item.image_url}
                    alt=""
                    className="h-10 max-w-[10rem] rounded-md border border-gray-200 bg-white object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => updateItem(index, { image_url: null })}
                    className="text-sm text-red-600 hover:underline"
                  >
                    이미지 삭제
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-700">메뉴 아이콘 (이미지 · 선택)</p>
              <p className="mt-1 text-xs text-gray-500">
                드롭다운·상단 가로 메뉴 항목 옆에만 표시됩니다. 제목 pill 왼쪽 브랜드 로고와는
                별도입니다.
              </p>
              <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <SiteNavMenuItemIcon
                  iconUrl={item.icon_url}
                  label={item.label}
                  href={item.href}
                  className="site-nav-menu-item-icon"
                  imageClassName="site-nav-menu-item-icon__image"
                  fallbackClassName="site-nav-menu-item-icon__fallback"
                />
                <span className="truncate text-sm font-medium text-gray-800">{item.label}</span>
                <span className="text-xs text-gray-400">미리보기</span>
              </div>
              <label className="mt-3 block text-sm font-medium text-gray-700">
                아이콘 URL
                <input
                  value={item.icon_url ?? ""}
                  onChange={(event) =>
                    updateItem(index, {
                      icon_url: event.target.value.trim() ? event.target.value : null,
                    })
                  }
                  placeholder="https://..."
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              {onUploadIcon ? (
                <label className="mt-3 block text-sm font-medium text-gray-700">
                  아이콘 업로드
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
                    disabled={uploadingIndex === index}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void onUploadIcon(index, file);
                      }
                      event.target.value = "";
                    }}
                    className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
                  />
                </label>
              ) : null}
              {uploadingIndex === index ? (
                <p className="mt-2 text-xs text-gray-500">아이콘 업로드 중...</p>
              ) : null}
              {item.icon_url ? (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={item.icon_url}
                    alt=""
                    className="h-8 w-8 rounded-md border border-gray-200 bg-white object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => updateItem(index, { icon_url: null })}
                    className="text-sm text-red-600 hover:underline"
                  >
                    아이콘 삭제
                  </button>
                </div>
              ) : null}
            </div>

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={item.external}
                onChange={(event) => updateItem(index, { external: event.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              새 탭에서 열기 (외부 링크)
            </label>

            <label className="mt-3 block text-sm font-medium text-gray-700">
              호버·탭 힌트 문구
              <input
                value={item.hint ?? ""}
                onChange={(event) =>
                  updateItem(index, {
                    hint: event.target.value.trim() ? event.target.value : null,
                  })
                }
                maxLength={60}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
              <span className="mt-1 block text-xs font-normal text-gray-500">
                PC 마우스 올리거나 스마트폰 탭 시 메뉴 위에 표시됩니다. 비우면 메뉴 이름을 사용합니다.
              </span>
            </label>

            <label className="mt-3 block text-sm font-medium text-gray-700">
              클릭 알림 문구
              <input
                value={item.notify_message ?? ""}
                onChange={(event) =>
                  updateItem(index, {
                    notify_message: event.target.value.trim() ? event.target.value : null,
                  })
                }
                maxLength={80}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
              <span className="mt-1 block text-xs font-normal text-gray-500">
                탭·클릭 시 화면 하단 토스트로 잠깐 표시됩니다. 비우면 기본 문구를 사용합니다.
              </span>
            </label>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        disabled={items.length >= 12}
        className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        메뉴 추가
      </button>
    </>
  );
}
