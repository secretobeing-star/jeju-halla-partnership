import type { PublicSiteMetadataSettings } from "@/lib/site-settings-server";
import { resolvePublicSiteDescription, resolvePublicSiteTitle } from "@/lib/site-metadata";

export function buildOgImagePreviewContent(settings: PublicSiteMetadataSettings | null) {
  const title = resolvePublicSiteTitle(settings);
  const description = resolvePublicSiteDescription(settings);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "64px 72px",
        background: "linear-gradient(135deg, #059669 0%, #047857 45%, #065f46 100%)",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "28px",
          fontSize: "28px",
          fontWeight: 700,
          opacity: 0.95,
        }}
      >
        <span>제주한라대학교</span>
      </div>
      <div
        style={{
          fontSize: "56px",
          fontWeight: 800,
          lineHeight: 1.2,
          letterSpacing: "-0.02em",
          maxWidth: "980px",
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: "28px",
          fontSize: "30px",
          lineHeight: 1.45,
          opacity: 0.92,
          maxWidth: "980px",
        }}
      >
        {description}
      </div>
    </div>
  );
}

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
