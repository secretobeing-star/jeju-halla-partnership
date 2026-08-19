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

  const overlay = new window.naver.maps.OverlayView() as MiniCardOverlayInstance;

  overlay.onAdd = function onAdd() {
    const pane = overlay.getPanes().overlayMouseTarget ?? overlay.getPanes().floatPane;
    pane.appendChild(element);
  };

  overlay.draw = function draw() {
    if (!overlay.getMap()) {
      return;
    }

    if (placement === "center" && mapContainer) {
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      const mapWidth = mapContainer.clientWidth;
      const mapHeight = mapContainer.clientHeight;

      element.style.left = `${Math.max(8, (mapWidth - width) / 2)}px`;
      element.style.top = `${Math.max(
        8,
        Math.min(mapHeight - height - 8, mapHeight * centerVerticalRatio - height / 2),
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
    const mapElement = mapContainer;
    const mapWidth = mapElement?.clientWidth ?? 0;
    const mapHeight = mapElement?.clientHeight ?? 0;
    const padding = 8;

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
        top = maxTopAboveMarker;
      } else {
        top = Math.max(padding, Math.min(top, maxTopInMap, maxTopAboveMarker));
      }
    } else {
      top = Math.min(top, maxTopAboveMarker);
    }

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  };

  overlay.onRemove = function onRemove() {
    element.remove();
  };

  overlay.close = function close() {
    overlay.setMap(null);
  };

  overlay.setMap(map);
  window.requestAnimationFrame(() => {
    overlay.draw?.();
  });
  return overlay;
}
