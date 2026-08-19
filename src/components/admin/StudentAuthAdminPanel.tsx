"use client";

import { useMemo } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import {
  DEFAULT_STUDENT_UI_LABELS,
  getEditableSiteStudentUiLabels,
  normalizeCustomFields,
  normalizeHiddenFormFields,
  serializeSiteStudentUiLabels,
  STUDENT_CHROME_LABEL_META,
  STUDENT_FORM_FIELD_META,
  type SiteStudentCustomField,
  type SiteStudentFormFieldKey,
  type SiteStudentUiLabels,
} from "@/lib/site-student-auth-settings";
import { SiteSettings } from "@/lib/supabase";

type StudentAuthAdminPanelProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  guideImageUploading?: boolean;
  onGuideImageUpload?: (file: File) => void | Promise<void>;
  onClearGuideImage?: () => void | Promise<void>;
};

function createCustomFieldId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function StudentAuthAdminPanel({
  settings,
  setSettings,
  guideImageUploading = false,
  onGuideImageUpload,
  onClearGuideImage,
}: StudentAuthAdminPanelProps) {
  const editableLabels = useMemo(
    () => getEditableSiteStudentUiLabels(settings.site_student_ui_labels),
    [settings.site_student_ui_labels],
  );
  const hiddenFormFields = useMemo(
    () => normalizeHiddenFormFields(settings.site_student_ui_labels),
    [settings.site_student_ui_labels],
  );
  const customFields = useMemo(
    () => normalizeCustomFields(settings.site_student_ui_labels),
    [settings.site_student_ui_labels],
  );

  function commitLabels(next: {
    labels?: Record<keyof SiteStudentUiLabels, string>;
    hiddenFormFields?: SiteStudentFormFieldKey[];
    customFields?: SiteStudentCustomField[];
  }) {
    setSettings((prev) => ({
      ...prev,
      site_student_ui_labels: serializeSiteStudentUiLabels({
        labels: next.labels ?? editableLabels,
        hiddenFormFields: next.hiddenFormFields ?? hiddenFormFields,
        customFields: next.customFields ?? customFields,
      }),
    }));
  }

  function updateLabel(key: keyof SiteStudentUiLabels, value: string) {
    commitLabels({ labels: { ...editableLabels, [key]: value } });
  }

  function resetLabel(key: keyof SiteStudentUiLabels) {
    commitLabels({ labels: { ...editableLabels, [key]: "" } });
  }

  function hideFormField(key: SiteStudentFormFieldKey) {
    if (STUDENT_FORM_FIELD_META.find((item) => item.key === key)?.required) {
      return;
    }
    if (hiddenFormFields.includes(key)) {
      return;
    }
    commitLabels({ hiddenFormFields: [...hiddenFormFields, key] });
  }

  function restoreFormField(key: SiteStudentFormFieldKey) {
    commitLabels({
      hiddenFormFields: hiddenFormFields.filter((item) => item !== key),
    });
  }

  function updateCustomField(id: string, label: string) {
    commitLabels({
      customFields: customFields.map((field) =>
        field.id === id ? { ...field, label } : field,
      ),
    });
  }

  function removeCustomField(id: string) {
    commitLabels({
      customFields: customFields.filter((field) => field.id !== id),
    });
  }

  function addCustomField() {
    commitLabels({
      customFields: [...customFields, { id: createCustomFieldId(), label: "" }],
    });
  }

  const visibleFormFields = STUDENT_FORM_FIELD_META.filter(
    (field) => !hiddenFormFields.includes(field.key),
  );
  const deletedFormFields = STUDENT_FORM_FIELD_META.filter((field) =>
    hiddenFormFields.includes(field.key),
  );

  return (
    <>
      <AdminCollapsibleSection
        title="학생증 · 진입"
        description="로그인과 함께 쓰는 학생증 아이콘·PWA 스와이프를 설정합니다."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.site_student_id_enabled ?? false}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, site_student_id_enabled: e.target.checked }))
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            학생증 기능 사용
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.site_student_id_pwa_swipe_enabled ?? true}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  site_student_id_pwa_swipe_enabled: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            PWA에서 하단 스와이프(삼성페이 방식)로 열기
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium text-gray-700">
          학생증 카드 제목
          <input
            value={settings.site_student_id_card_title ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_student_id_card_title: e.target.value.trim() ? e.target.value : null,
              }))
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-gray-700">
          로그인 창 인증 버튼 문구
          <input
            value={settings.site_student_auth_button_label ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_student_auth_button_label: e.target.value.trim() ? e.target.value : null,
              }))
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="인증 안내 모달"
        description="로그인 창의 인증 버튼 확인 전에 보여주는 안내입니다."
      >
        <label className="block text-sm font-medium text-gray-700">
          안내 제목
          <input
            value={settings.site_student_auth_guide_title ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_student_auth_guide_title: e.target.value.trim() ? e.target.value : null,
              }))
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-gray-700">
          안내 본문
          <textarea
            value={settings.site_student_auth_guide_body ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_student_auth_guide_body: e.target.value.trim() ? e.target.value : null,
              }))
            }
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-gray-700">
          안내 이미지
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={guideImageUploading || !onGuideImageUpload}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onGuideImageUpload) {
                void onGuideImageUpload(file);
              }
              e.target.value = "";
            }}
            className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
          />
        </label>
        {guideImageUploading ? (
          <p className="mt-2 text-sm text-gray-500">이미지 업로드 중...</p>
        ) : null}
        {settings.site_student_auth_guide_image_url ? (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <img
              src={settings.site_student_auth_guide_image_url}
              alt="인증 안내 미리보기"
              className="h-16 w-auto max-w-[12rem] rounded-lg object-contain"
            />
            {onClearGuideImage ? (
              <button
                type="button"
                onClick={() => void onClearGuideImage()}
                className="text-sm text-red-600 hover:underline"
              >
                이미지 삭제
              </button>
            ) : null}
          </div>
        ) : null}
        <label className="mt-4 block text-sm font-medium text-gray-700">
          승인 대기 안내 문구
          <textarea
            value={settings.site_student_pending_message ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_student_pending_message: e.target.value.trim() ? e.target.value : null,
              }))
            }
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="정보 기입 · 학생증 문구"
        description="제목을 직접 수정·초기화하고, 정보 기입 항목은 추가·삭제할 수 있습니다. 비우면 기본 문구가 사용됩니다."
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-800">창 · 버튼 · 학생증 문구</p>
            {STUDENT_CHROME_LABEL_META.map((field) => {
              const current = editableLabels[field.key];
              const effective = current.trim() || DEFAULT_STUDENT_UI_LABELS[field.key];
              return (
                <div
                  key={field.key}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-700">{field.adminLabel}</p>
                    <button
                      type="button"
                      onClick={() => resetLabel(field.key)}
                      disabled={!current.trim()}
                      className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      초기화
                    </button>
                  </div>
                  <input
                    value={current}
                    onChange={(e) => updateLabel(field.key, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                  {!current.trim() ? (
                    <p className="mt-1 text-xs text-gray-500">기본값: {effective}</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-800">정보 기입 항목</p>
              <p className="mt-1 text-xs text-gray-500">
                학번·이름은 필수입니다. 그 외 항목은 삭제 후 아래에서 다시 넣을 수 있고, 목록
                추가로 직접 항목을 만들 수 있습니다.
              </p>
            </div>

            {visibleFormFields.map((field) => {
              const current = editableLabels[field.key];
              const effective = current.trim() || DEFAULT_STUDENT_UI_LABELS[field.key];
              return (
                <div
                  key={field.key}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-700">
                      {field.adminLabel}
                      {field.required ? (
                        <span className="ml-2 text-xs font-normal text-emerald-700">필수</span>
                      ) : null}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => resetLabel(field.key)}
                        disabled={!current.trim()}
                        className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        초기화
                      </button>
                      {!field.required ? (
                        <button
                          type="button"
                          onClick={() => hideFormField(field.key)}
                          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                        >
                          삭제
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <input
                    value={current}
                    onChange={(e) => updateLabel(field.key, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                  {!current.trim() ? (
                    <p className="mt-1 text-xs text-gray-500">기본값: {effective}</p>
                  ) : null}
                </div>
              );
            })}

            {customFields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-700">추가 항목 {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeCustomField(field.id)}
                    className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    삭제
                  </button>
                </div>
                <input
                  value={field.label}
                  onChange={(e) => updateCustomField(field.id, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addCustomField}
              className="rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-emerald-400 hover:text-emerald-700"
            >
              목록 추가
            </button>

            {deletedFormFields.length > 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">삭제한 기본 항목</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {deletedFormFields.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => restoreFormField(field.key)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-400 hover:text-emerald-700"
                    >
                      {field.adminLabel} 다시 넣기
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="구글 시트 연동"
        description="서비스 계정 키는 Vercel 환경 변수에 두고, 스프레드시트 ID·탭 이름은 여기서 설정합니다."
      >
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          환경 변수: <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code>,{" "}
          <code>GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</code>. 비밀번호가 아니라 서비스 계정
          private_key입니다. 시트를 서비스 계정 이메일에 편집 권한으로 공유하세요.
        </p>
        <label className="mt-4 block text-sm font-medium text-gray-700">
          스프레드시트 ID
          <input
            value={settings.site_student_sheets_spreadsheet_id ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                site_student_sheets_spreadsheet_id: e.target.value.trim() ? e.target.value : null,
              }))
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500"
          />
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            신청 로그 탭 이름
            <input
              value={settings.site_student_sheets_log_tab ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  site_student_sheets_log_tab: e.target.value.trim() ? e.target.value : null,
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              placeholder="사용자_로그"
            />
            <span className="mt-1 block text-xs font-normal text-gray-500">
              비우면 기본값 <code>사용자_로그</code>
            </span>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            승인 탭 이름
            <input
              value={settings.site_student_sheets_approval_tab ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  site_student_sheets_approval_tab: e.target.value.trim() ? e.target.value : null,
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              placeholder="승인"
            />
            <span className="mt-1 block text-xs font-normal text-gray-500">
              비우면 기본값 <code>승인</code>
            </span>
          </label>
        </div>
      </AdminCollapsibleSection>
    </>
  );
}
