"use client";

import { useRef } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { SiteSettings } from "@/lib/supabase";

type StudentCardBrandAdminPanelProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  schoolLogoUploading?: boolean;
  centerImageUploading?: boolean;
  backgroundUploading?: boolean;
  onSchoolLogoUpload?: (file: File) => void | Promise<void>;
  onClearSchoolLogo?: () => void | Promise<void>;
  onCenterImageUpload?: (file: File) => void | Promise<void>;
  onClearCenterImage?: () => void | Promise<void>;
  onBackgroundUpload?: (file: File) => void | Promise<void>;
  onClearBackground?: () => void | Promise<void>;
};

export default function StudentCardBrandAdminPanel({
  settings,
  setSettings,
  schoolLogoUploading = false,
  centerImageUploading = false,
  backgroundUploading = false,
  onSchoolLogoUpload,
  onClearSchoolLogo,
  onCenterImageUpload,
  onClearCenterImage,
  onBackgroundUpload,
  onClearBackground,
}: StudentCardBrandAdminPanelProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const centerInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const opacity = (() => {
    const raw = settings.site_student_card_center_image_opacity;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) {
      return 0.28;
    }
    return Math.min(1, Math.max(0, n));
  })();
  const backgroundOpacity = (() => {
    const raw = settings.site_student_card_background_opacity;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) {
      return 0.45;
    }
    return Math.min(1, Math.max(0, n));
  })();

  return (
    <AdminCollapsibleSection
      title="학생증 · 카드 브랜딩"
      description="학교 로고·이름, 카드 뒷배경, 중앙 장식 이미지는 관리자에서만 설정합니다. 학생 화면의 꾸미기에서는 보이지 않습니다."
    >
      <p className="mb-3 text-xs text-gray-500">
        저장 전 Supabase에서{" "}
        <code className="rounded bg-gray-100 px-1">supabase/site-student-card-brand.sql</code> 을
        실행해 주세요.
      </p>
      <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600">
        <p className="font-semibold text-gray-800">학생증 · 사진 규격 (참고)</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>카드: ISO ID-1 비율 1.586 · 실물 약 8.56×5.40cm · 화면 약 384×242px</li>
          <li>사진: 3.5×4.5cm (비율 3.5/4.5) · 설정 미리보기 56×72px · 인쇄 300dpi 약 413×531px</li>
          <li>뒷배경: 카드 전체 cover · 중앙 장식은 카드 중앙 약 58% 폭</li>
        </ul>
      </div>

      <label className="block text-sm font-medium text-gray-700">
        학교 이름
        <input
          value={settings.site_student_card_school_name ?? ""}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              site_student_card_school_name: e.target.value.trim() ? e.target.value : null,
            }))
          }
          placeholder="예: 제주한라대학교"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
        />
      </label>

      <div className="mt-4">
        <p className="text-sm font-medium text-gray-700">학교 로고</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            disabled={schoolLogoUploading || !onSchoolLogoUpload}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onSchoolLogoUpload) {
                void onSchoolLogoUpload(file);
              }
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={schoolLogoUploading || !onSchoolLogoUpload}
            onClick={() => logoInputRef.current?.click()}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
          >
            {schoolLogoUploading ? "업로드 중..." : "로고 업로드"}
          </button>
          {settings.site_student_card_school_logo_url ? (
            <>
              <div className="h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-white">
                <img
                  src={settings.site_student_card_school_logo_url}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
              <button
                type="button"
                onClick={() => void onClearSchoolLogo?.()}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                로고 삭제
              </button>
            </>
          ) : null}
        </div>
        <label className="mt-2 block text-xs text-gray-500">
          또는 URL
          <input
            value={settings.site_student_card_school_logo_url ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_student_card_school_logo_url: e.target.value.trim() || null,
              }))
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </label>
      </div>

      <div className="mt-5 border-t border-gray-100 pt-4">
        <p className="text-sm font-medium text-gray-700">카드 뒷배경</p>
        <p className="mt-1 text-xs text-gray-500">
          학생증 카드 전체에 깔리는 배경 사진입니다. 투명도로 세기 조절이 가능합니다.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            disabled={backgroundUploading || !onBackgroundUpload}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onBackgroundUpload) {
                void onBackgroundUpload(file);
              }
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={backgroundUploading || !onBackgroundUpload}
            onClick={() => backgroundInputRef.current?.click()}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
          >
            {backgroundUploading ? "업로드 중..." : "뒷배경 업로드"}
          </button>
          {settings.site_student_card_background_url ? (
            <>
              <div className="h-14 w-20 overflow-hidden rounded-lg border border-gray-200 bg-white">
                <img
                  src={settings.site_student_card_background_url}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{ opacity: backgroundOpacity }}
                />
              </div>
              <button
                type="button"
                onClick={() => void onClearBackground?.()}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                뒷배경 삭제
              </button>
            </>
          ) : null}
        </div>
        <label className="mt-2 block text-xs text-gray-500">
          또는 URL
          <input
            value={settings.site_student_card_background_url ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_student_card_background_url: e.target.value.trim() || null,
              }))
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-gray-700">
          뒷배경 투명도 ({Math.round(backgroundOpacity * 100)}%)
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={backgroundOpacity}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_student_card_background_opacity: Number(e.target.value),
              }))
            }
            className="mt-2 w-full"
          />
        </label>
      </div>

      <div className="mt-5 border-t border-gray-100 pt-4">
        <p className="text-sm font-medium text-gray-700">카드 중앙 이미지</p>
        <p className="mt-1 text-xs text-gray-500">
          학생증 가운데에 깔리는 장식 이미지입니다. 투명도로 세기 조절이 가능합니다.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input
            ref={centerInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            disabled={centerImageUploading || !onCenterImageUpload}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onCenterImageUpload) {
                void onCenterImageUpload(file);
              }
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={centerImageUploading || !onCenterImageUpload}
            onClick={() => centerInputRef.current?.click()}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
          >
            {centerImageUploading ? "업로드 중..." : "중앙 이미지 업로드"}
          </button>
          {settings.site_student_card_center_image_url ? (
            <>
              <div className="h-14 w-20 overflow-hidden rounded-lg border border-gray-200 bg-white">
                <img
                  src={settings.site_student_card_center_image_url}
                  alt=""
                  className="h-full w-full object-contain"
                  style={{ opacity }}
                />
              </div>
              <button
                type="button"
                onClick={() => void onClearCenterImage?.()}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                이미지 삭제
              </button>
            </>
          ) : null}
        </div>
        <label className="mt-2 block text-xs text-gray-500">
          또는 URL
          <input
            value={settings.site_student_card_center_image_url ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_student_card_center_image_url: e.target.value.trim() || null,
              }))
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-gray-700">
          중앙 이미지 투명도 ({Math.round(opacity * 100)}%)
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={opacity}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_student_card_center_image_opacity: Number(e.target.value),
              }))
            }
            className="mt-2 w-full"
          />
        </label>
      </div>
    </AdminCollapsibleSection>
  );
}
