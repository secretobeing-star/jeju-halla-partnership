"use client";

import { useState, useEffect } from "react";
import PartnerFavoriteHeartIcon from "@/components/PartnerFavoriteHeartIcon";
import { formatPartnerDateRange } from "@/lib/partner-date";
import { getPartnerStatusStyle, getPartnerStatusText } from "@/lib/partner-status";
import { partnerHasDetailView } from "@/lib/partner-detail-view";
import { Partner } from "@/lib/supabase";

type PartnerCompactListProps = {
  partners: Partner[];
  selectedPartnerId?: string | null;
  detailEnabled?: boolean;
  onPartnerSelect?: (partnerId: string) => void;
  favoritesEnabled?: boolean;
  favoritesTerm?: string;
  isPartnerFavorite?: (partnerId: string) => boolean;
  hideTimeForFarDistance?: boolean;
  maxDistanceToShowTime?: number; // meters
};

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function PartnerCompactList({
  partners,
  selectedPartnerId = null,
  detailEnabled = false,
  onPartnerSelect,
  favoritesEnabled = false,
  isPartnerFavorite,
  hideTimeForFarDistance = false,
  maxDistanceToShowTime = 5000, // 기본 5km
}: PartnerCompactListProps) {
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!hideTimeForFarDistance) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          setCurrentLocation(null);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [hideTimeForFarDistance]);

  return (
    <ul className="partner-compact-list">
      {partners.map((partner) => {
        const showDetail =
          detailEnabled && onPartnerSelect && partnerHasDetailView(partner);
        
        // 거리 기반 시간 숨김 로직
        let shouldShowTime = true;
        if (hideTimeForFarDistance && currentLocation && partner.latitude && partner.longitude) {
          const distance = getDistanceInMeters(
            currentLocation.latitude,
            currentLocation.longitude,
            Number(partner.latitude),
            Number(partner.longitude)
          );
          shouldShowTime = distance <= maxDistanceToShowTime;
        }

        const dateRange = shouldShowTime ? formatPartnerDateRange(
          partner.benefit_start_date,
          partner.benefit_end_date,
        ) : null;
        
        const statusText = getPartnerStatusText(partner);
        const statusStyle = getPartnerStatusStyle(partner);
        const favorited =
          favoritesEnabled && isPartnerFavorite ? isPartnerFavorite(partner.id) : false;
        const isSelected = selectedPartnerId === partner.id;

        return (
          <li key={partner.id} className="partner-compact-list__item">
            <button
              type="button"
              disabled={!showDetail}
              onClick={() => {
                if (showDetail && onPartnerSelect) {
                  onPartnerSelect(partner.id);
                }
              }}
              className={[
                "partner-compact-list__row",
                isSelected ? "partner-compact-list__row--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={isSelected ? "true" : undefined}
            >
              <span className="partner-compact-list__category">{partner.category}</span>
              <span className="partner-compact-list__title">
                {favorited ? (
                  <span className="partner-compact-list__favorite" aria-hidden>
                    <PartnerFavoriteHeartIcon className="h-3 w-3" />
                  </span>
                ) : null}
                <span className="partner-compact-list__title-text">{partner.name}</span>
              </span>
              <span className="partner-compact-list__meta">
                <span className="partner-compact-list__address">{partner.address}</span>
                {dateRange ? (
                  <span className="partner-compact-list__date">{dateRange}</span>
                ) : null}
                {statusText ? (
                  <span
                    className="partner-compact-list__status"
                    style={statusStyle}
                  >
                    {statusText}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
