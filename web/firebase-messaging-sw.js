// Service worker: receives pushes while the app is closed or in the background.
// Messages sent with a `notification` payload are displayed automatically by the
// Firebase SDK, and the SDK opens their link (fcmOptions.link) on tap.
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js");
importScripts("./firebase-config.js");

// ---------------------------------------------------------------------------
// Receipts (for the admin log): tell the server "arrived" / "tapped".
// These listeners are registered BEFORE the Firebase SDK's own ones, and they
// never show, hide or change notifications — the SDK still does all of that.
// Any failure here is swallowed, so it can never break a notification.
// ---------------------------------------------------------------------------
const RECEIPT_URL = `https://us-central1-${self.FIREBASE_CONFIG.projectId}.cloudfunctions.net/receipt`;

function sendReceipt(logId, kind) {
  if (!logId || !/^[A-Za-z0-9]{20}$/.test(logId)) return Promise.resolve();
  return fetch(`${RECEIPT_URL}?e=${kind}&id=${encodeURIComponent(logId)}`, {
    method: "POST", mode: "no-cors", keepalive: true,
  }).catch(() => {});
}

// FCM puts our data either at payload.data or (for SDK-shown notifications) under FCM_MSG.
function logIdFrom(obj) {
  try {
    if (!obj) return null;
    if (obj.logId) return obj.logId;
    if (obj.data && obj.data.logId) return obj.data.logId;
    if (obj.FCM_MSG) return logIdFrom(obj.FCM_MSG);
  } catch (e) {}
  return null;
}

self.addEventListener("push", (event) => {
  try {
    const payload = event.data ? event.data.json() : null;
    const id = logIdFrom(payload);
    if (id) event.waitUntil(sendReceipt(id, "recv"));
  } catch (e) {}
});

self.addEventListener("notificationclick", (event) => {
  try {
    const id = logIdFrom(event.notification && event.notification.data);
    if (id) event.waitUntil(sendReceipt(id, "open"));
  } catch (e) {}
});

firebase.initializeApp(self.FIREBASE_CONFIG);
firebase.messaging();

// Taps on notifications the app showed itself (while open) — open their link.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope) && "navigate" in c) {
          return c.navigate(url).then((w) => (w || c).focus());
        }
      }
      return clients.openWindow(url);
    })
  );
});
