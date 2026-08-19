export type GeoCoordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

export type GeolocationErrorCode = "unsupported" | "denied" | "unavailable" | "timeout";

export class GeolocationError extends Error {
  code: GeolocationErrorCode;

  constructor(message: string, code: GeolocationErrorCode) {
    super(message);
    this.name = "GeolocationError";
    this.code = code;
  }
}

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 12_000,
  maximumAge: 60_000,
};

export function getCurrentGeolocation(options?: PositionOptions): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(
        new GeolocationError(
          "이 브라우저에서는 위치 기능을 사용할 수 없습니다.",
          "unsupported",
        ),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(
            new GeolocationError(
              "위치 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.",
              "denied",
            ),
          );
          return;
        }

        if (error.code === error.TIMEOUT) {
          reject(new GeolocationError("위치 요청 시간이 초과되었습니다.", "timeout"));
          return;
        }

        reject(new GeolocationError("현재 위치를 확인하지 못했습니다.", "unavailable"));
      },
      { ...DEFAULT_OPTIONS, ...options },
    );
  });
}

/** 제주도 대략 범위 — 안내용 */
export function isWithinJejuIsland(latitude: number, longitude: number) {
  return (
    latitude >= 33.05 &&
    latitude <= 33.58 &&
    longitude >= 126.08 &&
    longitude <= 126.98
  );
}
