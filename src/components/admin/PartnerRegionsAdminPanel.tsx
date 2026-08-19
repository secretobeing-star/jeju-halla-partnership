"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import {
  DEFAULT_PARTNER_REGION_GROUPS,
  PARTNER_REGION_ALL,
  PARTNER_REGION_AREA_LABEL,
  formatPartnerRegion,
  getPartnerRegionGroups,
  normalizePartnerRegionGroups,
  normalizePartnerRegionLabel,
  parsePartnerRegion,
  type PartnerRegionGroup,
} from "@/lib/partner-regions";
import { supabase } from "@/lib/supabase";

type GroupDraft = PartnerRegionGroup & {
  originalLabel: string;
  areaOriginals: string[];
};

function createGroupDraft(group: PartnerRegionGroup): GroupDraft {
  return {
    ...group,
    originalLabel: group.label,
    areaOriginals: group.areas.map((area) => area),
  };
}

export default function PartnerRegionsAdminPanel() {
  const [groupDraft, setGroupDraft] = useState<GroupDraft[]>(
    DEFAULT_PARTNER_REGION_GROUPS.map(createGroupDraft),
  );
  const [defaultExpanded, setDefaultExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void supabase
      .from("site_settings")
      .select("partner_regions, partner_region_filter_default_expanded")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        const groups = getPartnerRegionGroups(data);
        setGroupDraft(groups.map(createGroupDraft));
        setDefaultExpanded(data?.partner_region_filter_default_expanded ?? false);
      });
  }, []);

  function updateGroup(index: number, patch: Partial<GroupDraft>) {
    setGroupDraft((prev) =>
      prev.map((group, groupIndex) => (groupIndex === index ? { ...group, ...patch } : group)),
    );
  }

  function addGroup() {
    if (groupDraft.length >= 10) {
      setMessage("지역 구분은 최대 10개까지 추가할 수 있습니다.");
      return;
    }

    setGroupDraft((prev) => [
      ...prev,
      createGroupDraft({
        id: `region-group-${Date.now()}`,
        label: "새 지역",
        areas: ["기타"],
      }),
    ]);
    setMessage("");
  }

  function addArea(groupIndex: number) {
    const group = groupDraft[groupIndex];
    if (!group || group.areas.length >= 30) {
      setMessage("동·읍·면은 지역당 최대 40개까지 추가할 수 있습니다.");
      return;
    }

    updateGroup(groupIndex, {
      areas: [...group.areas, "새 지역"],
      areaOriginals: [...group.areaOriginals, `__new__${Date.now()}`],
    });
    setMessage("");
  }

  async function removeGroup(index: number) {
    if (groupDraft.length <= 1) {
      setMessage("최소 1개의 지역 구분이 필요합니다.");
      return;
    }

    const group = groupDraft[index];
    const { count, error } = await supabase
      .from("partners")
      .select("id", { count: "exact", head: true })
      .like("region", `${group.originalLabel}%`);

    if (error) {
      setMessage(`지역 확인 실패: ${error.message}`);
      return;
    }

    if (count && count > 0) {
      setMessage(
        `"${group.originalLabel}" 지역을 사용하는 제휴업체가 ${count}개 있습니다. 업체 지역을 변경한 뒤 삭제해 주세요.`,
      );
      return;
    }

    setGroupDraft((prev) => prev.filter((_, groupIndex) => groupIndex !== index));
    setMessage("");
  }

  async function removeArea(groupIndex: number, areaIndex: number) {
    const group = groupDraft[groupIndex];
    if (!group || group.areas.length <= 1) {
      setMessage("지역당 최소 1개의 동·읍·면이 필요합니다.");
      return;
    }

    const area = group.areas[areaIndex];
    const regionValue = formatPartnerRegion(group.originalLabel, area);
    if (regionValue) {
      const { count, error } = await supabase
        .from("partners")
        .select("id", { count: "exact", head: true })
        .eq("region", regionValue);

      if (error) {
        setMessage(`세부 지역 확인 실패: ${error.message}`);
        return;
      }

      if (count && count > 0) {
        setMessage(
          `"${group.originalLabel} · ${area}" 지역을 사용하는 제휴업체가 ${count}개 있습니다. 업체 지역을 변경한 뒤 삭제해 주세요.`,
        );
        return;
      }
    }

    setGroupDraft((prev) =>
      prev.map((draft, draftIndex) =>
        draftIndex === groupIndex
          ? {
              ...draft,
              areas: draft.areas.filter((_, index) => index !== areaIndex),
              areaOriginals: draft.areaOriginals.filter((_, index) => index !== areaIndex),
            }
          : draft,
      ),
    );
    setMessage("");
  }

  async function migratePartnerRegion(
    fromRegion: string | null,
    toRegion: string | null,
  ): Promise<string | null> {
    if (!fromRegion || fromRegion === toRegion) {
      return null;
    }

    const { error } = await supabase
      .from("partners")
      .update({ region: toRegion })
      .eq("region", fromRegion);

    return error ? `지역 데이터 변경 실패: ${error.message}` : null;
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const nextGroups = normalizePartnerRegionGroups(
      groupDraft.map((group) => ({
        id: group.id,
        label: normalizePartnerRegionLabel(group.label),
        areas: group.areas.map((area) => normalizePartnerRegionLabel(area)),
      })),
    );

    for (const [groupIndex, draft] of groupDraft.entries()) {
      const nextGroup = nextGroups[groupIndex];
      if (!nextGroup) {
        continue;
      }

      if (draft.originalLabel !== nextGroup.label) {
        const partnersToUpdate = await supabase
          .from("partners")
          .select("id, region")
          .like("region", `${draft.originalLabel}%`);

        if (partnersToUpdate.error) {
          setMessage(`지역 이름 변경 실패: ${partnersToUpdate.error.message}`);
          setSaving(false);
          return;
        }

        for (const partner of partnersToUpdate.data ?? []) {
          const parsed = parsePartnerRegion(partner.region);
          const nextRegion = formatPartnerRegion(
            nextGroup.label,
            parsed.area && parsed.area !== PARTNER_REGION_ALL ? parsed.area : null,
          );
          const migrationError = await migratePartnerRegion(partner.region, nextRegion);
          if (migrationError) {
            setMessage(migrationError);
            setSaving(false);
            return;
          }
        }
      }

      for (const [areaIndex, originalArea] of draft.areaOriginals.entries()) {
        if (originalArea.startsWith("__new__")) {
          continue;
        }

        const nextArea = nextGroup.areas[areaIndex];
        if (!nextArea || originalArea === nextArea) {
          continue;
        }

        const fromRegion = formatPartnerRegion(draft.originalLabel, originalArea);
        const toRegion = formatPartnerRegion(nextGroup.label, nextArea);
        const migrationError = await migratePartnerRegion(fromRegion, toRegion);
        if (migrationError) {
          setMessage(migrationError);
          setSaving(false);
          return;
        }
      }
    }

    const { error } = await supabase
      .from("site_settings")
      .update({
        partner_regions: nextGroups,
        partner_region_filter_default_expanded: defaultExpanded,
      })
      .eq("id", 1);

    if (error) {
      setMessage(`지역 저장 실패: ${error.message}`);
      setSaving(false);
      return;
    }

    setGroupDraft(nextGroups.map(createGroupDraft));
    setMessage("지역 설정이 저장되었습니다.");
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <AdminCollapsibleSection
        title="지역 관리"
        description="메인 화면의 지역별 상세 검색(제주시/서귀포시 및 동·읍·면)과 업체 등록 시 지역 선택에 사용됩니다."
        headerActions={
          <button
            type="button"
            onClick={addGroup}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            지역 추가
          </button>
        }
      >
        <div className="space-y-4">
          {groupDraft.map((group, groupIndex) => (
            <div
              key={group.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block flex-1 text-sm font-medium text-gray-700">
                  지역
                  <input
                    value={group.label}
                    onChange={(e) => updateGroup(groupIndex, { label: e.target.value })}
                    maxLength={20}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void removeGroup(groupIndex)}
                  disabled={groupDraft.length <= 1}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  삭제
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-700">{PARTNER_REGION_AREA_LABEL}</p>
                  <button
                    type="button"
                    onClick={() => addArea(groupIndex)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    동·읍·면 추가
                  </button>
                </div>

                {group.areas.map((area, areaIndex) => (
                  <div key={`${group.id}-${areaIndex}`} className="flex gap-2">
                    <input
                      value={area}
                      onChange={(e) =>
                        setGroupDraft((prev) =>
                          prev.map((draft, draftGroupIndex) =>
                            draftGroupIndex === groupIndex
                              ? {
                                  ...draft,
                                  areas: draft.areas.map((item, index) =>
                                    index === areaIndex ? e.target.value : item,
                                  ),
                                }
                              : draft,
                          ),
                        )
                      }
                      maxLength={20}
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => void removeArea(groupIndex, areaIndex)}
                      disabled={group.areas.length <= 1}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="지역 상세 검색 기본 상태"
        description="메인 화면에 처음 들어왔을 때 지역별 상세 검색 패널을 펼칠지 접을지 설정합니다."
      >
        <div className="flex flex-wrap gap-4 text-sm text-gray-700">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="partner_region_filter_default_expanded"
              checked={!defaultExpanded}
              onChange={() => setDefaultExpanded(false)}
              className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            접힌 상태
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="partner_region_filter_default_expanded"
              checked={defaultExpanded}
              onChange={() => setDefaultExpanded(true)}
              className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            펼친 상태
          </label>
        </div>
      </AdminCollapsibleSection>

      {message && <p className="text-sm text-emerald-700">{message}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving ? "저장 중..." : "지역 설정 저장"}
      </button>
    </form>
  );
}
