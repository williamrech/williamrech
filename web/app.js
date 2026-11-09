import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection, query, where, orderBy,
  serverTimestamp, Timestamp,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-functions.js";
import {
  getMessaging, getToken, deleteToken, onMessage, isSupported,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging.js";

const $ = (id) => document.getElementById(id);
const show = (id, on = true) => { $(id).hidden = !on; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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
const call = (name) => httpsCallable(functions, name);
const api = {
  createTrip: call("createTrip"),
  toggleRide: call("toggleRide"),
  cancelTrip: call("cancelTrip"),
  answerNo: call("answerNo"),
};

// ---------- Constants ----------
const TZ = "America/Sao_Paulo";
const FRIDAY = 5;
const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const NAME_SUGGESTIONS = [
  "Véia Coroca", "Doidinha", "Tio do Pavê", "Fiscal de Promoção", "Rainha do Hortifruti",
  "Rei do Carrinho", "Gerente do Corredor 5", "Sommelier de Pão de Queijo",
  "Caçadora de Ofertas", "Dono da Sacolinha", "Ministro do Sorvete", "Patroa",
];

// ---------- Helpers ----------
let toastTimer;
function toast(msg, ms = 3200) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

function spParts(date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(date).map((x) => [x.type, x.value])
  );
  return {
    key: `${p.year}-${p.month}-${p.day}`,
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday),
    hour: Number(p.hour) % 24,
    time: `${p.hour}:${p.minute}`,
  };
}

function whenText(date) {
  const now = spParts();
  const d = spParts(date);
  const tomorrow = spParts(new Date(Date.now() + 86400000));
  if (d.key === now.key) return `hoje às ${d.time}`;
  if (d.key === tomorrow.key) return `amanhã às ${d.time}`;
  const [, m, day] = d.key.split("-");
  return `${DAY_NAMES[d.weekday]} (${day}/${m}) às ${d.time}`;
}

// datetime-local value in the device's local time
function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function friendlyError(err) {
  return (err && err.message && !err.message.startsWith("internal")) ? err.message : "Deu ruim. Tenta de novo.";
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;

// URL params from notification links
const params = new URLSearchParams(location.search);
let wantDailyQuestion = params.get("pergunta") === "mercado";
let highlightTrip = params.get("viagem");
if (params.toString()) history.replaceState(null, "", location.pathname);

// ---------- Messaging ----------
let messaging = null;
let swReg = null;
let currentToken = null;

async function initMessaging() {
  if (!("serviceWorker" in navigator) || !(await isSupported())) return false;
  swReg = await navigator.serviceWorker.register("./firebase-messaging-sw.js");
  messaging = getMessaging(app);
  onMessage(messaging, (payload) => {
    const n = payload.notification || {};
    toast(`${n.title || ""} ${n.body || ""}`, 5000);
    if (Notification.permission === "granted") {
      swReg.showNotification(n.title || "Ela gosta de sorvete?", {
        body: n.body, icon: "icons/icon-192.png", data: { url: payload.data && payload.data.url },
      });
    }
  });
  return true;
}

async function registerDevice() {
  if (!messaging) return;
  try {
    const token = await getToken(messaging, { vapidKey: self.VAPID_KEY, serviceWorkerRegistration: swReg });
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
    toast("Não consegui ativar as notificações neste aparelho.");
  }
}

function renderNotifBanner(supported) {
  const banner = $("notif-banner");
  banner.innerHTML = "";
  if (isIOS && !isStandalone) {
    banner.innerHTML = `<b>iPhone:</b> pra receber notificações, toca em Compartilhar
      → <b>Adicionar à Tela de Início</b>, abre o app por lá e entra de novo.`;
    return show("notif-banner");
  }
  if (!supported) {
    banner.textContent = "Este navegador não recebe notificações. O resto funciona.";
    return show("notif-banner");
  }
  if (Notification.permission === "denied") {
    banner.textContent = "As notificações estão bloqueadas. Libera nas configurações do celular/navegador.";
    return show("notif-banner");
  }
  if (Notification.permission === "default") {
    banner.textContent = "Ativa as notificações, senão como a gente vai te encher o saco?";
    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = "Ativar notificações";
    btn.onclick = async () => {
      const perm = await Notification.requestPermission();
      if (perm === "granted") { await registerDevice(); toast("Pronto. Agora você é nosso. 🔔"); }
      renderNotifBanner(supported);
    };
    banner.appendChild(btn);
    return show("notif-banner");
  }
  show("notif-banner", false);
}

// ---------- State ----------
let me = null;          // users/{uid} data
let meLoaded = false;
let askedDaily = false;
let trips = [];
let unsubs = [];

// ---------- Auth flow ----------
const messagingReady = initMessaging().catch((e) => { console.error(e); return false; });

onAuthStateChanged(auth, async (user) => {
  unsubs.forEach((u) => u());
  unsubs = [];
  me = null;
  meLoaded = false;
  askedDaily = false;

  if (!user) {
    show("view-app", false);
    show("topbar", false);
    show("view-login");
    return;
  }
  show("view-login", false);
  show("view-app");
  show("topbar");
  $("who").textContent = user.email;

  // My profile
  unsubs.push(onSnapshot(doc(db, "users", user.uid), (snap) => {
    me = snap.exists() ? snap.data() : {};
    meLoaded = true;
    $("settings-name").textContent = me.name || "(sem apelido)";
    renderDays();
    if (!me.name) openNamePicker();
    else if (!askedDaily) { askedDaily = true; maybeAskDaily(); }
  }));

  // Upcoming trips
  const since = Timestamp.fromMillis(Date.now() - 3 * 3600000);
  const q = query(collection(db, "trips"), where("when", ">=", since), orderBy("when"));
  unsubs.push(onSnapshot(q, (snap) => {
    trips = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderTrips();
  }, (err) => console.error("trips", err)));

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
  } catch {
    toast("Errou o e-mail ou a senha. Concentra.");
  } finally {
    btn.disabled = false;
  }
});

