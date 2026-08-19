"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminCollapsibleSection from "@/components/admin/AdminCollapsibleSection";
import { getStorageErrorMessage, uploadPartnershipImage } from "@/lib/storage";
import { SitePopup, supabase } from "@/lib/supabase";

type PopupFormState = {
  title: string;
  link_url: string;
  is_active: boolean;
  sort_order: number;
  image_url: string | null;
};

const EMPTY_FORM: PopupFormState = {
  title: "",
  link_url: "",
  is_active: true,
  sort_order: 0,
  image_url: null,
};

type PopupAdminPanelProps = {
  onMessage: (message: string) => void;
};

export default function PopupAdminPanel({ onMessage }: PopupAdminPanelProps) {
  const [popups, setPopups] = useState<SitePopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PopupFormState>(EMPTY_FORM);

  const loadPopups = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("site_popups")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      onMessage(
        error.message.includes("site_popups")
          ? "팝업 테이블이 없습니다. Supabase SQL Editor에서 site-popups.sql을 실행해 주세요."
          : `팝업 목록 불러오기 실패: ${error.message}`,
      );
      setPopups([]);
    } else {
      setPopups((data as SitePopup[]) ?? []);
    }

    setLoading(false);
  }, [onMessage]);

  useEffect(() => {
    void loadPopups();
  }, [loadPopups]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(popup: SitePopup) {
    setEditingId(popup.id);
    setForm({
      title: popup.title ?? "",
      link_url: popup.link_url ?? "",
      is_active: popup.is_active,
      sort_order: popup.sort_order ?? 0,
      image_url: popup.image_url,
    });
    onMessage("");
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    onMessage("");

    try {
      const url = await uploadPartnershipImage(file, "popups");
      setForm((prev) => ({ ...prev, image_url: url }));
      onMessage("팝업 이미지가 업로드되었습니다.");
    } catch (error) {
      onMessage(`이미지 업로드 실패: ${getStorageErrorMessage(error)}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const title = form.title.trim();
    if (!title) {
      onMessage("팝업 제목을 입력해 주세요.");
      return;
    }

    if (!form.image_url?.trim()) {
      onMessage("팝업 이미지를 등록해 주세요.");
      return;
    }

    setSaving(true);
    onMessage("");

    const payload = {
      title,
      image_url: form.image_url,
      link_url: form.link_url.trim() || null,
      is_active: form.is_active,
      sort_order: Number.isFinite(form.sort_order) ? form.sort_order : 0,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase.from("site_popups").update(payload).eq("id", editingId);

      if (error) {
        onMessage(`팝업 수정 실패: ${error.message}`);
        setSaving(false);
        return;
      }

      onMessage("팝업이 수정되었습니다.");
    } else {
      const { error } = await supabase.from("site_popups").insert(payload);

      if (error) {
        onMessage(`팝업 등록 실패: ${error.message}`);
        setSaving(false);
        return;
      }

      onMessage("팝업이 등록되었습니다.");
    }

    resetForm();
    await loadPopups();
    setSaving(false);
  }

  async function handleDelete(popup: SitePopup) {
    if (!window.confirm(`"${popup.title}" 팝업을 삭제할까요?`)) {
      return;
    }

    const { error } = await supabase.from("site_popups").delete().eq("id", popup.id);

    if (error) {
      onMessage(`팝업 삭제 실패: ${error.message}`);
      return;
    }

    if (editingId === popup.id) {
      resetForm();
    }

    onMessage("팝업이 삭제되었습니다.");
    await loadPopups();
  }

  async function toggleActive(popup: SitePopup) {
    const { error } = await supabase
      .from("site_popups")
      .update({
        is_active: !popup.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", popup.id);

    if (error) {
      onMessage(`상태 변경 실패: ${error.message}`);
      return;
    }

    await loadPopups();
  }

  return (
    <div className="space-y-6">
      <AdminCollapsibleSection
        title={editingId ? "팝업 수정" : "팝업 등록"}
        description="메인 화면에 표시할 팝업을 등록합니다. 이미지와 링크를 설정할 수 있습니다."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            팝업 제목
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="관리용 제목"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            클릭 링크 (선택)
            <input
              type="url"
              value={form.link_url}
              onChange={(e) => setForm((prev) => ({ ...prev, link_url: e.target.value }))}
              placeholder="https://"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              표시 순서
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sort_order: Number(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>

            <label className="mt-7 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, is_active: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-emerald-600"
              />
              메인에 표시
            </label>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <label className="block text-sm font-medium text-gray-700">
              팝업 이미지
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageUpload(file);
                  e.target.value = "";
                }}
                className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700"
              />
            </label>
            <p className="mt-1 text-xs text-gray-500">
              권장 비율 4:5 또는 1:1. PNG·JPG 이미지를 사용할 수 있습니다.
            </p>
            {uploading && <p className="mt-2 text-sm text-gray-500">업로드 중...</p>}
            {form.image_url && (
              <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white p-4">
                <img
                  src={form.image_url}
                  alt="팝업 이미지 미리보기"
                  className="mx-auto max-h-80 w-full max-w-sm rounded-lg object-contain"
                />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, image_url: null }))}
                  className="mt-3 text-sm text-red-600 hover:underline"
                >
                  이미지 제거
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "저장 중..." : editingId ? "수정 저장" : "팝업 등록"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                수정 취소
              </button>
            )}
          </div>
        </form>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="등록된 팝업"
        description="순서가 낮을수록 먼저 표시됩니다. 활성화된 팝업만 메인에 노출됩니다."
      >
        {loading ? (
          <p className="mt-4 text-sm text-gray-500">불러오는 중...</p>
        ) : popups.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">등록된 팝업이 없습니다.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {popups.map((popup) => (
              <li key={popup.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
                  {popup.image_url ? (
                    <img
                      src={popup.image_url}
                      alt={popup.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">
                      이미지 없음
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-gray-900">{popup.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        popup.is_active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {popup.is_active ? "표시 중" : "비활성"}
                    </span>
                    <span className="text-xs text-gray-500">순서 {popup.sort_order}</span>
                  </div>
                  {popup.link_url && (
                    <p className="mt-1 truncate text-xs text-gray-500">{popup.link_url}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(popup)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleActive(popup)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {popup.is_active ? "비활성화" : "활성화"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(popup)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCollapsibleSection>
    </div>
  );
}
