"use client";

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
};

export default function PartnerCompactList({
  partners,
  selectedPartnerId = null,
  detailEnabled = false,
  onPartnerSelect,
  favoritesEnabled = false,
  isPartnerFavorite,
}: PartnerCompactListProps) {
  return (
    <ul className="partner-compact-list">
      {partners.map((partner) => {
        const showDetail =
          detailEnabled && onPartnerSelect && partnerHasDetailView(partner);
        const dateRange = formatPartnerDateRange(
          partner.benefit_start_date,
          partner.benefit_end_date,
        );
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
