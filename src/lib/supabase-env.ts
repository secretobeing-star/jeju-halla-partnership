export type SupabasePublicEnv = {

  url: string;

  anonKey: string;

};



declare global {

  interface Window {

    __SUPABASE_PUBLIC_CONFIG__?: SupabasePublicEnv;

  }

}



const PLACEHOLDER_URL = "https://placeholder.supabase.co";

const PLACEHOLDER_KEY = "placeholder-anon-key";

export const SUPABASE_RUNTIME_CONFIG_ID = "supabase-runtime-config";



let memoryRuntimeEnv: SupabasePublicEnv | null = null;



export function getServerSupabaseEnv(): SupabasePublicEnv {

  return {

    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? PLACEHOLDER_URL,

    anonKey:

      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??

      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??

      PLACEHOLDER_KEY,

  };

}



export function getBuildTimeSupabaseEnv(): SupabasePublicEnv {

  return getServerSupabaseEnv();

}



export function isPlaceholderSupabaseEnv(env: SupabasePublicEnv): boolean {

  return env.url === PLACEHOLDER_URL || env.anonKey === PLACEHOLDER_KEY;

}



export function isSupabaseEnvConfigured(env?: SupabasePublicEnv): boolean {

  const { url, anonKey } = env ?? getSupabaseEnv();

  return (

    !isPlaceholderSupabaseEnv({ url, anonKey }) &&

    url.startsWith("https://") &&

    anonKey.length > 20

  );

}



export function applyRuntimeSupabaseEnv(env: SupabasePublicEnv) {

  memoryRuntimeEnv = env;

  if (typeof window !== "undefined") {

    window.__SUPABASE_PUBLIC_CONFIG__ = env;

  }

}



export function readBrowserSupabaseEnv(): SupabasePublicEnv | null {

  if (typeof document === "undefined") {

    return memoryRuntimeEnv;

  }



  if (memoryRuntimeEnv) {

    return memoryRuntimeEnv;

  }



  if (window.__SUPABASE_PUBLIC_CONFIG__?.url && window.__SUPABASE_PUBLIC_CONFIG__?.anonKey) {

    return window.__SUPABASE_PUBLIC_CONFIG__;

  }



  const element = document.getElementById(SUPABASE_RUNTIME_CONFIG_ID);

  if (!element?.textContent?.trim()) {

    return null;

  }



  try {

    const parsed = JSON.parse(element.textContent) as Partial<SupabasePublicEnv>;

    if (parsed.url && parsed.anonKey) {

      const env = { url: parsed.url, anonKey: parsed.anonKey };

      applyRuntimeSupabaseEnv(env);

      return env;

    }

  } catch {

    return null;

  }



  return null;

}



/** 클라이언트: HTML/메모리에 주입된 설정 우선, 없으면 빌드 시 env 사용 */

export function getSupabaseEnv(): SupabasePublicEnv {

  const runtime = typeof window !== "undefined" ? readBrowserSupabaseEnv() : memoryRuntimeEnv;

  if (runtime && isSupabaseEnvConfigured(runtime)) {

    return runtime;

  }



  const buildTime = getBuildTimeSupabaseEnv();

  if (typeof window !== "undefined" && isPlaceholderSupabaseEnv(buildTime)) {

    return runtime ?? buildTime;

  }



  return buildTime;

}



export function checkSupabaseConfigured(): boolean {

  return isSupabaseEnvConfigured(getSupabaseEnv());

}



export function getServerSupabaseConfigured(): boolean {

  return isSupabaseEnvConfigured(getServerSupabaseEnv());

}


