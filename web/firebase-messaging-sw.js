// Service worker: receives pushes while the app is closed or in the background.
// Messages sent with a `notification` payload are displayed automatically by the
// Firebase SDK, and the SDK opens their link (fcmOptions.link) on tap.
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js");
importScripts("./firebase-config.js");

// ---------------------------------------------------------------------------
// Answer buttons ("Sim" / "Não" on 2-option questions). The Firebase SDK leaves button
// taps to us; this runs first and stops the other click handlers (no app opening).
// ---------------------------------------------------------------------------
const QUICK_URL = `https://us-central1-${self.FIREBASE_CONFIG.projectId}.cloudfunctions.net/quick`;
const ICON = "icons/icon-192.png";
function fcmData(n) {
  const d = (n && n.data) || {};
  return (d.FCM_MSG && d.FCM_MSG.data) || d.data || d;
}
async function quickAnswer(n, idx) {
  const d = fcmData(n);
  const value = d[`q${idx}`] || "";
  const tag = n.tag || `rodada-${d.rid}`;
  const title = n.body ? n.body.split("\n")[0] : n.title || "";
  n.close();
  let ok = false, msg = "";
  try {
    const res = await fetch(QUICK_URL, { method: "POST", headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ r: d.rid, u: d.u, t: d.qt, i: idx, v: value }) });
    const j = await res.json();
    ok = !!j.ok;
    msg = j.msg || "";
  } catch (e) { msg = "Sem internet agora."; }
  if (ok) {
    // Quick check, no sound, gone in a few seconds.
    await self.registration.showNotification(title, { body: `✓ Respondido: ${value}`, tag, silent: true, icon: ICON, data: { url: d.url } });
    await new Promise((r) => setTimeout(r, 4000));
    (await self.registration.getNotifications({ tag })).forEach((x) => x.close());
  } else {
    await self.registration.showNotification(title, { body: `Não deu pra responder${msg ? ` (${msg})` : ""}. Toca pra abrir.`,
      tag, icon: ICON, data: { url: d.url } });
  }
}
self.addEventListener("notificationclick", (event) => {
  const a = event.action;
  if (a !== "q0" && a !== "q1") return;
  event.stopImmediatePropagation();
  event.waitUntil(quickAnswer(event.notification, a === "q0" ? 0 : 1).catch(() => {}));
});

// ---------------------------------------------------------------------------
// Receipts (for the admin log): tell the server "arrived" / "tapped".
// These listeners are registered BEFORE the Firebase SDK's own ones, and they
// never show, hide or change notifications — the SDK still does all of that.
// Any failure here is swallowed, so it can never break a notification.
// ---------------------------------------------------------------------------
const RECEIPT_URL = `https://us-central1-${self.FIREBASE_CONFIG.projectId}.cloudfunctions.net/receipt`;

// Each receipt carries the real moment (t). If it can't be sent now (locked phone, no network),
// it's kept in a small local queue and sent with the next push, tap, or app open.
const QDB = "receipts";
function qdb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(QDB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("q", { autoIncrement: true });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function qAdd(item) {
  try { const db = await qdb(); await new Promise((res) => { const tx = db.transaction("q", "readwrite"); tx.objectStore("q").add(item); tx.oncomplete = res; tx.onerror = res; }); } catch (e) {}
}
async function qTakeAll() {
  try {
    const db = await qdb();
    return await new Promise((res) => {
      const tx = db.transaction("q", "readwrite"), st = tx.objectStore("q"), items = [];
      st.openCursor().onsuccess = (ev) => { const c = ev.target.result; if (c) { items.push(c.value); c.delete(); c.continue(); } };
      tx.oncomplete = () => res(items);
      tx.onerror = () => res(items);
    });
  } catch (e) { return []; }
}
async function postReceipt(it) {
  await fetch(`${RECEIPT_URL}?e=${it.kind}&id=${encodeURIComponent(it.id)}&t=${it.t}${it.extra || ""}`, { method: "POST", mode: "no-cors", keepalive: true });
}
async function flushReceipts() {
  for (const it of await qTakeAll()) {
    try { await postReceipt(it); } catch (e) { await qAdd(it); }
  }
}
function sendReceipt(logId, kind, extra = "") {
  if (!logId || !/^[A-Za-z0-9]{20}$/.test(logId)) return flushReceipts();
  const it = { id: logId, kind, t: Date.now(), extra };
  return postReceipt(it).catch(() => qAdd(it)).then(flushReceipts).catch(() => {});
}
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "flush-receipts") event.waitUntil(flushReceipts());
});

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
    let extra = "";
    try {
      const acts = (payload && payload.notification && payload.notification.actions) || [];
      const max = (self.Notification && self.Notification.maxActions) || 0;
      extra = `&a=${acts.length}&m=${max}`;
    } catch (e) {}
    if (id) event.waitUntil(sendReceipt(id, "recv", extra));
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
