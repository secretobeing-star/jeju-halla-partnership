const NEW_WINDOW_SUFFIX = " (새 창)";

export function externalLinkAriaLabel(label: string, opensInNewWindow = true): string {
  return opensInNewWindow ? `${label}${NEW_WINDOW_SUFFIX}` : label;
}

export function partnerMapLinkLabel(partnerName: string): string {
  return externalLinkAriaLabel(`네이버 지도에서 ${partnerName} 보기`);
}

export function partnerInstagramLinkLabel(partnerName: string): string {
  return externalLinkAriaLabel(`${partnerName} 인스타그램 보기`);
}

export function partnerAddressMapLinkLabel(partnerName: string, address: string): string {
  return externalLinkAriaLabel(`${partnerName} 주소 ${address}, 지도에서 보기`);
}

export function partnerMoreButtonLabel(
  partnerName: string,
  expanded: boolean,
  opensDialog: boolean,
): string {
  if (opensDialog) {
    return `${partnerName} 상세 보기`;
  }

  return expanded ? `${partnerName} 접기` : `${partnerName} 더보기`;
}

export function favoritesFilterAriaLabel(
  active: boolean,
  count: number,
  label = "즐겨찾기",
): string {
  const countSuffix = count > 0 ? ` ${count}개` : "";
  return active
    ? `${label} 필터 해제${countSuffix}`
    : `${label}한 업체만 보기${countSuffix}`;
}
