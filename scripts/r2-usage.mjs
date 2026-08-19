import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID?.trim();
const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
const bucketName = process.env.R2_BUCKET_NAME?.trim();

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error("MISSING_R2_ENV");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

let token;
let totalBytes = 0;
let count = 0;
const prefixCounts = {};

do {
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      ContinuationToken: token,
    }),
  );

  for (const object of response.Contents ?? []) {
    totalBytes += object.Size ?? 0;
    count += 1;
    const parts = (object.Key ?? "").split("/");
    const prefix = parts.length > 1 ? parts[0] : "(root)";
    prefixCounts[prefix] = (prefixCounts[prefix] ?? 0) + (object.Size ?? 0);
  }

  token = response.IsTruncated ? response.NextContinuationToken : undefined;
} while (token);

const totalMB = totalBytes / (1024 * 1024);
const totalGB = totalBytes / (1024 * 1024 * 1024);
const topPrefixes = Object.entries(prefixCounts)
  .sort((left, right) => right[1] - left[1])
  .slice(0, 10)
  .map(([prefix, bytes]) => ({
    prefix,
    mb: Number((bytes / (1024 * 1024)).toFixed(2)),
  }));

console.log(
  JSON.stringify(
    {
      bucketName,
      objectCount: count,
      totalBytes,
      totalMB: Number(totalMB.toFixed(2)),
      totalGB: Number(totalGB.toFixed(3)),
      topPrefixes,
    },
    null,
    2,
  ),
);
