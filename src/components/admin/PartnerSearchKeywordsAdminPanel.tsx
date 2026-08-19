"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import {
  DEFAULT_PARTNER_SEARCH_KEYWORD_GROUPS,
  formatPartnerSearchKeywordsInput,
  getPartnerSearchKeywordGroups,
  normalizePartnerSearchKeywordGroups,
  parsePartnerSearchKeywordsInput,
  type PartnerSearchKeywordGroup,
} from "@/lib/partner-search-keywords";
import { supabase } from "@/lib/supabase";

type GroupDraft = PartnerSearchKeywordGroup & {
  keywordsInput: string;
};

function createGroupDraft(group: PartnerSearchKeywordGroup): GroupDraft {
  return {
    ...group,
    keywordsInput: formatPartnerSearchKeywordsInput(group.keywords),
  };
}

type PartnerSearchKeywordsAdminPanelProps = {
  onSaved?: () => void | Promise<void>;
};

export default function PartnerSearchKeywordsAdminPanel({
  onSaved,
}: PartnerSearchKeywordsAdminPanelProps) {
  const [groupDraft, setGroupDraft] = useState<GroupDraft[]>(
    DEFAULT_PARTNER_SEARCH_KEYWORD_GROUPS.map(createGroupDraft),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void supabase
      .from("site_settings")
      .select("partner_search_keyword_groups")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        const groups = getPartnerSearchKeywordGroups(data);
        setGroupDraft(groups.map(createGroupDraft));
      });
  }, []);

  function updateGroup(index: number, patch: Partial<GroupDraft>) {
    setGroupDraft((prev) =>
      prev.map((group, groupIndex) => (groupIndex === index ? { ...group, ...patch } : group)),
    );
  }

  function addGroup() {
    if (groupDraft.length >= 30) {
      setMessage("검색 키워드 묶음은 최대 30개까지 추가할 수 있습니다.");
      return;
    }

    setGroupDraft((prev) => [
      ...prev,
      createGroupDraft({
        id: `search-keyword-${Date.now()}`,
        trigger: "새 검색어",
        keywords: [],
      }),
    ]);
    setMessage("");
  }

  function removeGroup(index: number) {
    setGroupDraft((prev) => prev.filter((_, groupIndex) => groupIndex !== index));
    setMessage("");
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const nextGroups = normalizePartnerSearchKeywordGroups(
      groupDraft.map((group) => ({
        id: group.id,
        trigger: group.trigger.trim(),
        keywords: parsePartnerSearchKeywordsInput(group.keywordsInput),
      })),
    );

    const { error } = await supabase
      .from("site_settings")
      .update({ partner_search_keyword_groups: nextGroups })
      .eq("id", 1);

    setSaving(false);

    if (error) {
      setMessage(`저장 실패: ${error.message}`);
      return;
    }

    setGroupDraft(nextGroups.map(createGroupDraft));
    setMessage("검색 키워드 설정을 저장했습니다.");
    await onSaved?.();
  }

  function handleResetDefaults() {
    setGroupDraft(DEFAULT_PARTNER_SEARCH_KEYWORD_GROUPS.map(createGroupDraft));
    setMessage("기본 키워드로 되돌렸습니다. 저장 버튼을 눌러야 반영됩니다.");
  }

  return (
    <AdminCollapsibleSection
      title="검색 기능 확장 (커스텀)"
      description="제휴 업체 검색창에서 키워드별로 함께 찾을 단어를 직접 설정합니다."
      defaultExpanded
    >
      <form onSubmit={handleSave} className="space-y-4">
        <p className="text-sm text-gray-600">
          사용자가 검색창에 <strong>검색어</strong>를 정확히 입력하면, 아래{" "}
          <strong>함께 찾을 단어</strong>까지 넓혀서 업체명·카테고리·혜택·상세 설명·지역 등을
          검색합니다. 카테고리 이름(예: 카페 → 카페/디저트)은 별도 설정 없이 자동으로
          연결됩니다.
        </p>

        <div className="space-y-3">
          {groupDraft.map((group, index) => (
            <div
              key={group.id}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <label className="flex-1 space-y-1">
                  <span className="text-xs font-medium text-gray-700">검색어</span>
                  <input
                    type="text"
                    value={group.trigger}
                    onChange={(e) => updateGroup(index, { trigger: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    placeholder="예: 고기"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeGroup(index)}
                  className="mt-6 rounded border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  삭제
                </button>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-gray-700">
                  함께 찾을 단어 (쉼표로 구분)
                </span>
                <textarea
                  value={group.keywordsInput}
                  onChange={(e) => updateGroup(index, { keywordsInput: e.target.value })}
                  rows={2}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="예: 삼겹, 흑돼지, 갈비, BBQ"
                />
              </label>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addGroup}
            className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
          >
            키워드 묶음 추가
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
          >
            기본값으로 되돌리기
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>

        {message && <p className="text-sm text-emerald-700">{message}</p>}
      </form>
    </AdminCollapsibleSection>
  );
}
