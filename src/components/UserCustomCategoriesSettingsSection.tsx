"use client";

import { useEffect, useState } from "react";
import {
  USER_CUSTOM_CATEGORIES_EVENT,
  loadUserCustomCategories,
  openUserCustomCategoryEditor,
  type UserCustomCategory,
} from "@/lib/user-custom-categories";

export default function UserCustomCategoriesSettingsSection({
  loggedIn,
}: {
  loggedIn: boolean;
}) {
  const [categories, setCategories] = useState<UserCustomCategory[]>([]);

  useEffect(() => {
    function refresh() {
      setCategories(loadUserCustomCategories());
    }
    refresh();
    window.addEventListener(USER_CUSTOM_CATEGORIES_EVENT, refresh);
    return () => window.removeEventListener(USER_CUSTOM_CATEGORIES_EVENT, refresh);
  }, []);

  if (!loggedIn) {
    return null;
  }

  return (
    <div className="user-custom-category-settings">
      <p className="user-custom-category-settings__title">내 카테고리</p>
      {categories.length === 0 ? (
        <p className="user-custom-category-settings__empty">수정할 카테고리가 없습니다.</p>
      ) : (
        <ul className="user-custom-category-settings__list">
          {categories.map((category) => (
            <li key={category.id} className="user-custom-category-settings__item">
              <span>
                {category.label}
                <em>{category.partnerIds.length}곳</em>
              </span>
              <button
                type="button"
                onClick={() => openUserCustomCategoryEditor(category.id)}
              >
                수정
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
