"use client";

import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { SiteSettings } from "@/lib/supabase";

type StudentSheetsAdminPanelProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
};

export default function StudentSheetsAdminPanel({
  settings,
  setSettings,
}: StudentSheetsAdminPanelProps) {
  return (
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
  );
}
