type ClusterHandle = {
  redraw: () => void;
  destroy: () => void;
};

type ClusterMember = { marker: naver.maps.Marker; latitude: number; longitude: number };

type ClusterInput = {
  map: naver.maps.Map;
  markers: ClusterMember[];
  gridSize?: number;
  maxZoom?: number;
  minClusterSize?: number;
  iconForCount: (count: number) => naver.maps.HtmlIcon;
  stylingFunction?: (clusterMarker: naver.maps.Marker, count: number) => void;
};

const CLUSTER_FIT_MARGIN = { top: 72, right: 48, bottom: 96, left: 48 };
const TINY_BOUNDS_DEG = 0.00035;

function lngLatToWorld(lng: number, lat: number, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const clamped = Math.min(85.05112878, Math.max(-85.05112878, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function groupCentroid(group: ClusterMember[]) {
  const latitude = group.reduce((sum, item) => sum + item.latitude, 0) / group.length;
  const longitude = group.reduce((sum, item) => sum + item.longitude, 0) / group.length;
  return { latitude, longitude };
}

function groupIsTiny(group: ClusterMember[]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const item of group) {
    minLat = Math.min(minLat, item.latitude);
    maxLat = Math.max(maxLat, item.latitude);
    minLng = Math.min(minLng, item.longitude);
    maxLng = Math.max(maxLng, item.longitude);
  }
  return maxLat - minLat < TINY_BOUNDS_DEG && maxLng - minLng < TINY_BOUNDS_DEG;
}

export function createPartnerMarkerClustering(input: ClusterInput): ClusterHandle {
  const gridSize = input.gridSize ?? 120;
  const maxZoom = input.maxZoom ?? 16;
  const minClusterSize = input.minClusterSize ?? 2;
  let clusterMarkers: naver.maps.Marker[] = [];
  const mapListeners: unknown[] = [];
  let clusterClickListeners: unknown[] = [];
  const clusterDomCleanups: Array<() => void> = [];
  let destroyed = false;
  let redrawTimer: number | null = null;
  let clusterClickLock = false;

  function clearClusters() {
    for (const listener of clusterClickListeners) {
      window.naver?.maps?.Event.removeListener(listener);
    }
    clusterClickListeners = [];
    for (const cleanup of clusterDomCleanups) {
      cleanup();
    }
    clusterDomCleanups.length = 0;
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

  function zoomToGroup(group: ClusterMember[]) {
    if (destroyed || !window.naver?.maps || clusterClickLock || group.length === 0) {
      return;
    }

    clusterClickLock = true;
    window.setTimeout(() => {
      clusterClickLock = false;
    }, 280);

    const maps = window.naver.maps;
    const map = input.map;
    const currentZoom = map.getZoom();
    const { latitude, longitude } = groupCentroid(group);
    const center = new maps.LatLng(latitude, longitude);

    if (groupIsTiny(group)) {
      map.setCenter(center);
      map.setZoom(Math.min(21, Math.max(maxZoom + 1, currentZoom + 2)));
      return;
    }

    const bounds = new maps.LatLngBounds();
    for (const item of group) {
      bounds.extend(new maps.LatLng(item.latitude, item.longitude));
    }
    map.fitBounds(bounds, CLUSTER_FIT_MARGIN);

    window.setTimeout(() => {
      if (destroyed) return;
      const fittedZoom = map.getZoom();
      if (fittedZoom <= currentZoom) {
        map.setCenter(center);
        map.setZoom(Math.min(21, Math.max(maxZoom + 1, currentZoom + 2)));
      }
    }, 80);
  }

  function bindClusterDomClick(clusterMarker: naver.maps.Marker, group: ClusterMember[]) {
    const onDomClick = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      zoomToGroup(group);
    };

    const attach = () => {
      if (destroyed) return;
      const element = clusterMarker.getElement?.();
      if (!(element instanceof HTMLElement)) {
        return false;
      }
      const clickTarget =
        element.querySelector(".partner-map-cluster") instanceof HTMLElement
          ? element.querySelector(".partner-map-cluster")
          : element;
      if (!(clickTarget instanceof HTMLElement)) {
        return false;
      }
      clickTarget.addEventListener("click", onDomClick);
      clusterDomCleanups.push(() => {
        clickTarget.removeEventListener("click", onDomClick);
      });
      return true;
    };

    if (!attach()) {
      window.requestAnimationFrame(() => {
        attach();
      });
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

    const buckets = new Map<string, ClusterMember[]>();
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

      const { latitude, longitude } = groupCentroid(group);
      const count = group.length;
      const icon = input.iconForCount(count);
      const clusterMarker = new window.naver.maps.Marker({
        map: input.map,
        position: new window.naver.maps.LatLng(latitude, longitude),
        icon,
        zIndex: 200 + count,
        title: `${count}곳`,
        clickable: true,
      });
      input.stylingFunction?.(clusterMarker, count);

      clusterClickListeners.push(
        window.naver.maps.Event.addListener(clusterMarker, "click", () => zoomToGroup(group)),
      );
      bindClusterDomClick(clusterMarker, group);
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
