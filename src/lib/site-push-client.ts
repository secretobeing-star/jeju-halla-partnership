"use client";

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

export async function registerSiteServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

async function getActiveServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) {
    return existing;
  }

  return registerSiteServiceWorker();
}

export async function getSitePushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  try {
    const registration = (await getActiveServiceWorkerRegistration()) ?? (await navigator.serviceWorker.ready);
    return registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function isSitePushSubscribed() {
  const subscription = await getSitePushSubscription();
  return subscription != null && Notification.permission === "granted";
}

export async function subscribeSitePush(clientKey: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("이 브라우저는 푸시 알림을 지원하지 않습니다.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("알림 권한이 거부되었습니다.");
  }

  return subscribeSitePushWithPermissionGranted(clientKey);
}

export async function subscribeSitePushWithPermissionGranted(clientKey: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("이 브라우저는 푸시 알림을 지원하지 않습니다.");
  }

  if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
    throw new Error("알림 권한이 허용되지 않았습니다.");
  }

  const vapidResponse = await fetch("/api/push/vapid-public-key");
  const vapidBody = (await vapidResponse.json()) as {
    enabled?: boolean;
    publicKey?: string | null;
    message?: string;
  };

  if (!vapidBody.enabled || !vapidBody.publicKey) {
    throw new Error(vapidBody.message ?? "푸시 알림이 아직 설정되지 않았습니다.");
  }

  const registration = await getActiveServiceWorkerRegistration();
  if (!registration) {
    throw new Error("서비스 워커를 등록할 수 없습니다.");
  }

  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidBody.publicKey),
    });
  }

  const json = subscription.toJSON();
  const endpoint = json.endpoint ?? "";
  const p256dh = json.keys?.p256dh ?? "";
  const auth = json.keys?.auth ?? "";

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_key: clientKey,
      endpoint,
      keys: { p256dh, auth },
    }),
  });

  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    await subscription.unsubscribe().catch(() => undefined);
    throw new Error(payload.error ?? "푸시 구독 저장에 실패했습니다.");
  }

  return subscription;
}

export async function unsubscribeSitePush(subscription: PushSubscription | null) {
  if (!subscription) {
    return;
  }

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => undefined);
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => undefined);
}
