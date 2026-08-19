const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "video/3gpp": "3gp",
  "video/3gp": "3gp",
};

export const IMAGE_UPLOAD_ACCEPT =
  "image/*,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif";

export const MOBILE_IMAGE_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export const VIDEO_UPLOAD_ACCEPT =
  "video/*,video/mp4,video/webm,video/quicktime,video/3gpp,.mp4,.webm,.mov,.m4v,.3gp";

export function resolveUploadExtension(file: File): string {
  const trimmedName = file.name.trim();
  const nameParts = trimmedName.split(".");
  const nameExt = nameParts.length > 1 ? nameParts.pop()?.toLowerCase() : null;

  if (nameExt && /^[a-z0-9]{2,5}$/.test(nameExt)) {
    return nameExt;
  }

  const mimeExt = MIME_TO_EXTENSION[file.type.toLowerCase()];
  if (mimeExt) {
    return mimeExt;
  }

  if (file.type.startsWith("video/")) {
    return "mp4";
  }

  return "jpg";
}

export function resolveUploadContentType(file: File, extension: string): string {
  if (file.type) {
    return file.type;
  }

  if (["mp4", "webm", "mov", "m4v", "3gp"].includes(extension)) {
    if (extension === "mov") {
      return "video/quicktime";
    }
    if (extension === "3gp") {
      return "video/3gpp";
    }
    return `video/${extension}`;
  }

  if (extension === "heic") {
    return "image/heic";
  }
  if (extension === "heif") {
    return "image/heif";
  }
  if (extension === "jpg") {
    return "image/jpeg";
  }

  return `image/${extension}`;
}

export function isVideoUploadFile(file: File) {
  const extension = resolveUploadExtension(file);
  return (
    file.type.startsWith("video/") ||
    ["mp4", "webm", "mov", "m4v", "3gp"].includes(extension)
  );
}

export function getUploadSizeLimitMessage(file: File, maxMb: number | null = null) {
  if (!maxMb || maxMb <= 0) {
    return null;
  }

  if (file.size <= maxMb * 1024 * 1024) {
    return null;
  }

  return `파일 크기가 ${maxMb}MB를 넘습니다. 용량을 줄이거나 PC에서 다시 시도해 주세요.`;
}
