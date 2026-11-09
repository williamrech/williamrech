import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, deleteDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-functions.js";
import {
  getMessaging, getToken, deleteToken, onMessage, isSupported,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging.js";

const $ = (id) => document.getElementById(id);
const show = (id, on = true) => { $(id).hidden = !on; };

// ---------- Setup check ----------
const config = self.FIREBASE_CONFIG;
if (!config || String(config.apiKey).startsWith("REPLACE")) {
  show("view-setup");
  throw new Error("Firebase not configured");
}

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "us-central1");
const ring = httpsCallable(functions, "ring");

// ---------- Helpers ----------
let toastTimer;
function toast(msg, ms = 3000) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = navigator.standalone === true ||
  matchMedia("(display-mode: standalone)").matches;

let messaging = null;
let swReg = null;
let currentToken = null;

async function initMessaging() {
  if (!("serviceWorker" in navigator) || !(await isSupported())) return false;
  swReg = await navigator.serviceWorker.register("./firebase-messaging-sw.js");
  messaging = getMessaging(app);
  // App is open & focused: the SDK hands us the message instead of showing it, so show it ourselves.
  onMessage(messaging, (payload) => {
    const n = payload.notification || {};
    toast(`${n.title || "Ding!"} ${n.body || ""}`, 5000);
    if (Notification.permission === "granted") {
      swReg.showNotification(n.title || "Ding!", { body: n.body, icon: "icons/icon-192.png" });
    }
  });
  return true;
}

async function registerDevice() {
  if (!messaging) return;
  try {
    const token = await getToken(messaging, {
      vapidKey: self.VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
    if (!token) return;
    currentToken = token;
    await setDoc(doc(db, "devices", token), {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      userAgent: navigator.userAgent.slice(0, 200),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("registerDevice failed", err);
    toast("Couldn't register this device for notifications.");
  }
}

// Shows the right hint/button about notifications for this device.
function renderNotifBanner(supported) {
  const banner = $("notif-banner");
  banner.innerHTML = "";

  if (isIOS && !isStandalone) {
    banner.innerHTML = `<b>iPhone:</b> to get notifications, tap the Share button
      <span aria-hidden="true">⎋</span> → <b>Add to Home Screen</b>, then open The Button from your Home Screen and log in there.`;
    show("notif-banner");
    return;
  }
  if (!supported) {
    banner.textContent = "This browser can't receive notifications. You can still press the button.";
    show("notif-banner");
    return;
  }
  if (Notification.permission === "denied") {
    banner.textContent = "Notifications are blocked for this site. Turn them on in your browser/phone settings.";
    show("notif-banner");
    return;
  }
  if (Notification.permission === "default") {
    banner.innerHTML = `Turn on notifications so you get pinged when someone presses the button.`;
    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = "Enable notifications";
    // Must be triggered by a tap — iOS requires a user gesture.
    btn.onclick = async () => {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        await registerDevice();
        toast("You're on the list. 🔔");
      }
      renderNotifBanner(supported);
    };
    banner.appendChild(btn);
    show("notif-banner");
    return;
  }
  show("notif-banner", false); // granted
}

// ---------- Auth flow ----------
const messagingReady = initMessaging().catch((e) => { console.error(e); return false; });

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    show("view-app", false);
    show("footer", false);
    show("view-login");
    return;
  }
  show("view-login", false);
  show("view-app");
  show("footer");
  $("who").textContent = user.email;

  const supported = await messagingReady;
  if (supported && Notification.permission === "granted") await registerDevice();
  renderNotifBanner(supported);
});

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  btn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (err) {
    toast("Nope. Wrong email or password.");
  } finally {
    btn.disabled = false;
  }
});

$("logout").addEventListener("click", async () => {
  // Stop notifications for this device when logging out.
  try {
    if (currentToken) {
      await deleteDoc(doc(db, "devices", currentToken));
      await deleteToken(messaging);
      currentToken = null;
    }
  } catch (err) { console.error(err); }
  await signOut(auth);
});

// ---------- The Button ----------
$("big-button").addEventListener("click", async () => {
  const btn = $("big-button");
  btn.disabled = true;
  btn.classList.add("pressed");
  try {
    const { data } = await ring();
    toast(data.sent === 1 ? "Sent to 1 device." : `Sent to ${data.sent} devices.`);
  } catch (err) {
    toast(err.message || "Something broke. Try again.");
  } finally {
    setTimeout(() => {
      btn.classList.remove("pressed");
      btn.disabled = false;
    }, 400);
  }
});
