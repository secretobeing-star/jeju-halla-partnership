/** 제주한라대학교 (제주시 한라대학로 38) */
export const JEJU_HALLA_UNIVERSITY = {
  latitude: 33.248611,
  longitude: 126.4125,
  name: "제주한라대학교",
  address: "제주특별자치도 제주시 한라대학로 38",
} as const;

export function getMainPartnerMapOriginCenter(hasFavorites: boolean) {
  return hasFavorites
    ? { latitude: 33.499621, longitude: 126.531188 }
    : JEJU_HALLA_UNIVERSITY;
}
