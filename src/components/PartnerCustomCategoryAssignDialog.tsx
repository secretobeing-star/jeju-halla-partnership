"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAppBackHandler } from "@/lib/app-back-stack";
import {
  USER_CUSTOM_CATEGORIES_EVENT,
  USER_CUSTOM_CATEGORY_LIMITS,
  loadUserCustomCategories,
  saveUserCustomCategories,
  togglePartnerInUserCustomCategory,
  type UserCustomCategory,
} from "@/lib/user-custom-categories";

type PartnerCustomCategoryAssignDialogProps = {
  open: boolean;
  partnerId: string;
  partnerName: string;
  onClose: () => void;
  onCreateNew: () => void;
};

export default function PartnerCustomCategoryAssignDialog({
  open,
  partnerId,
  partnerName,
  onClose,
  onCreateNew,
}: PartnerCustomCategoryAssignDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<UserCustomCategory[]>([]);

  useAppBackHandler(open, onClose, "partner-custom-category-assign");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function refresh() {
      setCategories(loadUserCustomCategories());
    }
    refresh();
    window.addEventListener(USER_CUSTOM_CATEGORIES_EVENT, refresh);
    return () => window.removeEventListener(USER_CUSTOM_CATEGORIES_EVENT, refresh);
  }, []);

  const canCreate = categories.length < USER_CUSTOM_CATEGORY_LIMITS.maxCategories;

  const selectedCount = useMemo(
    () => categories.filter((category) => category.partnerIds.includes(partnerId)).length,
    [categories, partnerId],
  );

  if (!mounted || !open) {
    return null;
  }

  function toggleCategory(categoryId: string) {
    const next = togglePartnerInUserCustomCategory(categories, categoryId, partnerId);
    saveUserCustomCategories(next);
    setCategories(next);
  }

  return createPortal(
    <div className="partner-custom-category-assign" role="dialog" aria-modal="true">
      <button
        type="button"
        className="partner-custom-category-assign__backdrop"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="partner-custom-category-assign__panel">
        <div className="partner-custom-category-assign__header">
          <h3>내 카테고리에 추가</h3>
          <button type="button" onClick={onClose}>
            닫기
          </button>
        </div>
        <p className="partner-custom-category-assign__hint">
          {partnerName} · {selectedCount}곳에 추가됨
        </p>
        <div className="partner-custom-category-assign__list">
          {categories.length === 0 ? (
            <p className="partner-custom-category-assign__empty">
              아직 만든 카테고리가 없습니다. 아래에서 새로 만들 수 있습니다.
            </p>
          ) : (
            categories.map((category) => {
              const checked = category.partnerIds.includes(partnerId);
              return (
                <label key={category.id} className="partner-custom-category-assign__item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(category.id)}
                  />
                  <span>
                    <strong>{category.label}</strong>
                    <em>{category.partnerIds.length}곳</em>
                  </span>
                </label>
              );
            })
          )}
        </div>
        <div className="partner-custom-category-assign__actions">
          <button type="button" onClick={onClose}>
            완료
          </button>
          <button type="button" disabled={!canCreate} onClick={onCreateNew}>
            새 카테고리
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
