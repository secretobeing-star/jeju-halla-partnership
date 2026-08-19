export type NaverMapPartnerMarker = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  imageUrl?: string | null;
  pinImageUrl?: string | null;
  category?: string | null;
  address?: string | null;
  benefit?: string | null;
};

export const PARTNER_MAP_DEFAULT_THUMBNAIL_PATH = "/images/default-thumbnail.svg";
export const PARTNER_MAP_MARKER_SIZE = { width: 48, height: 54 };
export const PARTNER_MAP_MARKER_ANCHOR = { x: 24, y: 54 };
const PARTNER_MAP_IMAGE_FALLBACK_TEXT = "?";

export function parsePartnerMapCoordinate(value: number | string | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizePartnerMapAssetPath(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  return `/${trimmed.replace(/^\.?\//, "")}`;
}

export function resolvePartnerMapImageUrl(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const normalized = normalizePartnerMapAssetPath(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return PARTNER_MAP_DEFAULT_THUMBNAIL_PATH;
}

export function createPartnerMapHtmlIcon(
  content: HTMLElement | string,
  options: {
    width: number;
    height: number;
    anchorX: number;
    anchorY: number;
  },
): naver.maps.HtmlIcon {
  const size = new naver.maps.Size(options.width, options.height);
  return {
    content,
    size,
    scaledSize: new naver.maps.Size(options.width, options.height),
    origin: new naver.maps.Point(0, 0),
    anchor: new naver.maps.Point(options.anchorX, options.anchorY),
  };
}


export function truncatePartnerMapText(text: string | null | undefined, max = 56): string {
  const line = text?.trim().split("\n")[0]?.trim() ?? "";
  if (!line) {
    return "";
  }

  return line.length > max ? `${line.slice(0, max)}…` : line;
}

function createPartnerMapInitialFallbackElement(
  className: string,
  partnerName: string,
): HTMLSpanElement {
  const fallback = document.createElement("span");
  fallback.className = className;
  fallback.textContent = partnerName.trim().slice(0, 1) || PARTNER_MAP_IMAGE_FALLBACK_TEXT;
  return fallback;
}

function bindPartnerMapImageFallback(
  img: HTMLImageElement,
  fallbackSrc: string,
  onFinalError: () => void,
) {
  img.addEventListener("error", () => {
    if (img.dataset.fallbackApplied === "true") {
      onFinalError();
      return;
    }

    img.dataset.fallbackApplied = "true";
    img.src = fallbackSrc;
  });
}

export function createPartnerMapMarkerElement(
  partner: NaverMapPartnerMarker,
  selected: boolean,
  favorited = false,
): HTMLDivElement {
  const shell = document.createElement("div");
  shell.className = [
    "partner-map-marker-shell",
    favorited ? "partner-map-marker-shell--favorited" : "",
  ]
    .filter(Boolean)
    .join(" ");
  shell.dataset.partnerId = partner.id;

  const button = document.createElement("button");
  button.type = "button";
  button.className = [
    "partner-map-marker",
    selected ? "partner-map-marker--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  button.setAttribute("aria-label", partner.name);
  button.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });
  button.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  const img = document.createElement("img");
  img.src = resolvePartnerMapImageUrl(partner.pinImageUrl, partner.imageUrl);
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.className = "partner-map-marker__image";
  bindPartnerMapImageFallback(img, PARTNER_MAP_DEFAULT_THUMBNAIL_PATH, () => {
    img.remove();
    if (!button.querySelector(".partner-map-marker__fallback")) {
      button.prepend(
        createPartnerMapInitialFallbackElement("partner-map-marker__fallback", partner.name),
      );
    }
  });
  button.appendChild(img);

  const tail = document.createElement("span");
  tail.className = "partner-map-marker__tail";
  tail.setAttribute("aria-hidden", "true");
  button.appendChild(tail);

  shell.appendChild(button);

  if (favorited) {
    shell.appendChild(createPartnerMapFavoriteBadgeElement());
  }

  return shell;
}

function createPartnerMapFavoriteBadgeElement(): HTMLSpanElement {
  const favoriteBadge = document.createElement("span");
  favoriteBadge.className = "partner-map-marker__favorite-badge";
  favoriteBadge.setAttribute("aria-hidden", "true");
  favoriteBadge.innerHTML = PARTNER_MAP_FAVORITE_BADGE_HTML;
  return favoriteBadge;
}

const PARTNER_MAP_FAVORITE_BADGE_HTML =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';

const PARTNER_MAP_FAVORITE_OUTLINE_HTML =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';

const PARTNER_MAP_CLOSE_ICON_HTML =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

export function updatePartnerMapMarkerFavorite(
  markerShell: HTMLElement,
  favorited: boolean,
) {
  markerShell.classList.toggle("partner-map-marker-shell--favorited", favorited);

  const existingBadge = markerShell.querySelector(".partner-map-marker__favorite-badge");
  if (favorited) {
    if (existingBadge) {
      return;
    }

    markerShell.appendChild(createPartnerMapFavoriteBadgeElement());
    return;
  }

  existingBadge?.remove();
}

export function upsertPartnerMapCountdownBadge(markerShell: HTMLElement, text: string | null) {
  let badge = markerShell.querySelector(".partner-map-marker__countdown");
  if (!text) {
    badge?.remove();
    return;
  }
  if (!(badge instanceof HTMLElement)) {
    badge = document.createElement("span");
    badge.className = "partner-map-marker__countdown";
    markerShell.appendChild(badge);
  }
  badge.textContent = text;
}

export function getPartnerMapMarkerButton(markerShell: HTMLElement): HTMLButtonElement | null {
  return markerShell.querySelector(".partner-map-marker");
}

export function getMapPartnerMarkersSignature(partners: readonly NaverMapPartnerMarker[]): string {
  return partners
    .map(
      (partner) =>
        `${partner.id}:${partner.latitude}:${partner.longitude}:${resolvePartnerMapImageUrl(partner.pinImageUrl, partner.imageUrl)}`,
    )
    .sort()
    .join("|");
}

function applyPartnerMapMiniCardFavoriteState(
  button: HTMLButtonElement,
  favorited: boolean,
  options?: { partnerName?: string; favoritesTerm?: string },
) {
  const term = options?.favoritesTerm?.trim() || "즐겨찾기";
  const name = options?.partnerName?.trim() || "";
  button.classList.toggle("partner-map-mini-card__favorite-btn--on", favorited);
  button.setAttribute("aria-pressed", favorited ? "true" : "false");
  button.setAttribute(
    "aria-label",
    name ? (favorited ? `${name} ${term} 해제` : `${name} ${term} 추가`) : term,
  );
  button.title = favorited ? `${term} 해제` : term;
  button.innerHTML = favorited ? PARTNER_MAP_FAVORITE_BADGE_HTML : PARTNER_MAP_FAVORITE_OUTLINE_HTML;
}

export function updatePartnerMapMiniCardFavorite(
  card: HTMLElement,
  favorited: boolean,
  options?: { partnerName?: string; favoritesTerm?: string },
) {
  card.classList.toggle("partner-map-mini-card--favorited", favorited);
  const button = card.querySelector<HTMLButtonElement>(".partner-map-mini-card__favorite-btn");
  if (!button) {
    return;
  }

  applyPartnerMapMiniCardFavoriteState(button, favorited, options);
}

function formatPartnerMapBenefitText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("-") ? trimmed : `- ${trimmed}`;
}

