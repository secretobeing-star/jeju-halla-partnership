"use client";

import { FormEvent, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { formatSiteSettingsSaveError } from "@/lib/site-settings-save-error";
import { DEFAULT_OPTIONAL_TEXT_COLOR, renderTextWithOptionalLink } from "@/lib/footer-text";
import PageBackgroundAdminSection from "@/components/admin/PageBackgroundAdminSection";
import { SiteSettings } from "@/lib/supabase";
type UserSettingsAdminPanelProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  saveSettings: (next: SiteSettings) => Promise<{ error: { message: string } | null }>;
  onMessage: (message: string) => void;
};

export default function UserSettingsAdminPanel({
  settings,
  setSettings,
  saveSettings,
  onMessage,
}: UserSettingsAdminPanelProps) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onMessage("");

    const { error } = await saveSettings(settings);
    onMessage(
      error
        ? formatSiteSettingsSaveError(error.message)
        : "설정 탭 내용이 저장되었습니다.",
    );
    setSaving(false);
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6" data-admin-primary-form>
      <AdminCollapsibleSection
        title="메인 화면 설정 패널"
        description={
          <>
            활성화 시 메인 페이지 우측 상단에 톱니바퀴(설정) 버튼이 표시됩니다. 아래에서 패널
            항목별로 켜고 끌 수 있습니다. 다크 모드·모바일 PC 모드·사이트 크기·사이트 크기 +/-
            버튼·페이지 배경은 개발자 모드 → 설정에서 관리합니다.
          </>
        }
      >
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">메인 설정 활성화</p>
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Beta
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {settings.settings_panel_enabled
                ? "메인 우측 상단에 설정 버튼이 표시됩니다."
                : "비활성화 상태입니다. 체크 후 저장하면 설정 버튼이 나타납니다."}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.settings_panel_enabled ?? false}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  settings_panel_enabled: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            {settings.settings_panel_enabled ? "활성화" : "비활성화"}
          </span>
        </label>

        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">게시판 위치 (사용자 선택)</p>
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Beta
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {settings.main_board_position_enabled
                ? "메인 설정 패널 실험실에 「게시판 위치」 항목이 표시됩니다."
                : "비활성화 시 사용자는 게시판 위치를 바꿀 수 없고, 관리자가 지정한 기본 위치가 적용됩니다."}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.main_board_position_enabled ?? false}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  main_board_position_enabled: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            {settings.main_board_position_enabled ? "활성화" : "비활성화"}
          </span>
        </label>
      </AdminCollapsibleSection>

      <PageBackgroundAdminSection
        settings={settings}
        setSettings={setSettings}
        onMessage={onMessage}
      />

      <AdminCollapsibleSection
        title="설정 패널 안내 문구"
        description="메인 설정 패널 하단에 표시됩니다. 메인 설정이 활성화된 상태에서만 보입니다. 줄바꿈을 사용할 수 있습니다."
      >
        <label className="block text-sm font-medium text-gray-700">
          안내 문구
          <textarea
            value={settings.settings_panel_notice_text ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                settings_panel_notice_text: e.target.value,
              }))
            }
            rows={6}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </label>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block text-sm font-medium text-gray-700">
            안내 문구 색상
            <input
              type="color"
              value={settings.settings_panel_notice_color ?? DEFAULT_OPTIONAL_TEXT_COLOR}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  settings_panel_notice_color: e.target.value,
                }))
              }
              className="mt-1 block h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              setSettings((prev) => ({ ...prev, settings_panel_notice_color: null }))
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            기본 색상
          </button>
        </div>
        <label className="mt-4 block text-sm font-medium text-gray-700">
          안내 문구 링크 (선택)
          <input
            type="url"
            value={settings.settings_panel_notice_url ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                settings_panel_notice_url: e.target.value,
              }))
            }
            placeholder="https://"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </label>
        <p className="mt-1 text-xs text-gray-500">
          메인 설정 패널 하단에 표시됩니다. URL을 입력하면 안내 문구를 눌러 이동할 수 있습니다.
        </p>
        {settings.settings_panel_notice_text?.trim() && (
          <p className="mt-3 text-xs text-gray-500">
            미리보기:{" "}
            <span className="text-sm">
              {renderTextWithOptionalLink(
                settings.settings_panel_notice_text,
                settings.settings_panel_notice_url,
                {
                  textColor: settings.settings_panel_notice_color,
                  linkClassName: "hover:opacity-90",
                },
              )}
            </span>
          </p>
        )}
      </AdminCollapsibleSection>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving ? "저장 중..." : "설정 저장"}
      </button>
    </form>
  );
}
