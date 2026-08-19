export function getNaverMapSearchUrl(query: string) {
  return `https://map.naver.com/v5/search/${encodeURIComponent(query)}`;
}

export function getInstagramUrl(raw: string | null | undefined) {
  if (!raw?.trim()) {
    return null;
  }

  const value = raw.trim();

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("@")) {
    return `https://www.instagram.com/${value.slice(1)}/`;
  }

  return `https://www.instagram.com/${value.replace(/^@/, "")}/`;
}
