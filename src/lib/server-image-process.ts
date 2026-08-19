import sharp from "sharp";
import { isVideoUploadFile, resolveUploadExtension } from "@/lib/upload-file-meta";

const MAX_EDGE_PX = 1920;
const JPEG_QUALITY = 82;

function isOptimizableImage(fileName: string, mimeType: string) {
  const pseudoFile = { name: fileName, type: mimeType } as File;
  if (isVideoUploadFile(pseudoFile)) {
    return false;
  }

  const extension = resolveUploadExtension(pseudoFile);
  return !["gif", "svg", "ico"].includes(extension);
}

export async function optimizeImageBufferForStorage(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
) {
  if (!isOptimizableImage(fileName, mimeType)) {
    return null;
  }

  try {
    const output = await sharp(buffer)
      .rotate()
      .resize({
        width: MAX_EDGE_PX,
        height: MAX_EDGE_PX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    return {
      buffer: output,
      extension: "jpg",
      contentType: "image/jpeg",
    };
  } catch {
    return null;
  }
}
