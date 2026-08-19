"use client";

import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { resolveSiteNavBrandTitle } from "@/lib/site-nav-links";

type SiteNavBrandAdminSectionProps = {
  headerTitle: string;
  brandTitle: string | null;
  brandTitleHidden: boolean;
  brandIconHidden: boolean;
  brandChipHidden: boolean;
  titleImageUrl: string | null;
  iconUrl: string | null;
  linkUrl: string | null;
  linkRefreshEnabled: boolean;
  iconUploading: boolean;
  titleImageUploading: boolean;
  onBrandTitleChange: (value: string | null) => void;
  onBrandTitleHiddenChange: (value: boolean) => void;
  onBrandIconHiddenChange: (value: boolean) => void;
  onBrandChipHiddenChange: (value: boolean) => void;
  onUploadTitleImage: (file: File) => void;
  onClearTitleImage: () => void;
  onUploadIcon: (file: File) => void;
  onClearIcon: () => void;
  onLinkUrlChange: (value: string | null) => void;
  onLinkRefreshEnabledChange: (value: boolean) => void;
};

export default function SiteNavBrandAdminSection({
  headerTitle,
  brandTitle,
  brandTitleHidden,
  brandIconHidden,
  brandChipHidden,
  titleImageUrl,
  iconUrl,
  linkUrl,
  linkRefreshEnabled,
  iconUploading,
  titleImageUploading,
  onBrandTitleChange,
  onBrandTitleHiddenChange,
  onBrandIconHiddenChange,
  onBrandChipHiddenChange,
  onUploadTitleImage,
  onClearTitleImage,
  onUploadIcon,
  onClearIcon,
  onLinkUrlChange,
  onLinkRefreshEnabledChange,
}: SiteNavBrandAdminSectionProps) {
  const previewTitle = resolveSiteNavBrandTitle({
    brandTitle,
    brandTitleHidden,
    headerTitle,
  });
  const previewTitleImage = brandTitleHidden ? null : titleImageUrl;

  return (
    <AdminCollapsibleSection
      nested
      title="상단 브랜드 (로고 · 제목 · 링크)"
      description="상단 왼쪽에 표시되는 로고, 제목, 클릭 링크를 설정합니다. 메인 타이틀과 별도로 관리할 수 있습니다."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={brandIconHidden}
            onChange={(event) => onBrandIconHiddenChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          로고 미표시
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={brandChipHidden}
            onChange={(event) => onBrandChipHiddenChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          브랜드 배경 띠(검은색 칩) 미표시
        </label>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        로고만 숨기거나, 로고·제목을 감싸는 둥근 배경 띠만 제거할 수 있습니다.
      </p>

      <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={brandTitleHidden}
          onChange={(event) => onBrandTitleHiddenChange(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        텍스트·제목 이미지 미표시 (로고만 표시)
      </label>
      <p className="mt-1 text-xs text-gray-500">
        체크하면 상단 브랜드 영역에서 제목(글자·이미지)을 숨기고 로고만 표시합니다.
      </p>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        상단 브랜드 표시 제목 (텍스트)
        <input
          value={brandTitle ?? ""}
          onChange={(event) =>
            onBrandTitleChange(event.target.value.trim() ? event.target.value : null)
          }
          placeholder="비우면 메인 타이틀을 사용합니다"
          maxLength={80}
          disabled={brandTitleHidden || Boolean(titleImageUrl)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
        />
        <span className="mt-1 block text-xs font-normal text-gray-500">
          제목 이미지를 올리면 텍스트 대신 이미지가 표시됩니다. 이미지를 삭제하면 다시 텍스트가
          사용됩니다.
        </span>
      </label>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        상단 브랜드 표시 제목 (이미지)
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
          disabled={brandTitleHidden || titleImageUploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onUploadTitleImage(file);
            }
            event.target.value = "";
          }}
          className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
        />
      </label>
      {titleImageUploading ? <p className="mt-2 text-sm text-gray-500">제목 이미지 업로드 중...</p> : null}
      {titleImageUrl ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
          <img
            src={titleImageUrl}
            alt="상단 제목 이미지 미리보기"
            className="h-10 max-w-[220px] rounded border border-gray-200 bg-white object-contain"
          />
          <button
            type="button"
            onClick={onClearTitleImage}
            className="text-sm text-red-600 hover:underline"
          >
            제목 이미지 삭제
          </button>
        </div>
      ) : null}
      <p className="mt-1 text-xs text-gray-500">
        로고 오른쪽에 표시할 제목용 이미지입니다. PNG·JPG·WEBP·SVG를 권장합니다.
      </p>

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
        <p className="text-xs font-medium text-gray-500">메인 타이틀 (참고)</p>
        <p className="mt-1 font-medium text-gray-900">{headerTitle.trim() || "—"}</p>
        <p className="mt-2 text-xs text-gray-500">
          브랜드 제목(텍스트)을 비우면 이 메인 타이틀이 상단 브랜드에 표시됩니다. 메인 타이틀·색상은{" "}
          <strong>메인 설정 → 메인 타이틀</strong>에서 수정하세요.
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-950">
        <p className="text-xs font-medium text-emerald-800">미리보기</p>
        <div
          className={
            brandChipHidden
              ? "mt-1 inline-flex items-center gap-2 font-semibold"
              : "mt-1 inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900 px-3 py-1.5 font-semibold text-white"
          }
        >
          {!brandIconHidden ? (
            iconUrl ? (
              <img
                src={iconUrl}
                alt=""
                className="h-8 w-8 rounded border border-emerald-200 bg-white object-contain"
              />
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-emerald-600 text-xs font-bold text-white">
                H
              </span>
            )
          ) : null}
          {previewTitleImage ? (
            <img
              src={previewTitleImage}
              alt={previewTitle || "제목 이미지"}
              className="h-8 max-w-[180px] object-contain"
            />
          ) : previewTitle ? (
            <span>{previewTitle}</span>
          ) : (
            <span className={brandChipHidden ? "font-normal text-emerald-700" : "font-normal text-white/80"}>
              (제목 없음{brandIconHidden ? "" : " — 로고만"})
            </span>
          )}
        </div>
      </div>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        상단 로고 클릭 링크
        <input
          value={linkUrl ?? ""}
          onChange={(event) =>
            onLinkUrlChange(event.target.value.trim() ? event.target.value : null)
          }
          placeholder="https://www.halla.ac.kr 또는 #partner-list-anchor"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
        />
        <span className="mt-1 block text-xs font-normal text-gray-500">
          비우면 메인 타이틀 링크(
          <strong>메인 설정 → 메인 타이틀 → 클릭 URL</strong>
          )를 사용합니다.
        </span>
      </label>

      <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={linkRefreshEnabled}
          onChange={(event) => onLinkRefreshEnabledChange(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        클릭 시 페이지 새로고침
      </label>
      <p className="mt-1 text-xs text-gray-500">
        로고·제목 영역 클릭 시 현재 페이지를 새로고침합니다. 링크 URL보다 우선 적용됩니다. 드롭다운
        메뉴가 있으면 화살표 버튼으로 메뉴를 열 수 있습니다.
      </p>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        상단 로고 이미지 (첨부)
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico,.png,.jpg,.jpeg,.webp,.svg"
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
      {iconUploading ? <p className="mt-2 text-sm text-gray-500">로고 업로드 중...</p> : null}
      {iconUrl ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
          <img
            src={iconUrl}
            alt="상단 로고 미리보기"
            className="h-10 w-10 rounded border border-gray-200 bg-white object-contain"
          />
          <button
            type="button"
            onClick={onClearIcon}
            className="text-sm text-red-600 hover:underline"
          >
            로고 삭제
          </button>
        </div>
      ) : null}
      <p className="mt-1 text-xs text-gray-500">
        PNG·JPG·WEBP·SVG·ICO 이미지를 업로드하면 제목 왼쪽에 로고로 표시됩니다. 비우면 초록색 H
        아이콘이 표시됩니다.
      </p>
    </AdminCollapsibleSection>
  );
}
