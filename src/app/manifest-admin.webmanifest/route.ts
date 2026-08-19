import { createAdminPwaManifestResponse } from "@/lib/pwa-admin-manifest-response";

export const revalidate = 300;

export async function GET() {
  return createAdminPwaManifestResponse();
}
