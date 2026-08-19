import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://xesoggwfiiwdrqkafyzu.supabase.co";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_R3pzO_HdBLgG3TXsXWjpiw_gRJ0jfnR";

const supabase = createClient(url, key);
const urls = new Set();
const r2Pattern = /https?:\/\/[^\s"'<>]+r2\.dev[^\s"'<>]*/g;

function collect(value) {
  if (typeof value === "string" && value.includes("r2.dev")) {
    urls.add(value.trim());
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(collect);
    return;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach(collect);
  }
}

const { data: settings } = await supabase
  .from("site_settings")
  .select("*")
  .eq("id", 1)
  .maybeSingle();
collect(settings);

const { data: partners } = await supabase.from("partners").select("image_url");
for (const partner of partners ?? []) {
  collect(partner.image_url);
}

const { data: posts } = await supabase.from("board_posts").select("content");
for (const post of posts ?? []) {
  const matches = post.content?.match(r2Pattern) ?? [];
  matches.forEach((match) => urls.add(match));
}

const { data: popups } = await supabase.from("site_popups").select("image_url");
for (const popup of popups ?? []) {
  collect(popup.image_url);
}

let totalBytes = 0;
let measured = 0;
let failed = 0;

for (const imageUrl of urls) {
  try {
    const response = await fetch(imageUrl, { method: "HEAD" });
    const length = Number(response.headers.get("content-length") ?? 0);
    if (response.ok && length > 0) {
      totalBytes += length;
      measured += 1;
    } else {
      failed += 1;
    }
  } catch {
    failed += 1;
  }
}

const publicHost = [...urls][0] ? new URL([...urls][0]).host : null;

console.log(
  JSON.stringify(
    {
      bucketPublicHost: publicHost,
      uniqueR2Files: urls.size,
      measuredObjects: measured,
      failedHeadRequests: failed,
      totalBytes,
      totalMB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
      totalGB: Number((totalBytes / (1024 * 1024 * 1024)).toFixed(3)),
      freeTierStorageGB: 10,
      usedPercentOfFreeTier: Number(
        ((totalBytes / (10 * 1024 * 1024 * 1024)) * 100).toFixed(2),
      ),
      note: "DB에 연결된 r2.dev 파일 크기 합계 추정치입니다. 버킷에만 남은 파일은 포함되지 않을 수 있습니다.",
    },
    null,
    2,
  ),
);
