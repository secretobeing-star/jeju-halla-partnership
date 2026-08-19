"use client";

import { useState, type CSSProperties } from "react";
import PartnerLocalFranchiseBadge from "@/components/PartnerLocalFranchiseBadge";
import PartnerCardImage from "@/components/PartnerCardImage";
import PartnerBusinessInfo from "@/components/PartnerBusinessInfo";
import PartnerFavoriteButton from "@/components/PartnerFavoriteButton";
import PartnerFavoriteHeartIcon from "@/components/PartnerFavoriteHeartIcon";
import PartnerReactionButtons from "@/components/PartnerReactionButtons";
import PartnerReviews from "@/components/PartnerReviews";
import {
  PARTNER_IMAGE_COMPACT_ASPECT_CLASS,
  PARTNER_IMAGE_PLACEHOLDER_ASPECT_CLASS,
} from "@/lib/partner-image-size";
import { formatPartnerDateRange } from "@/lib/partner-date";
import { getPartnerStatusStyle, getPartnerStatusText, getPartnerBenefitStyle } from "@/lib/partner-status";
import { buildPartnerMapOpenUrl } from "@/lib/partner-map-url";
import { getInstagramUrl } from "@/lib/partner-links";
import { partnerHasDetailView } from "@/lib/partner-detail-view";
import {
  DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_DESKTOP,
  DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MOBILE,
  normalizePartnerBenefitHeight,
} from "@/lib/partner-benefit-height";
import { getPartnerBenefitBoxStyles } from "@/lib/partner-benefit-box-style";
import {
  partnerInstagramLinkLabel,
  partnerMapLinkLabel,
  partnerMoreButtonLabel,
} from "@/lib/a11y-labels";
import { Partner } from "@/lib/supabase";
import type { HiddenReviewDisplay } from "@/lib/partner-hidden-review";

type PartnerPostGridProps = {
  partners: Partner[];
  gridColumns?: number | null;
  benefitMinHeightMobile?: number;
  benefitMinHeightDesktop?: number;
  benefitBoxBgColor?: string | null;
  benefitBoxBorderColor?: string | null;
  businessInfoDefaultExpanded?: boolean;
  reactionsEnabled?: boolean;
  reviewsEnabled?: boolean;
  hiddenReviewDisplay?: HiddenReviewDisplay;
  detailEnabled?: boolean;
  localFranchiseByPartnerId?: Record<string, boolean>;
  onPartnerSelect?: (partnerId: string) => void;
  onPartnerReactionChange?: (partnerId: string, likeCount: number) => void;
  onPartnerReviewCountChange?: (partnerId: string, reviewCount: number) => void;
  favoritesEnabled?: boolean;
  favoritesTerm?: string;
  isPartnerFavorite?: (partnerId: string) => boolean;
  onPartnerFavoriteToggle?: (partnerId: string) => void;
  reportReasons?: string[];
  reportSuccessSettings?: Partial<import("@/lib/supabase").SiteSettings> | null;
  selectedPartnerId?: string | null;
};

