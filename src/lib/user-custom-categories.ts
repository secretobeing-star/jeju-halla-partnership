export const USER_CUSTOM_CATEGORY_PREFIX = "custom::";
export const USER_CUSTOM_CATEGORIES_EVENT = "user-custom-categories-changed";
export const OPEN_USER_CUSTOM_CATEGORY_EDITOR_EVENT = "open-user-custom-category-editor";
export const OPEN_USER_CUSTOM_CATEGORY_ASSIGN_EVENT = "open-user-custom-category-assign";

const STORAGE_KEY = "jeju-halla-user-custom-categories";
const MAX_CATEGORIES = 8;
const MAX_LABEL_LENGTH = 20;

export type UserCustomCategory = {
  id: string;
  label: string;
  partnerIds: string[];
};

function normalizeLabel(value: string) {
  return value.trim().slice(0, MAX_LABEL_LENGTH);
}

function normalizeCategory(raw: unknown): UserCustomCategory | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Partial<UserCustomCategory>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const label = normalizeLabel(typeof record.label === "string" ? record.label : "");
  if (!id || !label) {
    return null;
  }

  const seen = new Set<string>();
  const partnerIds: string[] = [];
  if (Array.isArray(record.partnerIds)) {
    for (const item of record.partnerIds) {
      if (typeof item !== "string") {
        continue;
      }
      const partnerId = item.trim();
      if (!partnerId || seen.has(partnerId)) {
        continue;
      }
      seen.add(partnerId);
      partnerIds.push(partnerId);
    }
  }

  return { id, label, partnerIds };
}

export function customCategoryValue(id: string) {
  return `${USER_CUSTOM_CATEGORY_PREFIX}${id}`;
}

export function parseCustomCategoryId(value: string): string | null {
  if (!value.startsWith(USER_CUSTOM_CATEGORY_PREFIX)) {
    return null;
  }
  const id = value.slice(USER_CUSTOM_CATEGORY_PREFIX.length).trim();
  return id || null;
}

export function createUserCustomCategoryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadUserCustomCategories(): UserCustomCategory[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const seen = new Set<string>();
    const categories: UserCustomCategory[] = [];
    for (const item of parsed) {
      const category = normalizeCategory(item);
      if (!category || seen.has(category.id)) {
        continue;
      }
      seen.add(category.id);
      categories.push(category);
      if (categories.length >= MAX_CATEGORIES) {
        break;
      }
    }
    return categories;
  } catch {
    return [];
  }
}

export function openUserCustomCategoryEditor(categoryId?: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(OPEN_USER_CUSTOM_CATEGORY_EDITOR_EVENT, {
      detail: { categoryId: categoryId ?? null },
    }),
  );
}

export function openUserCustomCategoryAssign(partnerId: string) {
  if (typeof window === "undefined") {
    return;
  }
  const id = partnerId.trim();
  if (!id) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(OPEN_USER_CUSTOM_CATEGORY_ASSIGN_EVENT, {
      detail: { partnerId: id },
    }),
  );
}

export function partnerIdsInCustomCategories(categories: readonly UserCustomCategory[]) {
  return new Set(categories.flatMap((category) => category.partnerIds));
}

export function togglePartnerInUserCustomCategory(
  categories: UserCustomCategory[],
  categoryId: string,
  partnerId: string,
) {
  return categories.map((category) => {
    if (category.id !== categoryId) {
      return category;
    }
    const hasPartner = category.partnerIds.includes(partnerId);
    return {
      ...category,
      partnerIds: hasPartner
        ? category.partnerIds.filter((id) => id !== partnerId)
        : [...category.partnerIds, partnerId],
    };
  });
}

export function saveUserCustomCategories(next: UserCustomCategory[]) {
  if (typeof window === "undefined") {
    return;
  }

  const seen = new Set<string>();
  const categories: UserCustomCategory[] = [];
  for (const item of next) {
    const category = normalizeCategory(item);
    if (!category || seen.has(category.id)) {
      continue;
    }
    seen.add(category.id);
    categories.push(category);
    if (categories.length >= MAX_CATEGORIES) {
      break;
    }
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  window.dispatchEvent(new CustomEvent(USER_CUSTOM_CATEGORIES_EVENT));
}

export function pruneUserCustomCategories(
  categories: UserCustomCategory[],
  validPartnerIds: ReadonlySet<string>,
): UserCustomCategory[] {
  return categories.map((category) => ({
    ...category,
    partnerIds: category.partnerIds.filter((id) => validPartnerIds.has(id)),
  }));
}

export function partnerMatchesCustomCategory(
  partnerId: string,
  selectedCategory: string,
  customCategories: readonly UserCustomCategory[],
): boolean | null {
  const customId = parseCustomCategoryId(selectedCategory);
  if (!customId) {
    return null;
  }
  const category = customCategories.find((item) => item.id === customId);
  if (!category) {
    return false;
  }
  return category.partnerIds.includes(partnerId);
}

export const USER_CUSTOM_CATEGORY_LIMITS = {
  maxCategories: MAX_CATEGORIES,
  maxLabelLength: MAX_LABEL_LENGTH,
};
