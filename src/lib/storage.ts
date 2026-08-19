import { supabase } from "@/lib/supabase";
import { isPublicBoardUploadFolder, type UploadFolder } from "@/lib/upload-paths";
import {
  resolveUploadExtension,
  isVideoUploadFile,
  getUploadSizeLimitMessage,
} from "@/lib/upload-file-meta";
import {
  prepareUploadFile,
  resizeImageFileForPwaIcon,
  resizeImageFileForUpload,
  NOTIFICATION_IMAGE_MAX_EDGE_PX,
  NOTIFICATION_PROFILE_MAX_EDGE_PX,
} from "@/lib/upload-image-compress";

export type NotificationImageKind = "profile" | "large";

export type { UploadFolder };

function isHeicLikeFile(file: File) {
  const extension = resolveUploadExtension(file);
  const type = file.type.toLowerCase();
  return (
    extension === "heic" ||
    extension === "heif" ||
    type.includes("heic") ||
    type.includes("heif")
  );
}

async function uploadViaApi(file: File, folder: UploadFolder): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const headers: HeadersInit = {};

  if (!isPublicBoardUploadFolder(folder)) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        headers.Authorization = `Bearer ${data.session.access_token}`;
      }
    } catch {
      // 만료·손상된 세션은 무시
    }
  }

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    headers,
  });

  const payload = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error || "업로드에 실패했습니다.");
  }

  return payload.url;
}

async function prepareFileForUpload(file: File, _folder: UploadFolder) {
  const prepared = isVideoUploadFile(file) ? file : await prepareUploadFile(file);

  if (isVideoUploadFile(prepared)) {
    const sizeError = getUploadSizeLimitMessage(prepared, 50);
    if (sizeError) {
      throw new Error(sizeError);
    }
  }

  return prepared;
}

export async function uploadPartnershipMedia(
  file: File,
  folder: UploadFolder,
): Promise<string> {
  return uploadPartnershipImage(file, folder);
}

export async function uploadPartnershipImage(
  file: File,
  folder: UploadFolder,
): Promise<string> {
  if (isVideoUploadFile(file)) {
    const sizeError = getUploadSizeLimitMessage(file, 50);
    if (sizeError) {
      throw new Error(sizeError);
    }
  }

  if (isHeicLikeFile(file)) {
    throw new Error(
      "HEIC 사진은 브라우저에서 표시되지 않습니다. JPG로 저장한 뒤 다시 업로드해 주세요.",
    );
  }

  const prepared = await prepareFileForUpload(file, folder);
  return uploadViaApi(prepared, folder);
}

export async function uploadNotificationImage(
  file: File,
  kind: NotificationImageKind,
): Promise<string> {
  if (isVideoUploadFile(file)) {
    throw new Error("알림 이미지는 사진 파일만 업로드할 수 있습니다.");
  }

  if (isHeicLikeFile(file)) {
    throw new Error(
      "HEIC 사진은 브라우저에서 표시되지 않습니다. JPG로 저장한 뒤 다시 업로드해 주세요.",
    );
  }

  const maxEdge =
    kind === "profile" ? NOTIFICATION_PROFILE_MAX_EDGE_PX : NOTIFICATION_IMAGE_MAX_EDGE_PX;
  const prepared = await resizeImageFileForUpload(file, {
    maxEdge,
    jpegQuality: kind === "profile" ? 0.9 : 0.88,
  });

  return uploadViaApi(prepared, "push-notifications");
}

export async function uploadPwaIcon(file: File): Promise<string> {
  if (isVideoUploadFile(file)) {
    throw new Error("PWA 아이콘은 사진 파일만 업로드할 수 있습니다.");
  }

  if (isHeicLikeFile(file)) {
    throw new Error(
      "HEIC 사진은 브라우저에서 표시되지 않습니다. JPG로 저장한 뒤 다시 업로드해 주세요.",
    );
  }

  const prepared = await resizeImageFileForPwaIcon(file);
  return uploadViaApi(prepared, "pwa-icons");
}

export function getStorageErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("access denied")) {
      return [
        "R2 업로드 권한이 없습니다 (Access Denied).",
        "Cloudflare → R2 → R2 API 토큰 관리에서 토큰을 새로 만드세요.",
        "권한: 「개체 읽기 및 쓰기」(Object Read & Write) — 읽기 전용이면 안 됩니다.",
        "적용 버킷: 업로드용 버킷 이름과 Vercel R2_BUCKET_NAME이 정확히 같은지 확인하세요.",
        "새 Access Key / Secret Key를 Vercel에 넣은 뒤 재배포해 주세요.",
      ].join("\n");
    }
    if (lower.includes("r2_") || lower.includes("r2 storage")) {
      return [
        "Cloudflare R2 업로드 설정이 필요합니다.",
        "Vercel 환경변수(R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL)를 확인한 뒤 재배포해 주세요.",
      ].join("\n");
    }
    if (lower.includes("invalid compact jws") || lower.includes("jwt")) {
      return [
        "업로드 인증 오류입니다.",
        "브라우저에 남은 로그인 정보 때문일 수 있습니다.",
        "1) 시크릿/새 탭에서 다시 시도",
        "2) 관리자에서 다시 로그인",
        "3) 「사진 링크」 버튼으로 URL 입력",
      ].join("\n");
    }
    if (lower.includes("supabase_service_role_key")) {
      return [
        "서버 업로드 설정이 필요합니다.",
        "Vercel 환경변수(SUPABASE_SERVICE_ROLE_KEY, R2_*)를 확인한 뒤 재배포해 주세요.",
        "또는 「사진 링크」 버튼으로 URL을 넣을 수 있습니다.",
      ].join("\n");
    }
    if (
      lower.includes("payload too large") ||
      lower.includes("request entity too large") ||
      lower.includes("413")
    ) {
      return "파일이 너무 큽니다. 「더 작은 크기」로 보내거나 사진 링크 기능을 사용해 주세요.";
    }
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }

  return "알 수 없는 오류가 발생했습니다.";
}
