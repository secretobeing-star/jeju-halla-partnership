export type AdMediaKind = "image" | "gif" | "video";

export function getAdMediaKind(url: string): AdMediaKind {
  const path = url.split(/[?#]/)[0]?.toLowerCase() ?? "";

  if (/\.(mp4|webm|mov|m4v|3gp)$/.test(path)) {
    return "video";
  }

  if (path.endsWith(".gif")) {
    return "gif";
  }

  return "image";
}

export function isVideoFile(file: File) {
  return (
    file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|3gp)$/i.test(file.name)
  );
}

export function isGifFile(file: File) {
  return file.type === "image/gif" || /\.gif$/i.test(file.name);
}

export function getAdUploadAccept(allowVideoGif: boolean) {
  return allowVideoGif
    ? "image/*,image/heic,image/heif,.heic,.heif,video/*,video/mp4,video/webm,video/quicktime,video/3gpp,.gif,.mp4,.webm,.mov,.m4v,.3gp"
    : "image/*,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp";
}

export function getAdUploadLabel(allowVideoGif: boolean) {
  return allowVideoGif ? "이미지·동영상·GIF 업로드" : "이미지 업로드";
}

export function isVideoOrGifFile(file: File) {
  return isVideoFile(file) || isGifFile(file);
}

export function validateAdMediaUpload(file: File, allowVideoGif: boolean): string | null {
  if (isVideoOrGifFile(file) && !allowVideoGif) {
    return "동영상·GIF 업로드는 개발자 모드에서 '광고 동영상 / GIF'를 활성화한 후 이용할 수 있습니다.";
  }

  return null;
}

export function canDisplayAdMedia(url: string, allowVideoGif: boolean): boolean {
  const kind = getAdMediaKind(url);
  if (kind === "image") {
    return true;
  }

  return allowVideoGif;
}

export function getAdMediaTypeLabel(url: string): string {
  const kind = getAdMediaKind(url);
  if (kind === "video") {
    return "동영상";
  }
  if (kind === "gif") {
    return "GIF";
  }
  return "이미지";
}
