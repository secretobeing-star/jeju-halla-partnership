"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import {
  DEFAULT_PARTNER_CATEGORIES,
  getPartnerCategories,
  normalizePartnerCategories,
  normalizePartnerCategoryLabel,
} from "@/lib/partner-categories";
import { supabase } from "@/lib/supabase";

type CategoryDraftItem = {
  original: string;
  value: string;
};

export default function PartnerCategoriesAdminPanel() {
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraftItem[]>(
    DEFAULT_PARTNER_CATEGORIES.map((category) => ({
      original: category,
      value: category,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void supabase
      .from("site_settings")
      .select("partner_categories")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        const categories = getPartnerCategories(data);
        setCategoryDraft(
          categories.map((category) => ({
            original: category,
            value: category,
          })),
        );
      });
  }, []);

  function addCategory() {
    if (categoryDraft.length >= 20) {
      setMessage("카테고리는 최대 20개까지 추가할 수 있습니다.");
      return;
    }

    const label = "새 카테고리";
    setCategoryDraft((prev) => [
      ...prev,
      { original: `__new__${Date.now()}`, value: label },
    ]);
    setMessage("");
  }

  async function removeCategory(index: number) {
    if (categoryDraft.length <= 1) {
      setMessage("최소 1개의 카테고리가 필요합니다.");
      return;
    }

    const item = categoryDraft[index];
    if (!item.original.startsWith("__new__")) {
      const { count, error } = await supabase
        .from("partners")
        .select("id", { count: "exact", head: true })
        .eq("category", item.original);

      if (error) {
        setMessage(`카테고리 확인 실패: ${error.message}`);
        return;
      }

      if (count && count > 0) {
        setMessage(
          `"${item.original}" 카테고리를 사용하는 제휴업체가 ${count}개 있습니다. 업체 분류를 변경한 뒤 삭제해 주세요.`,
        );
        return;
      }
    }

    setCategoryDraft((prev) => prev.filter((_, draftIndex) => draftIndex !== index));
    setMessage("");
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const nextCategories = normalizePartnerCategories(
      categoryDraft.map((item) => normalizePartnerCategoryLabel(item.value)),
    );

    for (const item of categoryDraft) {
      if (item.original.startsWith("__new__")) {
        continue;
      }

      const nextName = normalizePartnerCategoryLabel(item.value);
      if (item.original === nextName) {
        continue;
      }

      const { error } = await supabase
        .from("partners")
        .update({ category: nextName })
        .eq("category", item.original);

      if (error) {
        setMessage(`카테고리 이름 변경 실패: ${error.message}`);
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("site_settings")
      .update({ partner_categories: nextCategories })
      .eq("id", 1);

    if (error) {
      setMessage(`카테고리 저장 실패: ${error.message}`);
      setSaving(false);
      return;
    }

    setCategoryDraft(
      nextCategories.map((category) => ({
        original: category,
        value: category,
      })),
    );
    setMessage("카테고리 설정이 저장되었습니다.");
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <AdminCollapsibleSection
        title="카테고리 관리"
        description="메인 화면 제휴업체 분류 버튼과 관리자 등록 분류에 사용됩니다."
        headerActions={
          <button
            type="button"
            onClick={addCategory}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            카테고리 추가
          </button>
        }
      >
      <div className="mt-4 space-y-3">
        {categoryDraft.map((item, index) => (
          <div
            key={item.original}
            className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-end"
          >
            <label className="block flex-1 text-sm font-medium text-gray-700">
              카테고리 이름
              <input
                value={item.value}
                onChange={(e) =>
                  setCategoryDraft((prev) =>
                    prev.map((draft, draftIndex) =>
                      draftIndex === index ? { ...draft, value: e.target.value } : draft,
                    ),
                  )
                }
                maxLength={30}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
            <button
              type="button"
              onClick={() => void removeCategory(index)}
              disabled={categoryDraft.length <= 1}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      {message && <p className="text-sm text-emerald-700">{message}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving ? "저장 중..." : "카테고리 저장"}
      </button>
      </AdminCollapsibleSection>
    </form>
  );
}
