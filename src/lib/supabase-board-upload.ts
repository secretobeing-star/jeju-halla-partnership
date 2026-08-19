import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase-env";

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

let boardUploadClient: SupabaseClient | null = null;

/**
 * 게시판 사진/동영상 업로드 전용 클라이언트.
 * 기본 supabase 클라이언트에 남아 있는 만료·손상 JWT를 붙이지 않아
 * "Invalid Compact JWS" 오류를 방지합니다.
 */
export function getSupabaseBoardUploadClient() {
  if (boardUploadClient) {
    return boardUploadClient;
  }

  const { url, anonKey } = getSupabaseEnv();

  boardUploadClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: noopStorage,
    },
  });

  return boardUploadClient;
}
