"use client";

import {
  createFooterSocialLinkItem,
  FOOTER_SOCIAL_LINKS_MAX,
  type FooterSocialLinkItem,
} from "@/lib/footer-social-links";

type FooterSocialLinksListEditorProps = {
  items: FooterSocialLinkItem[];
  onItemsChange: (items: FooterSocialLinkItem[]) => void;
  onUploadIcon?: (index: number, file: File) => Promise<void>;
  uploadingIndex?: number | null;
};

export default function FooterSocialLinksListEditor({
  items,
  onItemsChange,
  onUploadIcon,
  uploadingIndex = null,
}: FooterSocialLinksListEditorProps) {
  function updateItem(index: number, patch: Partial<FooterSocialLinkItem>) {
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
    if (items.length >= FOOTER_SOCIAL_LINKS_MAX) {
      return;
    }

    onItemsChange([
      ...items,
      createFooterSocialLinkItem({
        label: "새 링크",
        href: "https://",
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
            등록된 우측 아이콘 링크가 없습니다. 디스코드·유튜브 등 아이콘을 추가해 보세요.
          </p>
        ) : null}

        {items.map((item, index) => (
          <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-700">아이콘 링크 {index + 1}</p>
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
              이름 (접근성·툴팁)
              <input
                value={item.label}
                onChange={(event) => updateItem(index, { label: event.target.value })}
                maxLength={30}
                placeholder="디스코드"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>

            <label className="mt-3 block text-sm font-medium text-gray-700">
              링크 URL
              <input
                value={item.href}
                onChange={(event) => updateItem(index, { href: event.target.value })}
                placeholder="https://discord.gg/..."
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>

            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-700">아이콘 이미지</p>
              <p className="mt-1 text-xs text-gray-500">
                PNG·SVG 등 투명 배경 아이콘을 권장합니다. 어두운 배경에서는 밝은색 아이콘을
                사용하세요.
              </p>
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
                    className="site-footer-social-icon-preview h-8 w-8 object-contain"
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
                PC 마우스 올리거나 스마트폰 탭 시 아이콘 위에 표시됩니다. 비우면 이름을 사용합니다.
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

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={item.external}
                onChange={(event) => updateItem(index, { external: event.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              새 탭에서 열기
            </label>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        disabled={items.length >= FOOTER_SOCIAL_LINKS_MAX}
        className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        아이콘 링크 추가 (최대 {FOOTER_SOCIAL_LINKS_MAX}개)
      </button>
    </>
  );
}
