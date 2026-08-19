import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { buildPublicAssetUrl, buildUploadFilePath } from "@/lib/upload-paths";

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim();

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
}

export function isR2StorageConfigured() {
  const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl } = getR2Config();
  return Boolean(accountId && accessKeyId && secretAccessKey && bucketName && publicUrl);
}

let cachedClient: S3Client | null = null;

function getR2Client() {
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2_STORAGE가 설정되지 않았습니다.");
  }

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return cachedClient;
}

async function putObject(key: string, body: Buffer, contentType: string) {
  const { bucketName } = getR2Config();
  if (!bucketName) {
    throw new Error("R2_BUCKET_NAME이 설정되지 않았습니다.");
  }

  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function uploadBufferToR2(
  buffer: Buffer,
  folder: string,
  extension: string,
  contentType: string,
) {
  const { publicUrl } = getR2Config();
  if (!publicUrl) {
    throw new Error("R2_PUBLIC_URL이 설정되지 않았습니다.");
  }

  const { primaryPath, retryPrefix } = buildUploadFilePath(folder, extension);

  try {
    await putObject(primaryPath, buffer, contentType);
    return buildPublicAssetUrl(publicUrl, primaryPath);
  } catch (error) {
    if (!retryPrefix) {
      throw error;
    }

    const uniquePath = `${retryPrefix}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    await putObject(uniquePath, buffer, contentType);
    return buildPublicAssetUrl(publicUrl, uniquePath);
  }
}
