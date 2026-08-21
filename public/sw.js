const CACHE_NAME = "jeju-halla-pwa-v1";
const urlsToCache = ["/"];

// Service Worker 설치
self.addEventListener("install", (event) => {
  console.log("Service Worker 설치 중...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("캐시 열기 성공:", CACHE_NAME);
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Service Worker 활성화
self.addEventListener("activate", (event) => {
  console.log("Service Worker 활성화 중...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("오래된 캐시 삭제:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 요청 처리 (오프라인 지원)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});

// 푸시 알림 수신
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
      payload = { ...payload, ...event.data.json() };
      console.log("푸시 페이로드:", payload);
    }
  } catch (error) {
    console.error("푸시 페이로드 파싱 실패:", error);
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
    tag: `push-${Date.now()}`,
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

// 알림 클릭 처리
self.addEventListener("notificationclick", (event) => {
  console.log("알림 클릭:", event.notification.tag);
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      console.log("열린 클라이언트 수:", clients.length);
      for (const client of clients) {
        if ("focus" in client) {
          console.log("기존 클라이언트 포커스:", client.url);
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        console.log("새 창 열기:", targetUrl);
        return self.clients.openWindow(targetUrl);
      }

      console.warn("알림 클릭 처리 실패: 열린 창 없음");
      return undefined;
    })
  );
});