// ---------- Name picker ----------
let chosenName = "";
function openNamePicker() {
  const dlg = $("dlg-name");
  if (dlg.open) return;
  chosenName = "";
  $("name-custom").value = "";
  const chips = $("name-chips");
  chips.innerHTML = "";
  // Show a random handful so it's different each time.
  const options = [...NAME_SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 7);
  for (const n of options) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = n;
    b.onclick = () => {
      chosenName = n;
      $("name-custom").value = "";
      chips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("selected", c === b));
    };
    chips.appendChild(b);
  }
  dlg.showModal();
}
$("name-custom").addEventListener("input", () => {
  chosenName = "";
  $("name-chips").querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
});
$("dlg-name").addEventListener("cancel", (e) => { if (!me || !me.name) e.preventDefault(); });
$("name-form").addEventListener("submit", async (e) => {
  const name = ($("name-custom").value.trim() || chosenName).slice(0, 40);
  if (!name) { e.preventDefault(); toast("Escolhe um, vai."); return; }
  try {
    await setDoc(doc(db, "users", auth.currentUser.uid), { name, updatedAt: serverTimestamp() }, { merge: true });
    toast(`Prazer, ${name}. 🍦`);
  } catch (err) { toast(friendlyError(err)); }
});

// ---------- Daily question ----------
function isNagDayForMe(weekday) {
  if (weekday === FRIDAY) return true;
  return !((me && me.skipDays) || []).includes(weekday);
}

function maybeAskDaily() {
  if ($("dlg-daily").open || $("dlg-when").open || $("dlg-name").open) return;
  const today = spParts();
  if (me && me.lastAnswered === today.key) { wantDailyQuestion = false; return; }
  const due = today.hour >= 12 && isNagDayForMe(today.weekday);
  if (wantDailyQuestion || due) {
    wantDailyQuestion = false;
    $("daily-hint").textContent = today.weekday === FRIDAY
      ? "É sexta. Sexta é obrigatório. 💅"
      : `Se disser não, nunca mais te pergunto na ${DAY_NAMES[today.weekday]}. (Dá pra mudar nas ⚙️)`;
    $("dlg-daily").showModal();
  }
}

$("daily-yes").addEventListener("click", () => {
  $("dlg-daily").close();
  openWhenPicker();
});

$("daily-no").addEventListener("click", async () => {
  const btn = $("daily-no");
  btn.disabled = true;
  try {
    const { data } = await api.answerNo();
    $("dlg-daily").close();
    toast(data.skipped
      ? `Beleza. Nunca mais te pergunto na ${data.skipped}.`
      : "Anotado. Mas sexta que vem eu pergunto de novo. 😌", 4500);
  } catch (err) {
    toast(friendlyError(err));
  } finally {
    btn.disabled = false;
  }
});

// ---------- When picker / create trip ----------
function openWhenPicker() {
  const now = new Date();
  const chips = $("when-chips");
  chips.innerHTML = "";
  const at = (h, m = 0, addDays = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + addDays);
    d.setHours(h, m, 0, 0);
    return d;
  };
  const options = [
    ["Agora", new Date(now.getTime() + 5 * 60000)],
    ["Daqui 1h", new Date(now.getTime() + 60 * 60000)],
  ];
  if (now.getHours() < 17) options.push(["Fim da tarde", at(18)]);
  if (now.getHours() < 20) options.push(["De noite", at(20)]);
  options.push(["Amanhã cedo", at(9, 0, 1)]);

  for (const [label, date] of options) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = label;
    b.onclick = () => {
      $("when-input").value = toLocalInput(date);
      chips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("selected", c === b));
    };
    chips.appendChild(b);
  }
  $("when-input").value = toLocalInput(new Date(now.getTime() + 60 * 60000));
  $("dlg-when").showModal();
}

