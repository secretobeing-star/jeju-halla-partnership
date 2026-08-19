import { NextRequest, NextResponse } from "next/server";
import {
  isAllowedUploadFolder,
  isPublicBoardFolder,
  uploadBufferToPartnershipStorage,
  verifyAuthenticatedUser,
} from "@/lib/server-storage";
import {
  getUploadSizeLimitMessage,
  isVideoUploadFile,
  resolveUploadContentType,
  resolveUploadExtension,
} from "@/lib/upload-file-meta";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    if (isVideoUploadFile(file)) {
      const sizeError = getUploadSizeLimitMessage(file, 50);
      if (sizeError) {
        return NextResponse.json({ error: sizeError }, { status: 413 });
      }
    }
    if (!isAllowedUploadFolder(folder)) {
      return NextResponse.json({ error: "허용되지 않은 업로드 경로입니다." }, { status: 400 });
    }

    if (!isPublicBoardFolder(folder)) {
      const authHeader = request.headers.get("authorization");
      const accessToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null;

      if (!accessToken) {
        return NextResponse.json(
          { error: "관리자 로그인이 필요합니다. 다시 로그인 후 시도해 주세요." },
          { status: 401 },
        );
      }

      const user = await verifyAuthenticatedUser(accessToken);
      if (!user) {
        return NextResponse.json(
          { error: "인증이 만료되었습니다. 관리자에서 다시 로그인해 주세요." },
          { status: 401 },
        );
      }
    }

    const sourceBuffer = Buffer.from(await file.arrayBuffer());
    const extension = resolveUploadExtension(file);
    const contentType = resolveUploadContentType(file, extension);

    const url = await uploadBufferToPartnershipStorage(
      sourceBuffer,
      folder,
      extension,
      contentType,
    );
    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "업로드에 실패했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
