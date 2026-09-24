type MiniCardOverlayInstance = naver.maps.OverlayView & {
  close(): void;
};

type MiniCardOverlayPlacement = "marker" | "center";

type CreateMiniCardOverlayOptions = {
  map: naver.maps.Map;
  element: HTMLElement;
  mapContainer?: HTMLElement | null;
  position?: naver.maps.LatLng;
  anchorOffsetY?: number;
  placement?: MiniCardOverlayPlacement;
  /** center 배치일 때 세로 위치 (0=위, 1=아래). 기본 0.5 */
  centerVerticalRatio?: number;
  /** marker 배치일 때 마커 앵커에서 썸네일 상단까지 거리(px) */
  markerVisualTopOffset?: number;
  /** marker 배치일 때 썸네일과 카드 사이 간격(px) */
  markerGap?: number;
};

function resolveMapElement(
  overlay: MiniCardOverlayInstance,
  mapContainer: HTMLElement | null,
): HTMLElement | null {
  const panes = overlay.getPanes();
  return (
    mapContainer ??
    (panes.overlayMouseTarget?.parentElement as HTMLElement | null) ??
    (panes.floatPane?.parentElement as HTMLElement | null)
  );
}

function clampCardPosition(
  left: number,
  top: number,
  element: HTMLElement,
  mapElement: HTMLElement,
  padding = 8,
) {
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const mapWidth = mapElement.clientWidth;
  const mapHeight = mapElement.clientHeight;
  return {
    left: Math.max(padding, Math.min(left, Math.max(padding, mapWidth - width - padding))),
    top: Math.max(padding, Math.min(top, Math.max(padding, mapHeight - height - padding))),
  };
}

export function createPartnerMapMiniCardOverlay({
  map,
  element,
  mapContainer = null,
  position,
  anchorOffsetY = -64,
  placement = "marker",
  centerVerticalRatio = 0.5,
  markerVisualTopOffset = 62,
  markerGap = 12,
}: CreateMiniCardOverlayOptions): MiniCardOverlayInstance {
  element.classList.add("partner-map-mini-card-overlay");
  element.classList.add("partner-map-mini-card-overlay--above-marker");
  element.style.position = "absolute";
  element.style.zIndex = "120";
  element.style.touchAction = "none";

  const overlay = new window.naver.maps.OverlayView() as MiniCardOverlayInstance;
  const followListeners: unknown[] = [];
  let pinnedPosition: { left: number; top: number } | null = null;
  let dragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragOriginLeft = 0;
  let dragOriginTop = 0;

  overlay.onAdd = function onAdd() {
    const host = mapContainer ?? overlay.getPanes().overlayMouseTarget ?? overlay.getPanes().floatPane;
    if (host && element.parentElement !== host) {
      host.appendChild(element);
    }
  };

  overlay.draw = function draw() {
    if (!overlay.getMap()) {
      return;
    }

    const padding = 8;
    const mapElement = resolveMapElement(overlay, mapContainer);
    const mapWidth = mapElement?.clientWidth ?? 0;
    const mapHeight = mapElement?.clientHeight ?? 0;

    if (mapWidth > 0) {
      element.style.maxWidth = `${Math.max(140, mapWidth - padding * 2)}px`;
      element.style.boxSizing = "border-box";
    }

    if (pinnedPosition && mapElement) {
      pinnedPosition = clampCardPosition(
        pinnedPosition.left,
        pinnedPosition.top,
        element,
        mapElement,
        padding,
      );
      element.style.left = `${pinnedPosition.left}px`;
      element.style.top = `${pinnedPosition.top}px`;
      return;
    }

    if (placement === "center" && mapElement) {
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      element.style.left = `${Math.max(padding, (mapWidth - width) / 2)}px`;
      element.style.top = `${Math.max(
        padding,
        Math.min(mapHeight - height - padding, mapHeight * centerVerticalRatio - height / 2),
      )}px`;
      return;
    }

    if (!position) {
      return;
    }

    const projection = overlay.getProjection();
    const offset = projection.fromCoordToOffset(position);
    const width = element.offsetWidth;
    const height = element.offsetHeight;

    let left = offset.x - width / 2;
    let top = offset.y + anchorOffsetY - height;
    const markerTopY = offset.y - markerVisualTopOffset;
    const maxTopAboveMarker = markerTopY - markerGap - height;

    if (mapWidth > 0) {
      left = Math.max(padding, Math.min(left, mapWidth - width - padding));
    }

    if (mapHeight > 0) {
      const maxTopInMap = mapHeight - height - padding;
      if (maxTopAboveMarker < padding) {
        top = Math.max(padding, Math.min(maxTopAboveMarker, maxTopInMap));
      } else {
        top = Math.max(padding, Math.min(top, maxTopInMap, maxTopAboveMarker));
      }
    } else {
      top = Math.min(top, maxTopAboveMarker);
    }

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, select")) {
      return;
    }

    const mapElement = resolveMapElement(overlay, mapContainer);
    if (!mapElement) {
      return;
    }

    dragging = true;
    dragMoved = false;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    const cardRect = element.getBoundingClientRect();
    const mapRect = mapElement.getBoundingClientRect();
    dragOriginLeft = cardRect.left - mapRect.left;
    dragOriginTop = cardRect.top - mapRect.top;
    element.classList.add("partner-map-mini-card--dragging");
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) {
      return;
    }

    const mapElement = resolveMapElement(overlay, mapContainer);
    if (!mapElement) {
      return;
    }

    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragMoved = true;
    }

    pinnedPosition = clampCardPosition(
      dragOriginLeft + dx,
      dragOriginTop + dy,
      element,
      mapElement,
    );
    element.style.left = `${pinnedPosition.left}px`;
    element.style.top = `${pinnedPosition.top}px`;
    event.preventDefault();
    event.stopPropagation();
  };

  const stopDragging = (event: PointerEvent) => {
    if (!dragging) {
      return;
    }

    dragging = false;
    element.classList.remove("partner-map-mini-card--dragging");
    try {
      element.releasePointerCapture(event.pointerId);
    } catch {
      // already released
    }
    event.stopPropagation();
  };

  const onClickCapture = (event: MouseEvent) => {
    if (!dragMoved) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    dragMoved = false;
  };

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", stopDragging);
  element.addEventListener("pointercancel", stopDragging);
  element.addEventListener("click", onClickCapture, true);

  overlay.onRemove = function onRemove() {
    for (const listener of followListeners) {
      window.naver?.maps?.Event.removeListener(listener);
    }
    followListeners.length = 0;
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerup", stopDragging);
    element.removeEventListener("pointercancel", stopDragging);
    element.removeEventListener("click", onClickCapture, true);
    element.classList.remove("partner-map-mini-card--dragging");
    element.remove();
  };

  overlay.close = function close() {
    overlay.setMap(null);
  };

  overlay.setMap(map);
  followListeners.push(
    window.naver.maps.Event.addListener(map, "bounds_changed", () => overlay.draw?.()),
    window.naver.maps.Event.addListener(map, "idle", () => overlay.draw?.()),
    window.naver.maps.Event.addListener(map, "zoom_changed", () => overlay.draw?.()),
  );
  window.requestAnimationFrame(() => {
    overlay.draw?.();
    window.requestAnimationFrame(() => overlay.draw?.());
  });
  return overlay;
}
