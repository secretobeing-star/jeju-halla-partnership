import { supabase } from "@/lib/supabase";

const ADMIN_API_TIMEOUT_MS = 12_000;

export async function getAdminAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function adminApiFetch(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
) {
  const accessToken = await getAdminAccessToken();

  if (!accessToken) {
    throw new Error("관리자 로그인이 필요합니다.");
  }

  const { timeoutMs, ...fetchInit } = init ?? {};
  const headers = new Headers(fetchInit.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  if (fetchInit.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    timeoutMs ?? ADMIN_API_TIMEOUT_MS,
  );

  try {
    const response = await fetch(path, {
      ...fetchInit,
      headers,
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      [key: string]: unknown;
    };

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          payload.error ??
            (response.status === 401
              ? "관리자 로그인이 필요합니다."
              : "관리자 권한이 없습니다."),
        );
      }
      throw new Error(payload.error ?? "요청에 실패했습니다.");
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("관리자 권한 확인 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
