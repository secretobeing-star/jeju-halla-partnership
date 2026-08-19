import { createPwaManifestResponse } from "@/lib/pwa-manifest-response";

export const revalidate = 300;

export async function GET() {
  return createPwaManifestResponse();
}
