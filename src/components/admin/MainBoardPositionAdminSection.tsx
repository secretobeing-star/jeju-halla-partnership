"use client";

import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { MAIN_BOARD_POSITION_OPTIONS } from "@/lib/main-board-position";
import { SiteSettings } from "@/lib/supabase";

type MainBoardPositionAdminSectionProps = {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
};

export default function MainBoardPositionAdminSection({
  settings,
  setSettings,
}: MainBoardPositionAdminSectionProps) {
  const positionEnabled = settings.board_main_position_enabled ?? true;
  const currentPosition = settings.main_board_position_default ?? "above";

  return (
    <AdminCollapsibleSection
      title="메인 게시판 위치"
      description="메인 본문에 표시되는 게시판을 제휴 목록 위 또는 아래 중 어디에 둘지 정합니다. 「설정」 탭 또는 개발자 모드에서 사용자 선택을 켜면 메인 설정 패널에서 직접 바꿀 수 있습니다."
    >
      <div className="space-y-4">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={positionEnabled}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                board_main_position_enabled: e.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          메인 게시판 위치 설정
          <span className="text-xs text-gray-500">
            (끄면 제휴 목록 아래에 고정됩니다. 상단 메뉴 팝업 위치도 같이 적용됩니다)
          </span>
        </label>

        {positionEnabled ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            {MAIN_BOARD_POSITION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
                  currentPosition === option.value
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                <input
                  type="radio"
                  name="main_board_position_default"
                  checked={currentPosition === option.value}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      main_board_position_default: option.value,
                    }))
                  }
                  className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                {option.label}
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </AdminCollapsibleSection>
  );
}
