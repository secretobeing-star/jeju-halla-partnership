// src/lib/register-push.ts
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushSubscription(clientKey: string) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Service Worker 또는 Push API를 지원하지 않는 환경입니다.");
    return;
  }

  try {
    // 기존 Service Worker 확인
    const existingRegistration = await navigator.serviceWorker.getRegistration();
    let registration = existingRegistration;

    // 기존 Service Worker가 없으면 등록
    if (!registration) {
      console.log("Service Worker 등록 시작...");
      registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker 등록 완료");
    } else {
      console.log("기존 Service Worker 발견:", registration.scope);
    }

    // Service Worker 활성화 대기
    await navigator.serviceWorker.ready;
    console.log("Service Worker 활성화 완료");

    // 현재 알림 권한 확인
    const currentPermission = Notification.permission;
    console.log("현재 알림 권한:", currentPermission);

    if (currentPermission === "granted") {
      console.log("이미 알림 권한이 허용됨");
    } else if (currentPermission === "denied") {
      console.warn("알림 권한이 거부됨 - 푸시 구독 불가");
      return;
    } else {
      // 권한 요청 (default 또는 not_asked 상태)
      console.log("알림 권한 요청...");
      const permission = await Notification.requestPermission();
      console.log("알림 권한 요청 결과:", permission);
      if (permission !== "granted") {
        console.warn("알림 권한이 거부됨");
        return;
      }
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error("VAPID 공개키가 설정되지 않음");
      return;
    }

    // 기존 구독 확인
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log("기존 푸시 구독 발견 - 갱신");
      await existingSubscription.unsubscribe();
    }

    // 새로운 구독 생성
    console.log("새로운 푸시 구독 생성...");
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    console.log("푸시 구독 생성 완료");

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      console.error("푸시 구독 정보가 올바르지 않음");
      return;
    }

    // 서버에 구독 정보 전송
    console.log("서버에 푸시 구독 정보 전송...");
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_key: clientKey,
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
      }),
    });

    if (response.ok) {
      console.log("푸시 구독 등록 성공");
    } else {
      console.error("푸시 구독 등록 실패:", response.status);
    }
  } catch (err) {
    console.error("푸시 구독 등록 실패:", err);
  }
}