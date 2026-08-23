const CACHE_NAME = 'halla-pass-v3';

// 1. 서비스 워커 설치 시 즉시 대기 상태 해제
self.addEventListener("install", (event) => {
  console.log("서비스 워커 설치 중 (v3)");
  self.skipWaiting();
});

// 2. 서비스 워커 활성화 시 구버전 캐시 자동 삭제
self.addEventListener("activate", (event) => {
  console.log("서비스 워커 활성화 및 구버전 캐시 청소 (v3)");
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