export function createPartnerMapMiniCardElement(
  partner: NaverMapPartnerMarker,
  onDetailClick: () => void,
  options?: {
    spotlight?: boolean;
    favorited?: boolean;
    favoritesEnabled?: boolean;
    favoritesTerm?: string;
    onClose?: () => void;
    onFavoriteToggle?: () => void;
    stamp?: {
      visible: boolean;
      disabled: boolean;
      label?: string;
      onStamp?: () => void;
    };
    detailLabel?: string;
  },
): HTMLElement {
  const card = document.createElement("article");
  card.className = [
    "partner-map-mini-card",
    options?.spotlight ? "partner-map-mini-card--spotlight" : "",
    options?.favorited ? "partner-map-mini-card--favorited" : "",
  ]
    .filter(Boolean)
    .join(" ");
  card.dataset.partnerId = partner.id;

  card.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });
  card.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  const toolbar = document.createElement("div");
  toolbar.className = "partner-map-mini-card__toolbar";

  if (options?.favoritesEnabled && options.onFavoriteToggle) {
    const favoriteButton = document.createElement("button");
    favoriteButton.type = "button";
    favoriteButton.className = "partner-map-mini-card__icon-btn partner-map-mini-card__favorite-btn";
    favoriteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      options.onFavoriteToggle?.();
    });
    toolbar.appendChild(favoriteButton);
    applyPartnerMapMiniCardFavoriteState(favoriteButton, Boolean(options.favorited), {
      partnerName: partner.name,
      favoritesTerm: options.favoritesTerm,
    });
  }

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "partner-map-mini-card__icon-btn partner-map-mini-card__close-btn";
  closeButton.setAttribute("aria-label", "닫기");
  closeButton.title = "닫기";
  closeButton.innerHTML = PARTNER_MAP_CLOSE_ICON_HTML;
  closeButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    options?.onClose?.();
  });
  toolbar.appendChild(closeButton);
  card.appendChild(toolbar);

  const content = document.createElement("div");
  content.className = "partner-map-mini-card__content";

  function bindDetailOpen(element: HTMLElement, label: string) {
    if (element instanceof HTMLButtonElement) {
      element.setAttribute("aria-label", label);
    }

    element.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onDetailClick();
    });
  }

  const imageWrap = document.createElement("button");
  imageWrap.type = "button";
  imageWrap.className = "partner-map-mini-card__image-wrap";
  const img = document.createElement("img");
  img.src = resolvePartnerMapImageUrl(partner.imageUrl);
  img.alt = "";
  img.className = "partner-map-mini-card__image";
  img.draggable = false;
  bindPartnerMapImageFallback(img, PARTNER_MAP_DEFAULT_THUMBNAIL_PATH, () => {
    img.remove();
    imageWrap.classList.add("partner-map-mini-card__image-wrap--fallback");
    imageWrap.textContent = partner.name.trim().slice(0, 1) || PARTNER_MAP_IMAGE_FALLBACK_TEXT;
  });
  imageWrap.appendChild(img);
  bindDetailOpen(imageWrap, `${partner.name} 자세히 보기`);
  content.appendChild(imageWrap);

  const body = document.createElement("div");
  body.className = "partner-map-mini-card__body";

  const titleRow = document.createElement("div");
  titleRow.className = "partner-map-mini-card__title-row";

  const title = document.createElement("h3");
  title.className = "partner-map-mini-card__title";
  title.textContent = partner.name;
  titleRow.appendChild(title);

  if (partner.category?.trim()) {
    const category = document.createElement("span");
    category.className = "partner-map-mini-card__category";
    category.textContent = partner.category.trim();
    titleRow.appendChild(category);
  }

  body.appendChild(titleRow);

  const addressText = truncatePartnerMapText(partner.address, 72);
  if (addressText) {
    const address = document.createElement("p");
    address.className = "partner-map-mini-card__address";
    address.textContent = addressText;
    body.appendChild(address);
  }

  const benefitText = truncatePartnerMapText(partner.benefit, 72);
  if (benefitText) {
    const benefit = document.createElement("p");
    benefit.className = "partner-map-mini-card__benefit";
    benefit.textContent = formatPartnerMapBenefitText(benefitText);
    body.appendChild(benefit);
  }

  content.appendChild(body);
  card.appendChild(content);

  const detailButton = document.createElement("button");
  detailButton.type = "button";
  detailButton.className = "partner-map-mini-card__detail-btn";
  detailButton.textContent = options?.detailLabel?.trim() || "자세히 보기";
  detailButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onDetailClick();
  });
  card.appendChild(detailButton);

  if (options?.stamp?.visible) {
    const stampButton = document.createElement("button");
    stampButton.type = "button";
    stampButton.className = "partner-map-mini-card__stamp-btn";
    stampButton.disabled = Boolean(options.stamp.disabled);
    stampButton.textContent = options.stamp.disabled
      ? "이미 찍은 장소"
      : options.stamp.label || "도장 찍기";
    stampButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!stampButton.disabled) {
        options.stamp?.onStamp?.();
      }
    });
    card.appendChild(stampButton);
  }

  return card;
}

