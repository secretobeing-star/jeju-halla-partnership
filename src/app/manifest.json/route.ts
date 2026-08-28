import { createPwaManifestResponse } from "@/lib/pwa-manifest-response";

export const revalidate = 0;

export async function GET() {
  return createPwaManifestResponse();
}
