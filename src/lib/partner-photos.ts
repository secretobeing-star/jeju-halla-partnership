import { PartnerPhoto, supabase } from "@/lib/supabase";

export function buildPartnerGalleryUrls(
  coverImageUrl: string | null | undefined,
  photos: PartnerPhoto[],
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const cover = coverImageUrl?.trim();
  if (cover) {
    urls.push(cover);
    seen.add(cover);
  }

  for (const photo of photos) {
    const url = photo.image_url?.trim();
    if (!url || seen.has(url)) {
      continue;
    }
    urls.push(url);
    seen.add(url);
  }

  return urls;
}

export async function fetchPartnerPhotos(partnerId: string): Promise<PartnerPhoto[]> {
  const { data, error } = await supabase
    .from("partner_photos")
    .select("id, partner_id, image_url, sort_order, created_at")
    .eq("partner_id", partnerId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchPartnerPhotos failed:", error.message);
    return [];
  }

  return (data ?? []) as PartnerPhoto[];
}

export async function syncPartnerPhotos(
  partnerId: string,
  imageUrls: string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: deleteError } = await supabase
    .from("partner_photos")
    .delete()
    .eq("partner_id", partnerId);

  if (deleteError) {
    if (deleteError.message.includes("partner_photos")) {
      return {
        ok: false,
        message:
          "추가 사진 저장 실패: partner_photos 테이블이 없습니다. Supabase SQL Editor에서 supabase/partner-photos.sql을 실행해 주세요.",
      };
    }
    return { ok: false, message: deleteError.message };
  }

  const trimmed = imageUrls.map((url) => url.trim()).filter(Boolean);
  if (trimmed.length === 0) {
    return { ok: true };
  }

  const { error: insertError } = await supabase.from("partner_photos").insert(
    trimmed.map((image_url, index) => ({
      partner_id: partnerId,
      image_url,
      sort_order: index,
    })),
  );

  if (insertError) {
    return { ok: false, message: insertError.message };
  }

  return { ok: true };
}
