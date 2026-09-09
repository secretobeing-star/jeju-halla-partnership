const CACHE_NAME = 'halla-pass-v4';

// 1. 서비스 워커 설치 시 즉시 대기 상태 해제
self.addEventListener("install", (event) => {
  console.log("서비스 워커 설치 중 (v4)");
  self.skipWaiting();
});

// 2. 서비스 워커 활성화 시 구버전 캐시 자동 삭제
self.addEventListener("activate", (event) => {
  console.log("서비스 워커 활성화 및 구버전 캐시 청소 (v4)");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("기존 구버전 캐시 삭제:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 푸시 알림 수신 및 처리
self.addEventListener("push", (event) => {
  console.log("푸시 알림 수신");
  let payload = {
    title: "새 알림",
    body: "",
    url: "/",
    icon: null,
    badge: null,
    image: null,
  };

  try {
    if (event.data) {
      try {
        const jsonData = event.data.json();
        console.log("푸시 페이로드 (JSON):", jsonData);
        payload = { ...payload, ...jsonData };
      } catch (jsonError) {
        console.warn("JSON 파싱 실패, 텍스트로 처리:", jsonError);
        const textData = event.data.text();
        if (textData) {
          payload.body = textData;
          console.log("푸시 페이로드 (텍스트):", textData);
        }
      }
    }
  } catch (error) {
    console.error("푸시 페이로드 처리 실패:", error);
    payload.body = event.data?.text() ?? "";
  }

  const icon = payload.icon || "/favicon.ico";
  const badge = payload.badge || icon;

  const notificationOptions = {
    body: payload.body,
    icon,
    badge,
    ...(payload.image ? { image: payload.image } : {}),
    data: { url: payload.url ?? "/" },
    requireInteraction: true,
    tag: payload.tag || `push-${Date.now()}`,
  };

  console.log("알림 표시 시도:", notificationOptions);
  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions).then(() => {
      console.log("알림 표시 성공");
    }).catch((error) => {
      console.error("알림 표시 실패:", error);
    })
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "schedule-stamp-ready") {
    return;
  }

  const fireAt = Number(data.fireAt) || 0;
  const delay = Math.max(0, fireAt - Date.now());
  const title = data.title || "도장 찍기 가능!";
  const body = data.body || "지금 바로 이벤트 도장을 찍어보세요!";

  const show = () =>
    self.registration.showNotification(title, {
      body,
      data: { url: "/" },
      requireInteraction: true,
      tag: "stamp-ready",
    });

  if (delay === 0) {
    event.waitUntil(show());
    return;
  }

  const timer = setTimeout(() => {
    void show();
  }, delay);
  if (typeof timer === "object" && timer && "unref" in timer) {
    try {
      timer.unref();
    } catch (_) {}
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) {
            return client.navigate(targetUrl);
          }
          return undefined;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});