export function stylePartnerMapClusterMarker(clusterMarker: naver.maps.Marker, count: number) {
  const element = clusterMarker.getElement?.();
  if (!(element instanceof HTMLElement)) {
    return;
  }

  const countElement = element.querySelector(".partner-map-cluster__count");
  if (countElement instanceof HTMLElement) {
    countElement.textContent = String(count);
  }
}

export function createPartnerMapClusterIcon(size: number): naver.maps.HtmlIcon {
  const content = document.createElement("div");
  content.className = "partner-map-cluster";
  content.style.width = `${size}px`;
  content.style.height = `${size}px`;

  const count = document.createElement("span");
  count.className = "partner-map-cluster__count";
  count.textContent = "0";
  content.appendChild(count);

  return {
    content,
    size: new naver.maps.Size(size, size),
    scaledSize: new naver.maps.Size(size, size),
    origin: new naver.maps.Point(0, 0),
    anchor: new naver.maps.Point(size / 2, size / 2),
  };
}

export const PARTNER_MAP_USER_LOCATION_SIZE = 24;

export function createPartnerMapUserLocationElement(): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "partner-map-user-location";
  element.innerHTML = '<span class="partner-map-user-location__pulse" aria-hidden="true"></span><span class="partner-map-user-location__dot" aria-hidden="true"></span>';
  element.setAttribute("aria-hidden", "true");
  return element;
}
