"use client";

import { useEffect, useMemo, useState } from "react";
import PartnerLocalFranchiseBadge from "@/components/PartnerLocalFranchiseBadge";
import PartnerMapPanel from "@/components/PartnerMapPanel";
import PartnerPhotoGallery from "@/components/PartnerPhotoGallery";
import PartnerReactionButtons from "@/components/PartnerReactionButtons";
import PartnerReviews from "@/components/PartnerReviews";
import { buildPartnerGalleryUrls, fetchPartnerPhotos } from "@/lib/partner-photos";
import { formatPartnerDateRange } from "@/lib/partner-date";
import { getPartnerStatusStyle, getPartnerStatusText, getPartnerBenefitStyle } from "@/lib/partner-status";
import { getPartnerBenefitBoxStyles } from "@/lib/partner-benefit-box-style";
import PartnerBusinessInfo from "@/components/PartnerBusinessInfo";
import PartnerDetailTitleActions from "@/components/PartnerDetailTitleActions";
import { buildPartnerMapOpenUrl } from "@/lib/partner-map-url";
import { getInstagramUrl } from "@/lib/partner-links";
import { partnerAddressMapLinkLabel } from "@/lib/a11y-labels";
import { Partner, PartnerPhoto, SiteSettings } from "@/lib/supabase";
import type { HiddenReviewDisplay } from "@/lib/partner-hidden-review";

type PartnerDetailViewProps = {
  partner: Partner;
  closeLabel?: string;
  detailSectionLabel?: string | null;
  mapSectionLabel?: string | null;
  showLocalFranchiseBadge?: boolean;
  onClose: () => void;
  reactionsEnabled?: boolean;
  reviewsEnabled?: boolean;
  hiddenReviewDisplay?: HiddenReviewDisplay;
  onPartnerReactionChange?: (partnerId: string, likeCount: number) => void;
  onPartnerReviewCountChange?: (partnerId: string, reviewCount: number) => void;
  reportReasons?: string[];
  reportSuccessSettings?: Partial<SiteSettings> | null;
  favoritesEnabled?: boolean;
  favoritesTerm?: string;
  favorited?: boolean;
  onFavoriteToggle?: () => void;
  locateEnabled?: boolean;
  splitLayout?: boolean;
};

