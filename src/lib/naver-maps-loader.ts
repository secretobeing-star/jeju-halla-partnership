import {
  resolveNaverMapAuthParams,
  type NaverMapAuthParam,
} from "@/lib/naver-map-config";

const NAVER_MAPS_SCRIPT_ID = "naver-maps-sdk";
const SDK_LOAD_TIMEOUT_MS = 15_000;

let runtimeClientId: string | null = null;
let loadPromise: Promise<void> | null = null;
const loadedSubmodules = new Set<string>();

type LoadNaverMapsSdkOptions = {
  waitForSubmodules?: boolean;
};

export function setNaverMapClientId(clientId: string) {
  runtimeClientId = clientId.trim();
}

export function getNaverMapClientId(): string | null {
  return (
    runtimeClientId ||
    process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_NCP_CLIENT_ID?.trim() ||
    null
  );
}

export function isNaverMapsJsAvailable(): boolean {
  return Boolean(getNaverMapClientId());
}

function waitForNaverMaps(timeoutMs = 8_000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.naver?.maps) {
      resolve();
      return;
    }

    const startedAt = Date.now();

    const check = () => {
      if (window.naver?.maps) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("Naver Maps SDK load timed out"));
        return;
      }

      window.setTimeout(check, 50);
    };

    check();
  });
}

function waitForNaverMapSubmodules(
  submodules: string[],
  timeoutMs = 2_000,
): Promise<void> {
  const pending = submodules.filter((name) => !loadedSubmodules.has(name));
  if (pending.length === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const startedAt = Date.now();

    const check = () => {
      const maps = window.naver?.maps as Record<string, unknown> | undefined;
      for (const name of pending) {
        if (maps?.[name]) {
          loadedSubmodules.add(name);
        }
      }

      const ready = pending.every((name) => loadedSubmodules.has(name));
      if (ready || Date.now() - startedAt >= timeoutMs) {
        resolve();
        return;
      }

      window.setTimeout(check, 50);
    };

    check();
  });
}

function buildNaverMapsScriptUrl(
  clientId: string,
  authParam: NaverMapAuthParam,
  submodules: string[] = [],
) {
  const params = new URLSearchParams({
    [authParam]: clientId,
  });

  if (submodules.length > 0) {
    params.set("submodules", submodules.join(","));
  }

  return `https://oapi.map.naver.com/openapi/v3/maps.js?${params.toString()}`;
}

function getScriptSubmodules(): string[] {
  const script = document.getElementById(NAVER_MAPS_SCRIPT_ID);
  const src = script?.getAttribute("src") ?? "";
  const match = src.match(/submodules=([^&]+)/);
  if (!match?.[1]) {
    return [];
  }

  return decodeURIComponent(match[1]).split(",").filter(Boolean);
}

function scriptIncludesSubmodules(submodules: string[]) {
  if (submodules.length === 0) {
    return true;
  }

  const loaded = getScriptSubmodules();
  return submodules.every((name) => loaded.includes(name));
}

function resetNaverMapsRuntime(clearNaver = false) {
  document.getElementById(NAVER_MAPS_SCRIPT_ID)?.remove();
  loadPromise = null;
  loadedSubmodules.clear();
  if (clearNaver) {
    delete (window as unknown as { naver?: unknown }).naver;
  }
}

function createLoadPromise(
  clientId: string,
  authParam: NaverMapAuthParam,
  submodules: string[],
): Promise<void> {
  resetNaverMapsRuntime(true);

  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (action: "resolve" | "reject", error?: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      if (window.navermap_authFailure === authFailureHandler) {
        delete window.navermap_authFailure;
      }

      if (action === "resolve") {
        resolve();
        return;
      }

      loadPromise = null;
      reject(error ?? new Error("Failed to load Naver Maps SDK"));
    };

    const timeoutId = window.setTimeout(() => {
      finish(
        "reject",
        new Error(
          "Naver Maps SDK load timed out. Maps Application Client ID와 Web URL 도메인(chu-p.kro.kr)을 확인해 주세요.",
        ),
      );
    }, SDK_LOAD_TIMEOUT_MS);

    const authFailureHandler = () => {
      finish(
        "reject",
        new Error(
          "네이버 지도 인증 실패. NCP Maps Application에서 Dynamic Map을 켜고 Web URL에 chu-p.kro.kr 을 등록해 주세요.",
        ),
      );
    };

    window.navermap_authFailure = authFailureHandler;

    const script = document.createElement("script");
    script.id = NAVER_MAPS_SCRIPT_ID;
    script.async = true;
    script.src = buildNaverMapsScriptUrl(clientId, authParam, submodules);
    script.onload = () => {
      if (window.naver?.maps) {
        finish("resolve");
        return;
      }

      void waitForNaverMaps()
        .then(() => finish("resolve"))
        .catch((error: unknown) => {
          finish(
            "reject",
            error instanceof Error ? error : new Error("Failed to load Naver Maps SDK"),
          );
        });
    };
    script.onerror = () => {
      finish(
        "reject",
        new Error("네이버 지도 SDK 스크립트를 불러오지 못했습니다."),
      );
    };

    document.head.appendChild(script);
  });
}

async function loadNaverMapsSdkWithFallback(
  clientId: string,
  submodules: string[],
): Promise<void> {
  const authParams = resolveNaverMapAuthParams();
  let lastError: Error | null = null;

  for (const authParam of authParams) {
    try {
      await createLoadPromise(clientId, authParam, submodules);
      return;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error("Failed to load Naver Maps SDK");
      resetNaverMapsRuntime(true);
    }
  }

  loadPromise = null;
  throw (
    lastError ??
    new Error("Naver Maps SDK load failed. Maps Application Client ID를 확인해 주세요.")
  );
}

export function loadNaverMapsSdk(
  clientId?: string | null,
  submodules: string[] = [],
  options: LoadNaverMapsSdkOptions = {},
): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Naver Maps SDK can only load in the browser"));
  }

  const resolvedClientId = clientId?.trim() || getNaverMapClientId();
  if (!resolvedClientId) {
    return Promise.reject(new Error("Naver Maps client ID is not configured"));
  }

  const requestedSubmodules = submodules.filter(Boolean);
  const waitForSubmodules = options.waitForSubmodules ?? requestedSubmodules.length > 0;

  const ensureSubmodules = () =>
    waitForSubmodules
      ? waitForNaverMapSubmodules(requestedSubmodules)
      : Promise.resolve();

  if (window.naver?.maps && scriptIncludesSubmodules(requestedSubmodules)) {
    return ensureSubmodules();
  }

  if (!loadPromise) {
    const scriptSubmodules = Array.from(
      new Set([...getScriptSubmodules(), ...requestedSubmodules]),
    );
    loadPromise = loadNaverMapsSdkWithFallback(resolvedClientId, scriptSubmodules).catch(
      (error) => {
        loadPromise = null;
        throw error;
      },
    );
  }

  return loadPromise.then(ensureSubmodules);
}

declare global {
  interface Window {
    navermap_authFailure?: () => void;
  }
}
