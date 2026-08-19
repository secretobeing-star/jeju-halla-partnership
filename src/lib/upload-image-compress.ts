import { isVideoUploadFile, resolveUploadExtension } from "@/lib/upload-file-meta";

const DESKTOP_MAX_EDGE_PX = 4096;
const INITIAL_JPEG_QUALITY = 0.92;

export const NOTIFICATION_PROFILE_MAX_EDGE_PX = 512;
export const NOTIFICATION_IMAGE_MAX_EDGE_PX = 1080;
export const PWA_ICON_EDGE_PX = 512;

export type UploadImageResizeOptions = {
  maxEdge: number;
  jpegQuality?: number;
};

function isHeicLike(file: File) {
  const extension = resolveUploadExtension(file);
  const type = file.type.toLowerCase();
  return (
    extension === "heic" ||
    extension === "heif" ||
    type.includes("heic") ||
    type.includes("heif")
  );
}

function shouldCompressImageForUpload(file: File) {
  if (isVideoUploadFile(file)) {
    return false;
  }

  const extension = resolveUploadExtension(file);
  if (extension === "gif" || extension === "svg" || extension === "ico") {
    return false;
  }

  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return false;
  }

  return file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "heic", "heif", "avif"].includes(extension);
}

function toJpegFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").trim() || "upload";
  return `${base}.jpg`;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode image"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

async function loadBitmapForDesktop(file: File, maxEdge: number) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.src = objectUrl;
    });

    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, maxEdge / Math.max(longestEdge, 1));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas is unavailable");
    }

    ctx.drawImage(image, 0, 0, width, height);

    if (typeof createImageBitmap === "function") {
      return await createImageBitmap(canvas);
    }

    throw new Error("createImageBitmap unavailable");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function bitmapToJpegFile(bitmap: ImageBitmap, fileName: string, quality: number) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, bitmap.width);
    canvas.height = Math.max(1, bitmap.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas is unavailable");
    }

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToJpegBlob(canvas, quality);

    return new File([blob], toJpegFileName(fileName), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close?.();
  }
}

async function readImageDimensions(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
      img.src = objectUrl;
    });

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function resizeImageFileForUpload(
  file: File,
  options: UploadImageResizeOptions,
): Promise<File> {
  if (!shouldCompressImageForUpload(file)) {
    return file;
  }

  if (typeof window === "undefined") {
    return file;
  }

  if (isHeicLike(file)) {
    const bitmap = await loadBitmapForDesktop(file, options.maxEdge);
    return bitmapToJpegFile(bitmap, file.name, options.jpegQuality ?? INITIAL_JPEG_QUALITY);
  }

  const { width, height } = await readImageDimensions(file);
  const longestEdge = Math.max(width, height);
  if (longestEdge <= options.maxEdge) {
    return file;
  }

  const bitmap = await loadBitmapForDesktop(file, options.maxEdge);
  return bitmapToJpegFile(bitmap, file.name, options.jpegQuality ?? INITIAL_JPEG_QUALITY);
}

async function convertHeicToJpegOnDesktop(file: File) {
  const bitmap = await loadBitmapForDesktop(file, DESKTOP_MAX_EDGE_PX);
  return bitmapToJpegFile(bitmap, file.name, INITIAL_JPEG_QUALITY);
}

export async function prepareImageForUpload(file: File): Promise<File> {
  if (!shouldCompressImageForUpload(file)) {
    return file;
  }

  if (typeof window === "undefined") {
    return file;
  }

  if (isHeicLike(file)) {
    try {
      return await convertHeicToJpegOnDesktop(file);
    } catch {
      throw new Error(
        "HEIC 사진을 변환하지 못했습니다. 사진 앱에서 JPG로 저장한 뒤 다시 업로드해 주세요.",
      );
    }
  }

  return file;
}

export async function prepareUploadFile(file: File): Promise<File> {
  return prepareImageForUpload(file);
}

async function loadImageElement(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function resizeImageFileForPwaIcon(file: File): Promise<File> {
  if (typeof window === "undefined") {
    return file;
  }

  if (!shouldCompressImageForUpload(file)) {
    throw new Error("PWA 아이콘은 PNG·JPG·WEBP 이미지만 사용할 수 있습니다.");
  }

  const image = await loadImageElement(file);
  const size = PWA_ICON_EDGE_PX;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is unavailable");
  }

  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = (size - width) / 2;
  const y = (size - height) / 2;
  ctx.drawImage(image, x, y, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (!value) {
          reject(new Error("Failed to encode image"));
          return;
        }
        resolve(value);
      },
      "image/png",
      0.92,
    );
  });

  const base = file.name.replace(/\.[^.]+$/, "").trim() || "pwa-icon";
  return new File([blob], `${base}.png`, {
    type: "image/png",
    lastModified: Date.now(),
  });
}
