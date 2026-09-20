type ClusterHandle = {
  redraw: () => void;
  destroy: () => void;
};

type ClusterInput = {
  map: naver.maps.Map;
  markers: Array<{ marker: naver.maps.Marker; latitude: number; longitude: number }>;
  gridSize?: number;
  maxZoom?: number;
  minClusterSize?: number;
  iconForCount: (count: number) => naver.maps.HtmlIcon;
  stylingFunction?: (clusterMarker: naver.maps.Marker, count: number) => void;
};

function lngLatToWorld(lng: number, lat: number, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const clamped = Math.min(85.05112878, Math.max(-85.05112878, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

export function createPartnerMarkerClustering(input: ClusterInput): ClusterHandle {
  const gridSize = input.gridSize ?? 120;
  const maxZoom = input.maxZoom ?? 16;
  const minClusterSize = input.minClusterSize ?? 2;
  let clusterMarkers: naver.maps.Marker[] = [];
  const mapListeners: unknown[] = [];
  let clusterClickListeners: unknown[] = [];
  let destroyed = false;
  let redrawTimer: number | null = null;

  function clearClusters() {
    for (const listener of clusterClickListeners) {
      window.naver?.maps?.Event.removeListener(listener);
    }
    clusterClickListeners = [];
    for (const marker of clusterMarkers) {
      marker.setMap(null);
    }
    clusterMarkers = [];
  }

  function showAllMembers() {
    for (const item of input.markers) {
      item.marker.setMap(input.map);
    }
  }

  function hideAllMembers() {
    for (const item of input.markers) {
      item.marker.setMap(null);
    }
  }

  function redraw() {
    if (destroyed || !window.naver?.maps) return;

    const zoom = input.map.getZoom();
    clearClusters();

    if (input.markers.length <= 1 || zoom > maxZoom) {
      showAllMembers();
      return;
    }

    const buckets = new Map<string, typeof input.markers>();
    for (const item of input.markers) {
      const point = lngLatToWorld(item.longitude, item.latitude, zoom);
      const key = `${Math.floor(point.x / gridSize)}:${Math.floor(point.y / gridSize)}`;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.push(item);
      } else {
        buckets.set(key, [item]);
      }
    }

    hideAllMembers();

    for (const group of buckets.values()) {
      if (group.length < minClusterSize) {
        for (const item of group) {
          item.marker.setMap(input.map);
        }
        continue;
      }

      const latitude = group.reduce((sum, item) => sum + item.latitude, 0) / group.length;
      const longitude = group.reduce((sum, item) => sum + item.longitude, 0) / group.length;
      const count = group.length;
      const icon = input.iconForCount(count);
      const clusterMarker = new window.naver.maps.Marker({
        map: input.map,
        position: new window.naver.maps.LatLng(latitude, longitude),
        icon,
        zIndex: 200 + count,
        title: `${count}곳`,
      });
      input.stylingFunction?.(clusterMarker, count);

      const zoomIn = () => {
        const nextZoom = Math.min(21, input.map.getZoom() + 2);
        input.map.setCenter(new window.naver.maps.LatLng(latitude, longitude));
        input.map.setZoom(nextZoom);
      };
      clusterClickListeners.push(window.naver.maps.Event.addListener(clusterMarker, "click", zoomIn));
      const element = clusterMarker.getElement?.();
      const clickTarget = element?.querySelector(".partner-map-cluster") ?? element;
      clickTarget?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        zoomIn();
      });
      clusterMarkers.push(clusterMarker);
    }
  }

  function scheduleRedraw() {
    if (redrawTimer != null) {
      window.clearTimeout(redrawTimer);
    }
    redrawTimer = window.setTimeout(() => {
      redrawTimer = null;
      redraw();
    }, 20);
  }

  mapListeners.push(
    window.naver.maps.Event.addListener(input.map, "idle", () => scheduleRedraw()),
    window.naver.maps.Event.addListener(input.map, "zoom_changed", () => scheduleRedraw()),
  );

  redraw();

  return {
    redraw,
    destroy() {
      destroyed = true;
      if (redrawTimer != null) {
        window.clearTimeout(redrawTimer);
      }
      clearClusters();
      for (const listener of mapListeners) {
        window.naver?.maps?.Event.removeListener(listener);
      }
    },
  };
}
