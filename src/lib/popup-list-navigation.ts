export function getPopupListNavigation<T extends { id: string }>(
  items: T[],
  currentId: string | null,
) {
  const index = currentId ? items.findIndex((item) => item.id === currentId) : -1;

  if (index === -1) {
    return {
      index: -1,
      total: items.length,
      hasPrevious: false,
      hasNext: false,
      previous: null as T | null,
      next: null as T | null,
    };
  }

  return {
    index,
    total: items.length,
    hasPrevious: index > 0,
    hasNext: index < items.length - 1,
    previous: index > 0 ? items[index - 1] : null,
    next: index < items.length - 1 ? items[index + 1] : null,
  };
}

export function getPageForListIndex(index: number, pageSize: number) {
  if (index < 0 || pageSize <= 0) {
    return 1;
  }

  return Math.floor(index / pageSize) + 1;
}
