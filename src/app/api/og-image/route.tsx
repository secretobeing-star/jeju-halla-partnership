import { ImageResponse } from "next/og";
import { buildOgImagePreviewContent, OG_IMAGE_SIZE } from "@/lib/og-image-preview";
import { getPublicSiteSettingsForMetadata } from "@/lib/site-settings-server";

export const runtime = "edge";

export async function GET() {
  const settings = await getPublicSiteSettingsForMetadata();

  return new ImageResponse(buildOgImagePreviewContent(settings), {
    ...OG_IMAGE_SIZE,
  });
}
