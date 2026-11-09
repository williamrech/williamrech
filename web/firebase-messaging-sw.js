// Service worker: receives pushes while the app is closed or in the background.
// Messages sent with a `notification` payload are displayed automatically by the SDK,
// and the SDK opens their link (fcmOptions.link) on tap.
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js");
importScripts("./firebase-config.js");

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