export default function PartnerDetailView({
  partner,
  closeLabel = "닫기",
  detailSectionLabel = null,
  mapSectionLabel = null,
  showLocalFranchiseBadge = false,
  onClose,
  reactionsEnabled = false,
  reviewsEnabled = false,
  hiddenReviewDisplay,
  onPartnerReactionChange,
  onPartnerReviewCountChange,
  reportReasons = [],
  reportSuccessSettings,
  favoritesEnabled = false,
  favoritesTerm = "즐겨찾기",
  favorited = false,
  onFavoriteToggle,
  locateEnabled = true,
  splitLayout = false,
}: PartnerDetailViewProps) {
  const instagramUrl = getInstagramUrl(partner.instagram_url);
  const detailText = partner.detail_description?.trim() ?? "";
  const dateRange = formatPartnerDateRange(partner.benefit_start_date, partner.benefit_end_date);
  const statusText = getPartnerStatusText(partner);
  const statusStyle = getPartnerStatusStyle(partner);
  const benefitStyle = getPartnerBenefitStyle(partner);
  const benefitBoxStyles = getPartnerBenefitBoxStyles(null, null);
  const [extraPhotos, setExtraPhotos] = useState<PartnerPhoto[]>([]);
  const mapOpenUrl = buildPartnerMapOpenUrl({
    mapUrl: partner.map_url,
    latitude: partner.latitude,
    longitude: partner.longitude,
    name: partner.name,
    address: partner.address,
  });

  useEffect(() => {
    const dialog = document.querySelector(".board-post-popup-dialog");
    if (dialog instanceof HTMLElement) {
      dialog.scrollTop = 0;
    }
  }, [partner.id]);

  useEffect(() => {
    let cancelled = false;

    void fetchPartnerPhotos(partner.id).then((photos) => {
      if (!cancelled) {
        setExtraPhotos(photos);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [partner.id]);

  const galleryImages = useMemo(
    () => buildPartnerGalleryUrls(partner.image_url, extraPhotos),
    [partner.image_url, extraPhotos],
  );

  const primaryInfo = (
    <>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="partner-detail-view__category inline-block w-fit rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            {partner.category}
          </span>
          <PartnerLocalFranchiseBadge show={showLocalFranchiseBadge} />
        </div>
        <div className="partner-detail-title-row mt-2 flex items-start justify-between gap-3">
          <h2 className="partner-detail-view__name min-w-0 flex-1 text-xl font-bold leading-snug text-gray-900">
            {partner.name}
          </h2>
          <PartnerDetailTitleActions
            partnerName={partner.name}
            favoritesEnabled={favoritesEnabled}
            favoritesTerm={favoritesTerm}
            favorited={favorited}
            onFavoriteToggle={onFavoriteToggle}
            instagramUrl={instagramUrl}
            mapOpenUrl={mapOpenUrl}
          />
        </div>
        <p className="partner-detail-view__address mt-1.5 text-sm leading-relaxed text-gray-700">
          <span className="sr-only">주소 </span>
          <span aria-hidden className="mr-0.5">
            📍
          </span>
          {mapOpenUrl ? (
            <a
              href={mapOpenUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={partnerAddressMapLinkLabel(partner.name, partner.address)}
              className="underline decoration-gray-300 underline-offset-2 transition hover:text-emerald-800 hover:decoration-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              {partner.address}
            </a>
          ) : (
            partner.address
          )}
        </p>
      </div>

      {(dateRange || statusText) && (
        <div className="partner-detail-view__meta flex flex-wrap items-center gap-x-2 gap-y-1">
          {dateRange ? (
            <p className="partner-detail-view__hours flex items-center gap-1 text-sm font-medium text-gray-600">
              <span aria-hidden>📅</span>
              {dateRange}
            </p>
          ) : null}
          {statusText ? (
            <span
              className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-semibold"
              style={statusStyle}
            >
              {statusText}
            </span>
          ) : null}
        </div>
      )}

      {partner.business_info?.trim() ? (
        <PartnerBusinessInfo
          text={partner.business_info.trim()}
          defaultExpanded
          className="partner-detail-view__business-info"
        />
      ) : null}

      {detailText ? (
        <section className="partner-detail-view__detail-section rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
          {detailSectionLabel ? (
            <h3 className="partner-detail-view__menu-title text-sm font-semibold text-gray-900">
              {detailSectionLabel}
            </h3>
          ) : null}
          <div
            className={`partner-detail-view__menu-body partner-detail-description whitespace-pre-line text-sm leading-relaxed text-gray-800 ${detailSectionLabel ? "mt-3" : ""}`}
          >
            {detailText}
          </div>
        </section>
      ) : null}

      {partner.benefit?.trim() ? (
        <div
          className="partner-detail-view__benefit partner-benefit-box rounded-xl border-l-4 px-4 py-3 text-sm leading-relaxed whitespace-pre-line"
          style={{ ...benefitBoxStyles, ...benefitStyle }}
        >
          {partner.benefit}
        </div>
      ) : null}
    </>
  );

  const mapAndReviews = (
    <>
      <PartnerMapPanel
        partner={partner}
        mapSectionLabel={mapSectionLabel}
        favoritesEnabled={favoritesEnabled}
        favorited={favorited}
        locateEnabled={locateEnabled}
        splitPanelMode={splitLayout}
      />

      {(reactionsEnabled || reviewsEnabled) && (
        <div className="partner-detail-view__reviews-wrap flex flex-col gap-3">
          {reviewsEnabled && onPartnerReviewCountChange && hiddenReviewDisplay ? (
            <h3 className="partner-detail-view__reviews-title">후기 · 댓글</h3>
          ) : null}
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
              defaultOpen
              panelLayout={splitLayout}
              reportReasons={reportReasons}
              reportSuccessSettings={reportSuccessSettings}
            />
          )}
        </div>
      )}
    </>
  );

  return (
    <article
      className={["partner-detail-view", splitLayout ? "partner-detail-view--split-layout" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {splitLayout ? (
        <div className="partner-detail-view__columns">
          <div className="partner-detail-view__primary modal-slim-scroll">
            <PartnerPhotoGallery images={galleryImages} alt={partner.name} />
            <div className="partner-detail-view__primary-body space-y-4">{primaryInfo}</div>
          </div>
          <div className="partner-detail-view__secondary modal-slim-scroll space-y-4">{mapAndReviews}</div>
        </div>
      ) : (
        <>
          <PartnerPhotoGallery images={galleryImages} alt={partner.name} />
          <div className="mt-4 space-y-4">
            {primaryInfo}
            {mapAndReviews}
          </div>
        </>
      )}

      {!splitLayout ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            {closeLabel}
          </button>
        </div>
      ) : null}
    </article>
  );
}
