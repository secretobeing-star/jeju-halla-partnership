declare namespace naver.maps {
  class LatLng {
    constructor(lat: number, lng: number);
  }

  class LatLngBounds {
    constructor(sw?: LatLng, ne?: LatLng);
    extend(point: LatLng): LatLngBounds;
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }

  class Map {
    constructor(element: HTMLElement | string, options: MapOptions);
    autoResize(): void;
    setCenter(center: LatLng): void;
    getZoom(): number;
    setZoom(zoom: number): void;
    fitBounds(bounds: LatLngBounds, margin?: FitBoundsMargin | number): void;
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    setPosition(position: LatLng): void;
    getPosition?(): LatLng;
    getElement?(): HTMLElement | null;
  }

  class OverlayView {
    constructor();
    getMap(): Map | null;
    setMap(map: Map | null): void;
    getPanes(): MapPanes;
    getProjection(): MapSystemProjection;
    draw?(): void;
    onAdd?(): void;
    onRemove?(): void;
  }

  interface MapPanes {
    floatPane: HTMLElement;
    overlayMouseTarget: HTMLElement;
  }

  interface MapSystemProjection {
    fromCoordToOffset(coord: LatLng): Point;
  }

  class InfoWindow {
    constructor(options: InfoWindowOptions);
    open(map: Map, marker: Marker): void;
    close(): void;
    setContent(content: HTMLElement | string): void;
  }

  class MarkerClustering {
    constructor(options: MarkerClusteringOptions);
    setMap(map: Map | null): void;
  }

  namespace Event {
    function addListener(target: unknown, eventName: string, listener: () => void): unknown;
    function removeListener(listener: unknown): void;
  }

  interface HtmlIcon {
    content: HTMLElement | string;
    size: Size;
    scaledSize?: Size;
    origin?: Point;
    anchor: Point;
  }

  interface MapOptions {
    center: LatLng;
    zoom: number;
    scaleControl?: boolean;
    mapDataControl?: boolean;
    logoControl?: boolean;
    zoomControl?: boolean;
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map | null;
    title?: string;
    icon?: HtmlIcon;
    zIndex?: number;
  }

  interface InfoWindowOptions {
    content: HTMLElement | string;
    borderWidth?: number;
    backgroundColor?: string;
    disableAnchor?: boolean;
    pixelOffset?: Point;
  }

  interface MarkerClusteringOptions {
    map: Map;
    markers: Marker[];
    minClusterSize?: number;
    maxZoom?: number;
    gridSize?: number;
    disableClickZoom?: boolean;
    icons?: HtmlIcon[];
    indexGenerator?: number[];
    stylingFunction?: (clusterMarker: Marker, count: number) => void;
  }

  interface FitBoundsMargin {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  }
}

interface Window {
  naver?: {
    maps: typeof naver.maps;
  };
}
