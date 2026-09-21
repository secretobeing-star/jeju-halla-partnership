"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAppBackHandler } from "@/lib/app-back-stack";
import {
  USER_CUSTOM_CATEGORY_LIMITS,
  type UserCustomCategory,
} from "@/lib/user-custom-categories";

type PartnerOption = {
  id: string;
  name: string;
  category?: string | null;
};

type PartnerCustomCategoryEditorProps = {
  open: boolean;
  partners: PartnerOption[];
  initial?: UserCustomCategory | null;
  onClose: () => void;
  onSave: (category: { label: string; partnerIds: string[] }) => void;
  onDelete?: () => void;
};

export default function PartnerCustomCategoryEditor({
  open,
  partners,
  initial = null,
  onClose,
  onSave,
  onDelete,
}: PartnerCustomCategoryEditorProps) {
  const [label, setLabel] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useAppBackHandler(open, onClose, "partner-custom-category-editor");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    setLabel(initial?.label ?? "");
    setSelectedIds(initial?.partnerIds ?? []);
    setQuery("");
  }, [initial, open]);

  const filteredPartners = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return partners;
    }
    return partners.filter((partner) => {
      const name = partner.name.toLowerCase();
      const category = String(partner.category ?? "").toLowerCase();
      return name.includes(keyword) || category.includes(keyword);
    });
  }, [partners, query]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  if (!mounted || !open) {
    return null;
  }

  function togglePartner(partnerId: string) {
    setSelectedIds((current) =>
      current.includes(partnerId)
        ? current.filter((id) => id !== partnerId)
        : [...current, partnerId],
    );
  }

  function handleSave() {
    const nextLabel = label.trim();
    if (!nextLabel || selectedIds.length === 0) {
      return;
    }
    onSave({ label: nextLabel, partnerIds: selectedIds });
  }

  const canSave = Boolean(label.trim()) && selectedIds.length > 0;

  const dialog = (
    <div className="partner-custom-category-editor" role="dialog" aria-modal="true" aria-labelledby="custom-category-editor-title">
      <button type="button" className="partner-custom-category-editor__backdrop" aria-label="닫기" onClick={onClose} />
      <div className="partner-custom-category-editor__panel">
        <div className="partner-custom-category-editor__header">
          <h3 id="custom-category-editor-title">
            {initial ? "내 카테고리 수정" : "내 카테고리 만들기"}
          </h3>
          <button type="button" className="partner-custom-category-editor__close" onClick={onClose}>
            닫기
          </button>
        </div>
        <p className="partner-custom-category-editor__hint">
          원하는 제휴를 고르면 카테고리 칩으로 바로 볼 수 있습니다.
        </p>
        <label className="partner-custom-category-editor__field">
          <span>카테고리 이름</span>
          <input
            type="text"
            value={label}
            maxLength={USER_CUSTOM_CATEGORY_LIMITS.maxLabelLength}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="예: 자주 가는 곳"
          />
        </label>
        <label className="partner-custom-category-editor__field">
          <span>제휴 검색</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름 또는 분류로 찾기"
          />
        </label>
        <p className="partner-custom-category-editor__count">
          {selectedIds.length}곳 선택됨
        </p>
        <div className="partner-custom-category-editor__list">
          {filteredPartners.length === 0 ? (
            <p className="partner-custom-category-editor__empty">해당하는 제휴가 없습니다.</p>
          ) : (
            filteredPartners.map((partner) => {
              const checked = selectedSet.has(partner.id);
              return (
                <label key={partner.id} className="partner-custom-category-editor__item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePartner(partner.id)}
                  />
                  <span>
                    <strong>{partner.name}</strong>
                    {partner.category ? <em>{partner.category}</em> : null}
                  </span>
                </label>
              );
            })
          )}
        </div>
        <div className="partner-custom-category-editor__actions">
          {initial && onDelete ? (
            <button type="button" className="partner-custom-category-editor__delete" onClick={onDelete}>
              삭제
            </button>
          ) : <span />}
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button type="button" disabled={!canSave} onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
