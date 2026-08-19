"use client";

import { FormEvent, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { formatSiteSettingsSaveError } from "@/lib/site-settings-save-error";
import {
  DEFAULT_PARTNER_BENEFIT_BOX_BG_COLOR,
  DEFAULT_PARTNER_BENEFIT_BOX_BORDER_COLOR,
  getPartnerBenefitBoxStyles,
} from "@/lib/partner-benefit-box-style";
import { SiteSettings } from "@/lib/supabase";

type BenefitAdminPanelProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  saveSettings: (next: SiteSettings) => Promise<{ error: { message: string } | null }>;
  onMessage: (message: string) => void;
};

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  const colorValue = value || fallback;

  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={colorValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-gray-300 bg-white p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500"
        />
      </div>
    </label>
  );
}

export default function BenefitAdminPanel({
  settings,
  setSettings,
  saveSettings,
  onMessage,
}: BenefitAdminPanelProps) {
  const [saving, setSaving] = useState(false);
  const [previewText, setPreviewText] = useState("");

  const previewStyles = getPartnerBenefitBoxStyles(
    settings.partner_benefit_box_bg_color,
    settings.partner_benefit_box_border_color,
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onMessage("");

    const { error } = await saveSettings(settings);
    onMessage(
      error ? formatSiteSettingsSaveError(error.message) : "혜택 설정이 저장되었습니다.",
    );
    setSaving(false);
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6" data-admin-primary-form>
      <AdminCollapsibleSection
        title="혜택 박스 높이"
        description="메인 제휴업체 카드의 혜택 영역 최소 높이(px)입니다. 80~600px 범위에서 설정할 수 있습니다."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            모바일 (px)
            <input
              type="number"
              min={80}
              max={600}
              step={1}
              value={settings.partner_benefit_min_height_mobile ?? 150}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partner_benefit_min_height_mobile: Number(e.target.value),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            PC (px)
            <input
              type="number"
              min={80}
              max={600}
              step={1}
              value={settings.partner_benefit_min_height_desktop ?? 200}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  partner_benefit_min_height_desktop: Number(e.target.value),
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="혜택 박스 색상"
        description="메인 제휴업체 카드의 혜택 박스 배경색과 왼쪽 강조선 색상을 설정합니다."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField
            label="배경색"
            value={settings.partner_benefit_box_bg_color ?? ""}
            fallback={DEFAULT_PARTNER_BENEFIT_BOX_BG_COLOR}
            onChange={(value) =>
              setSettings((prev) => ({
                ...prev,
                partner_benefit_box_bg_color: value,
              }))
            }
          />
          <ColorField
            label="왼쪽 강조선 색상"
            value={settings.partner_benefit_box_border_color ?? ""}
            fallback={DEFAULT_PARTNER_BENEFIT_BOX_BORDER_COLOR}
            onChange={(value) =>
              setSettings((prev) => ({
                ...prev,
                partner_benefit_box_border_color: value,
              }))
            }
          />
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-700" htmlFor="benefit-box-preview">
            미리보기
          </label>
          <textarea
            id="benefit-box-preview"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="혜택 내용을 입력해 색상과 높이를 확인하세요."
            rows={4}
            className="partner-benefit-box mt-2 w-full max-w-md resize-y border-l-4 px-3 py-2.5 text-xs leading-relaxed whitespace-pre-line text-gray-800 outline-none focus:ring-2 focus:ring-emerald-300 sm:text-sm"
            style={{
              ...previewStyles,
              ["--partner-benefit-min-h-mobile" as string]: `${settings.partner_benefit_min_height_mobile ?? 150}px`,
              ["--partner-benefit-min-h-desktop" as string]: `${settings.partner_benefit_min_height_desktop ?? 200}px`,
            }}
          />
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="영업 정보 접기/펼치기"
        description="제휴 카드의 영업시간·휴무일 등 영업 정보가 길 때 접기/펼치기 버튼이 표시됩니다. 메인 화면에 처음 들어왔을 때의 기본 상태를 설정합니다."
      >
        <div className="flex flex-wrap gap-4 text-sm text-gray-700">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="partner_business_info_default_expanded"
              checked={!(settings.partner_business_info_default_expanded ?? false)}
              onChange={() =>
                setSettings((prev) => ({
                  ...prev,
                  partner_business_info_default_expanded: false,
                }))
              }
              className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            접힌 상태 (2줄까지만 표시)
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="partner_business_info_default_expanded"
              checked={settings.partner_business_info_default_expanded ?? false}
              onChange={() =>
                setSettings((prev) => ({
                  ...prev,
                  partner_business_info_default_expanded: true,
                }))
              }
              className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            펼친 상태 (전체 표시)
          </label>
        </div>
      </AdminCollapsibleSection>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving ? "저장 중..." : "혜택 설정 저장"}
      </button>
    </form>
  );
}