$("btn-market").addEventListener("click", openWhenPicker);
$("when-cancel").addEventListener("click", () => $("dlg-when").close());
$("when-input").addEventListener("input", () => {
  $("when-chips").querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
});

$("when-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  const when = new Date($("when-input").value);
  if (isNaN(when)) return toast("Escolhe um horário.");
  btn.disabled = true;
  try {
    const { data } = await api.createTrip({ when: when.toISOString() });
    $("dlg-when").close();
    toast(data.sent ? `Avisei ${data.sent} aparelho(s). Agora aguenta. 📣` : "Criado. Mas ninguém tem notificação ativada. 🦗");
  } catch (err) {
    toast(friendlyError(err));
  } finally {
    btn.disabled = false;
  }
});

// ---------- Trips list ----------
function renderTrips() {
  const list = $("trips");
  const uid = auth.currentUser && auth.currentUser.uid;
  const cutoff = Date.now() - 60 * 60000; // keep showing for 1h after it starts
  const visible = trips.filter((t) => t.when && t.when.toMillis() >= cutoff);

  list.innerHTML = "";
  show("trips-empty", visible.length === 0);

  for (const t of visible) {
    const li = document.createElement("li");
    li.className = "trip" + (t.id === highlightTrip ? " highlight" : "");
    const riders = Object.values(t.riders || {});
    const mine = t.uid === uid;
    const joined = !!(t.riders && t.riders[uid]);
    li.innerHTML = `
      <div class="head">🛒 <b>${esc(mine ? "Você" : t.name)}</b> vai no mercado
        <span class="when">${esc(whenText(t.when.toDate()))}</span></div>
      <div class="riders">${riders.length ? "Vão junto: " + riders.map(esc).join(", ") : "Ninguém vai junto ainda."}</div>
      <div class="actions"></div>`;
    const actions = li.querySelector(".actions");
    const btn = document.createElement("button");
    if (mine) {
      btn.className = "secondary";
      btn.textContent = "Cancelar mercado";
      btn.onclick = () => act(btn, () => api.cancelTrip({ tripId: t.id }), "Cancelado. Todo mundo ficou sabendo. 😬");
    } else {
      btn.className = joined ? "secondary" : "primary";
      btn.textContent = joined ? "Desisti" : "Vou junto 🙋";
      btn.onclick = () => act(btn, () => api.toggleRide({ tripId: t.id }),
        joined ? "Desistiu. Todo mundo vai saber. 🐔" : "Você vai junto! 🚗");
    }
    actions.appendChild(btn);
    list.appendChild(li);
  }

  if (highlightTrip) {
    const el = list.querySelector(".highlight");
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); highlightTrip = null; }
  }
}
setInterval(renderTrips, 60000);

async function act(btn, fn, okMsg) {
  btn.disabled = true;
  try { await fn(); toast(okMsg); } catch (err) { toast(friendlyError(err)); btn.disabled = false; }
}

// ---------- Settings ----------
function renderDays() {
  const wrap = $("days");
  wrap.innerHTML = "";
  const skip = (me && me.skipDays) || [];
  DAY_SHORT.forEach((label, i) => {
    const l = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = i === FRIDAY || !skip.includes(i);
    cb.disabled = i === FRIDAY;
    cb.onchange = async () => {
      const current = new Set((me && me.skipDays) || []);
      cb.checked ? current.delete(i) : current.add(i);
      try {
        await setDoc(doc(db, "users", auth.currentUser.uid),
          { skipDays: [...current].sort(), updatedAt: serverTimestamp() }, { merge: true });
      } catch (err) { toast(friendlyError(err)); }
    };
    l.append(label, cb);
    wrap.appendChild(l);
  });
}

$("open-settings").addEventListener("click", () => $("dlg-settings").showModal());
$("settings-close").addEventListener("click", () => $("dlg-settings").close());
$("change-name").addEventListener("click", () => { $("dlg-settings").close(); openNamePicker(); });

$("logout").addEventListener("click", async () => {
  try {
    if (currentToken) {
      await deleteDoc(doc(db, "devices", currentToken));
      await deleteToken(messaging);
      currentToken = null;
    }
  } catch (err) { console.error(err); }
  $("dlg-settings").close();
  await signOut(auth);
});

// Coming back to the app (e.g. from a notification) — re-check the daily question.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && meLoaded && me && me.name) maybeAskDaily();
});
