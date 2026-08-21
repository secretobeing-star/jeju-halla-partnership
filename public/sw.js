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
      // JSON 파싱을 시도하고, 실패하면 그냥 텍스트로 처리
      try {
        payload = { ...payload, ...event.data.json() };
      } catch {
        payload.body = event.data.text();
      }
      console.log("푸시 페이로드:", payload);
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