import SiteFooterSocialLinks from "@/components/SiteFooterSocialLinks";
import { getOptionalTextColor, renderTextWithOptionalLink } from "@/lib/footer-text";
import { getSiteFooterDisplay } from "@/lib/site-footer";
import type { SiteSettings } from "@/lib/supabase";

type SiteFooterProps = Pick<
  SiteSettings,
  | "footer_text"
  | "footer_link_label"
  | "footer_link_url"
  | "footer_privacy_policy_url"
  | "footer_terms_url"
  | "footer_business_line1"
  | "footer_business_line2"
  | "footer_copyright"
  | "footer_image_url"
  | "footer_image2_url"
  | "footer_text_color"
  | "footer_dark_background_enabled"
  | "footer_social_hints_enabled"
  | "footer_social_notify_enabled"
  | "footer_social_links"
>;

export default function SiteFooter({
  footer_text,
  footer_link_label,
  footer_link_url,
  footer_privacy_policy_url,
  footer_terms_url,
  footer_business_line1,
  footer_business_line2,
  footer_copyright,
  footer_image_url,
  footer_image2_url,
  footer_text_color,
  footer_dark_background_enabled = false,
  footer_social_hints_enabled = true,
  footer_social_notify_enabled = true,
  footer_social_links = [],
}: SiteFooterProps) {
  const {
    imageUrls,
    businessLine1,
    businessLine2,
    copyright,
    text,
    links,
    socialLinks,
    legacyWholeTextLink,
    legacyLinkUrl,
  } = getSiteFooterDisplay({
    footer_text,
    footer_link_label,
    footer_link_url,
    footer_privacy_policy_url,
    footer_terms_url,
    footer_business_line1,
    footer_business_line2,
    footer_copyright,
    footer_image_url,
    footer_image2_url,
    footer_social_links,
  });

  const darkBackground = footer_dark_background_enabled ?? false;
  const textColor = getOptionalTextColor(footer_text_color);
  const lineClassName = "site-optional-text text-sm leading-relaxed";
  const hasTopRow = links.length > 0 || socialLinks.length > 0;
  const hasMainBlock = Boolean(
    imageUrls.length > 0 || businessLine1 || businessLine2 || copyright,
  );
  const showExtraTextDivider = Boolean(text && (hasTopRow || hasMainBlock));

  return (
    <footer
      className={[
        "site-footer border-t px-4 py-6 text-sm leading-relaxed sm:px-6",
        darkBackground
          ? "site-footer--dark border-gray-700 bg-[#111827] text-gray-200"
          : "border-gray-200 bg-white text-center",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        {hasTopRow ? (
          <div className="site-footer-top-row flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            {links.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-start">
                {links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="site-footer-policy-link text-sm font-medium transition hover:opacity-90"
                    style={darkBackground ? undefined : { color: textColor }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ) : (
              <span className="hidden sm:block" aria-hidden />
            )}

            {socialLinks.length > 0 ? (
              <SiteFooterSocialLinks
                items={socialLinks}
                darkBackground={darkBackground}
                hintsEnabled={footer_social_hints_enabled ?? true}
                notifyEnabled={footer_social_notify_enabled ?? true}
              />
            ) : null}
          </div>
        ) : null}

        {hasMainBlock ? (
          <div
            className={[
              "flex w-full flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6",
              darkBackground || hasTopRow ? "sm:justify-start sm:text-left" : "sm:justify-center",
            ].join(" ")}
          >
            {imageUrls.length > 0 ? (
              <div className="site-footer-image-wrap flex shrink-0 flex-wrap items-center justify-center gap-3 sm:justify-start">
                {imageUrls.map((url, index) => (
                  <img
                    key={`${url}-${index}`}
                    alt=""
                    src={url}
                    className="site-footer-image mx-auto h-16 w-auto max-w-[140px] object-contain sm:mx-0 sm:h-20 sm:max-w-[160px]"
                  />
                ))}
              </div>
            ) : null}

            <div className="flex min-w-0 flex-col items-center gap-2 sm:items-start">
              {businessLine1 ? (
                <p className={lineClassName} style={{ color: textColor }}>
                  {businessLine1}
                </p>
              ) : null}

              {businessLine2 ? (
                <p className={`${lineClassName} whitespace-pre-line`} style={{ color: textColor }}>
                  {businessLine2}
                </p>
              ) : null}

              {copyright ? (
                <p className={`${lineClassName} text-xs sm:text-sm`} style={{ color: textColor }}>
                  {copyright}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {text ? (
          <div
            className={[
              showExtraTextDivider ? "w-full border-t pt-3" : "w-full",
              darkBackground ? "border-gray-700" : "border-gray-200",
            ].join(" ")}
          >
            {legacyWholeTextLink ? (
              renderTextWithOptionalLink(text, legacyLinkUrl, {
                textColor: footer_text_color,
                linkClassName: "hover:opacity-90",
              })
            ) : (
              <p className={`${lineClassName} whitespace-pre-line`} style={{ color: textColor }}>
                {text}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </footer>
  );
}