export default function PartnerPostGrid({
  partners,
  gridColumns = null,
  benefitMinHeightMobile = DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MOBILE,
  benefitMinHeightDesktop = DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_DESKTOP,
  benefitBoxBgColor = null,
  benefitBoxBorderColor = null,
  businessInfoDefaultExpanded = false,
  reactionsEnabled = false,
  reviewsEnabled = false,
  hiddenReviewDisplay,
  detailEnabled = false,
  localFranchiseByPartnerId = {},
  onPartnerSelect,
  onPartnerReactionChange,
  onPartnerReviewCountChange,
  favoritesEnabled = false,
  favoritesTerm = "즐겨찾기",
  isPartnerFavorite,
  onPartnerFavoriteToggle,
  reportReasons = [],
  reportSuccessSettings,
  selectedPartnerId = null,
}: PartnerPostGridProps) {
  const [expandedPartnerId, setExpandedPartnerId] = useState<string | null>(null);

  const mobileHeight = normalizePartnerBenefitHeight(
    benefitMinHeightMobile,
    DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MOBILE,
  );
  const desktopHeight = normalizePartnerBenefitHeight(
    benefitMinHeightDesktop,
    DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_DESKTOP,
  );
  const benefitBoxStyles = getPartnerBenefitBoxStyles(
    benefitBoxBgColor,
    benefitBoxBorderColor,
  );

  return (
    <div
      className={`partner-grid site-main-width mx-auto grid w-full gap-3 sm:gap-4 ${
        gridColumns ? "" : "partner-grid--compact partner-grid--auto-cols"
      }`}
      style={
        {
          ...(gridColumns
            ? { gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }
            : {}),
          "--partner-benefit-min-h-mobile": `${mobileHeight}px`,
          "--partner-benefit-min-h-desktop": `${desktopHeight}px`,
        } as CSSProperties
      }
    >
      {partners.map((partner) => {
        const mapOpenUrl = buildPartnerMapOpenUrl({
          mapUrl: partner.map_url,
          latitude: partner.latitude,
          longitude: partner.longitude,
          name: partner.name,
          address: partner.address,
        });
        const instagramUrl = getInstagramUrl(partner.instagram_url);
        const showDetailPopup =
          detailEnabled && onPartnerSelect && partnerHasDetailView(partner);
        const isExpanded = expandedPartnerId === partner.id;

        const dateRange = formatPartnerDateRange(
          partner.benefit_start_date,
          partner.benefit_end_date,
        );
        const statusText = getPartnerStatusText(partner);
        const statusStyle = getPartnerStatusStyle(partner);
        const benefitStyle = getPartnerBenefitStyle(partner);
        const showFavoriteToggle =
          favoritesEnabled && isPartnerFavorite && onPartnerFavoriteToggle;
        const favorited = showFavoriteToggle ? isPartnerFavorite(partner.id) : false;

        const favoriteButton = showFavoriteToggle ? (
          <PartnerFavoriteButton
            favorited={favorited}
            label={partner.name}
            placement="edge"
            favoritesTerm={favoritesTerm}
            onToggle={() => onPartnerFavoriteToggle(partner.id)}
          />
        ) : null;

        const openDetailFromImage =
          showDetailPopup && onPartnerSelect
            ? () => onPartnerSelect(partner.id)
            : undefined;

        function handleMoreClick() {
          if (showDetailPopup && onPartnerSelect) {
            onPartnerSelect(partner.id);
            return;
          }

          setExpandedPartnerId((current) => (current === partner.id ? null : partner.id));
        }

        const partnerImage = partner.image_url ? (
          <PartnerCardImage
            src={partner.image_url}
            alt={`${partner.name} 대표 이미지`}
            variant="compact"
            onDetailClick={openDetailFromImage}
            detailAriaLabel={`${partner.name} 상세 보기`}
          />
        ) : (
          <div
            className={`${PARTNER_IMAGE_COMPACT_ASPECT_CLASS} relative flex w-full items-center justify-center bg-gray-100 text-xs text-gray-400`}
          >
            {openDetailFromImage ? (
              <button
                type="button"
                onClick={openDetailFromImage}
                className="absolute inset-0 z-[15] cursor-pointer border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                aria-label={`${partner.name} 상세 보기`}
              />
            ) : null}
            이미지 없음
          </div>
        );

        return (
          <article
            key={partner.id}
            className={`partner-card flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100 ${
              isExpanded && !showDetailPopup ? "partner-card--expanded" : ""
            }${selectedPartnerId === partner.id ? " partner-card--split-selected" : ""}`}
          >
            <div className="partner-card__media relative shrink-0">
              {partnerImage}
              {favoriteButton}
            </div>

            <div
              className={`partner-card__content flex flex-1 flex-col p-2.5 sm:p-3${
                showFavoriteToggle ? " partner-card__content--with-favorite" : ""
              }`}
            >
              <h2 className="partner-card__name line-clamp-2 text-sm font-bold leading-snug text-gray-900 sm:text-[0.9375rem]">
                {favorited ? (
                  <span className="partner-card__favorite-badge mr-1 inline-flex align-middle text-pink-500">
                    <PartnerFavoriteHeartIcon className="h-3.5 w-3.5" />
                    <span className="sr-only">{favoritesTerm}됨</span>
                  </span>
                ) : null}
                {partner.name}
              </h2>

              <p className="partner-card__address mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-700 sm:text-xs">
                <span className="sr-only">주소 </span>
                <span aria-hidden className="mr-0.5">
                  📍
                </span>
                {partner.address}
              </p>

              <button
                type="button"
                onClick={handleMoreClick}
                className="partner-card__more-btn mt-auto w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-800 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                aria-expanded={showDetailPopup ? undefined : isExpanded}
                aria-haspopup={showDetailPopup ? "dialog" : undefined}
                aria-label={partnerMoreButtonLabel(partner.name, isExpanded, Boolean(showDetailPopup))}
              >
                {isExpanded && !showDetailPopup ? "접기" : "더보기"}
              </button>
            </div>

            {isExpanded && !showDetailPopup ? (
              <div className="border-t border-gray-100 p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-block w-fit rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    {partner.category}
                  </span>
                  <PartnerLocalFranchiseBadge
                    show={Boolean(localFranchiseByPartnerId[partner.id])}
                  />
                </div>

                <div className="partner-card-meta mt-2 min-h-0">
                  {(dateRange || statusText) && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {dateRange && (
                        <p className="flex items-center gap-1 text-xs font-medium text-gray-600">
                          <span aria-hidden className="text-sm leading-none">
                            📅
                          </span>
                          {dateRange}
                        </p>
                      )}
                      {statusText && (
                        <span
                          className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-semibold"
                          style={statusStyle}
                        >
                          {statusText}
                        </span>
                      )}
                    </div>
                  )}

                  {partner.business_info?.trim() ? (
                    <PartnerBusinessInfo
                      text={partner.business_info.trim()}
                      defaultExpanded={businessInfoDefaultExpanded}
                      className={dateRange || statusText ? "mt-2" : ""}
                    />
                  ) : null}
                </div>

                <div
                  className="partner-benefit-box mt-3 border-l-4 px-3 py-2.5 text-xs leading-relaxed whitespace-pre-line sm:text-sm"
                  style={{ ...benefitBoxStyles, ...benefitStyle }}
                >
                  {partner.benefit}
                </div>

                {(reactionsEnabled || reviewsEnabled) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {reactionsEnabled && onPartnerReactionChange && (
                      <PartnerReactionButtons
                        partnerId={partner.id}
                        likeCount={partner.like_count ?? 0}
                        enabled={reactionsEnabled}
                        onCountsChange={onPartnerReactionChange}
                      />
                    )}
                    {reviewsEnabled && onPartnerReviewCountChange && hiddenReviewDisplay && (
                      <PartnerReviews
                        partnerId={partner.id}
                        reviewCount={partner.review_count ?? 0}
                        enabled={reviewsEnabled}
                        hiddenReviewDisplay={hiddenReviewDisplay}
                        onReviewCountChange={onPartnerReviewCountChange}
                        reportReasons={reportReasons}
                        reportSuccessSettings={reportSuccessSettings}
                      />
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-col gap-2">
                  {mapOpenUrl && (
                    <a
                      href={mapOpenUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={partnerMapLinkLabel(partner.name)}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    >
                      네이버 지도 보기
                    </a>
                  )}
                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={partnerInstagramLinkLabel(partner.name)}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-xs font-medium text-pink-800 transition hover:bg-pink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
                    >
                      인스타그램 보기
                    </a>
                  )}
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
