import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { isR2StorageConfigured, uploadBufferToR2 } from "@/lib/r2-storage";
import {
  isAllowedUploadFolder,
  isPublicBoardUploadFolder,
} from "@/lib/upload-paths";
import {
  resolveUploadContentType,
  resolveUploadExtension,
} from "@/lib/upload-file-meta";

export { isAllowedUploadFolder, isPublicBoardUploadFolder as isPublicBoardFolder };

export async function uploadFileToPartnershipStorage(file: File, folder: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = resolveUploadExtension(file);
  const contentType = resolveUploadContentType(file, extension);

  return uploadBufferToPartnershipStorage(buffer, folder, extension, contentType);
}

export async function uploadBufferToPartnershipStorage(
  buffer: Buffer,
  folder: string,
  extension: string,
  contentType: string,
) {
  if (!isR2StorageConfigured()) {
    throw new Error(
      "R2 Storage가 설정되지 않았습니다. Vercel 환경변수(R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL)를 확인해 주세요.",
    );
  }

  return uploadBufferToR2(buffer, folder, extension, contentType);
}

export async function verifyAuthenticatedUser(accessToken: string) {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}
