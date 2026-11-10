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

// ---------- Version number (purely decorative, not the real app version) ----------
// Same "version" for the whole family on a given day: chosen from the date, in Brasília time.
(function renderVersion() {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()); // YYYY-MM-DD
  const md = key.slice(5);
  const weekday = new Date(key + "T12:00:00").getDay();
  const SPECIAL = {
    "12-27": "feliz.aniversario",
    "12-25": "feliz.aniversario",
    "12-26": "feliz.aniversario",
    "01-01": "2.0.0-ano.novo",
    "04-01": "0.0.1-mentira",
    "10-31": "1.666.0",
    "12-25": "1.0.0-natal",
  };
  const WEIRD = [
    "1.666.0", "1.eita.0", "1.bah.0", "1.tchê.0", "1.oxe.0", "1.uai.0",
    "1.0.0-beta-da-tia", "0.0.1", "1.0.sorvete", "3.14.159", "1.0.0-socorro",
    "9.9.9", "1.0.cafezinho", "1.0.0.0.0.0", "1.2.3.4.5", "1.0.-1", "NaN.0.0",
    "1.0.0-sem-açúcar", "1.mercado.0", "1.42.0", "1.0.0-ela-gosta", "1.0.0 (confia)",
  ];
  // Tiny deterministic hash of the date.
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;

  let v = SPECIAL[md];
  if (!v && md.endsWith("-13") && weekday === 5) v = "1.13.sexta";
  if (!v && h % 5 === 0) v = WEIRD[(h >>> 3) % WEIRD.length]; // roughly 1 day in 5
  document.getElementById("version").textContent = v || "1.0.0";
})();

// ---------- Coffee decorations: random spot & angle on every load (not saved) ----------
(function placeDecor() {
  const box = document.getElementById("decor");
  const rnd = (a, b) => a + Math.random() * (b - a);
  const edgeX = () => (Math.random() < 0.5 ? rnd(-12, 18) : rnd(72, 98)); // keep big ones near the sides
  const items = [
    { src: "decor/latte.svg", size: rnd(150, 210), x: edgeX(), y: rnd(-5, 90), op: rnd(0.10, 0.15) },
    { src: "decor/mug.svg", size: rnd(80, 120), x: edgeX(), y: rnd(0, 92), op: rnd(0.12, 0.18) },
  ];
  const beans = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < beans; i++) items.push({ src: "decor/bean.svg", size: rnd(22, 40), x: rnd(0, 95), y: rnd(0, 95), op: rnd(0.16, 0.26) });
  for (const it of items) {
    const img = document.createElement("img");
    img.src = it.src;
    img.alt = "";
    img.style.cssText = `width:${it.size}px;left:${it.x}vw;top:${it.y}vh;opacity:${it.op};transform:translate(-50%,-50%) rotate(${rnd(0, 360)}deg)`;
    box.appendChild(img);
  }
})();

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
  adminHealth: call("adminHealth"),
  adminTest: call("adminTest"),
  adminReset: call("adminReset"),
  claimAdmin: call("claimAdmin"),
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

// Loading state for any button: a little steaming cup + a coffee-flavoured excuse.
const BUSY_LINES = ["Passando o café…", "Moendo os grãos…", "Esquentando a água…", "Coando…", "Fofocando com o servidor…"];
function busy(btn, on, label) {
  if (!btn) return;
  if (on) {
    if (btn.classList.contains("busy")) return;
    btn.dataset.html = btn.innerHTML;
    // Keep the exact size it had, so the loading text never makes it grow.
    btn.style.height = `${btn.offsetHeight}px`;
    btn.style.width = `${btn.offsetWidth}px`;
    btn.disabled = true;
    btn.classList.add("busy");
    btn.innerHTML = `<span class="cup" aria-hidden="true"></span><span class="busy-text">${esc(label || BUSY_LINES[Math.floor(Math.random() * BUSY_LINES.length)])}</span>`;
  } else {
    if (btn.dataset.html != null) btn.innerHTML = btn.dataset.html;
    delete btn.dataset.html;
    btn.style.height = "";
    btn.style.width = "";
    btn.disabled = false;
    btn.classList.remove("busy");
  }
}
// Runs fn with btn showing the loading state. Returns fn's result, or undefined on error (after a toast).
async function withBusy(btn, fn, label) {
  busy(btn, true, label);
  try { return await fn(); }
  catch (err) { console.error(err); toast(friendlyError(err)); }
  finally { if (btn.isConnected) busy(btn, false); }
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

function friendlyError(err) {
  return (err && err.message && !err.message.startsWith("internal")) ? err.message : "Deu ruim. Tenta de novo.";
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
const iosVersion = () => {
  const m = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  return isIOS && m ? [Number(m[1]), Number(m[2])] : null;
};
// iPhone in Safari: install to the Home Screen first, before even logging in
// (the Home Screen app has its own storage, so logging in here would be wasted).
const needsInstall = isIOS && !isStandalone;

// URL params from notification links
const params = new URLSearchParams(location.search);
let wantDailyQuestion = params.get("pergunta") === "mercado";
let highlightTrip = params.get("viagem");
if (params.toString()) history.replaceState(null, "", location.pathname);

// ---------- Messaging ----------
let messaging = null;
let swReg = null;
let currentToken = null;

// Why push isn't available on this device (shown in the gate so we can debug it).
let pushProblem = "";

async function initMessaging() {
  const missing = ["serviceWorker", "PushManager", "Notification", "indexedDB"]
    .filter((f) => !(f === "serviceWorker" ? f in navigator : f in window));
  if (missing.length) { pushProblem = `faltando: ${missing.join(", ")}`; return false; }
  try {
    swReg = await navigator.serviceWorker.register("./firebase-messaging-sw.js");
  } catch (e) {
    pushProblem = `service worker: ${e && e.message}`;
    return false;
  }
  // Firebase's own check is stricter than needed on some iOS versions; log it but carry on.
  try { if (!(await isSupported())) console.warn("firebase isSupported() = false, trying anyway"); } catch {}
  try {
    messaging = getMessaging(app);
  } catch (e) {
    pushProblem = `firebase: ${e && e.message}`;
    return false;
  }
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
    toast(`Não consegui ativar as notificações neste aparelho. (${err && (err.code || err.message)})`, 6000);
  }
}

// ---------- Mandatory notification gate ----------
// No notifications, no app. This is a nag app after all.
let gatePassed = false;

function notifState(supported) {
  if (isIOS && !isStandalone) return "ios-install";
  if (!supported) return "unsupported";
  return Notification.permission; // "default" | "denied" | "granted"
}

const GATE_COPY = {
  "ios-install": {
    title: "Primeiro, instala o app 📲",
    body: `No iPhone só funciona pela Tela de Início:<br><br>
      1. Toca em <b>Compartilhar</b> (o quadradinho com a seta)<br>
      2. <b>Adicionar à Tela de Início</b><br>
      3. Abre o app por lá e entra de novo.<br><br>
      <span class="muted">Sem isso, nada feito. Regras são regras.</span>`,
  },
  unsupported: {
    title: "Esse navegador não serve 🙅",
    body: "Ele não recebe notificações, e sem notificação não tem app. Tenta no Chrome ou, no iPhone, pelo Safari.",
    button: "Tentar de novo",
  },
  denied: {
    title: "Você bloqueou a gente 😤",
    body: `As notificações estão bloqueadas. Libera nas configurações do celular
      (Ajustes → Notificações) ou do navegador, e volta aqui.<br><br>
      <span class="muted">A gente espera. A gente sempre espera.</span>`,
  },
  default: {
    title: "Uma coisinha antes ☕",
    body: `Esse app vive de te encher o saco. Sem notificação, sem acesso.<br><br>
      <span class="muted">Não é negociável.</span>`,
    button: "Ativar notificações",
  },
};

async function checkGate() {
  if (!auth.currentUser) return;
  const supported = await messagingReady;
  const state = notifState(supported);
  const dlg = $("dlg-gate");

  if (state === "granted") {
    if (dlg.open) dlg.close();
    if (!gatePassed) {
      gatePassed = true;
      await registerDevice();
      proceed();
    }
    return;
  }

  gatePassed = false;
  const copy = GATE_COPY[state];
  $("gate-title").textContent = copy.title;
  $("gate-body").innerHTML = copy.body;
  const btn = $("gate-button");
  btn.hidden = !copy.button;
  if (state === "unsupported") {
    const v = iosVersion();
    if (v && (v[0] < 16 || (v[0] === 16 && v[1] < 4))) {
      $("gate-body").innerHTML = `Seu iPhone está no iOS ${v.join(".")}. Notificação de app web só funciona do <b>iOS 16.4</b> pra cima.
        Atualiza o iPhone (Ajustes → Geral → Atualização de Software) e volta aqui.`;
    }
    $("gate-body").innerHTML += `<br><br><span class="muted small tech">Detalhe técnico: ${esc(pushProblem || "desconhecido")}
      · app: ${isStandalone ? "sim" : "não"} · ${esc(navigator.userAgent.match(/\(([^)]+)\)/)?.[1] || "")}</span>`;
    btn.onclick = () => location.reload();
  } else if (copy.button) {
    btn.textContent = copy.button;
    btn.onclick = async () => {
      // Must come straight from a tap — iOS requires it.
      busy(btn, true, "Esperando você deixar…");
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        busy(btn, true, "Registrando o aparelho…");
        toast("Pronto. Agora você é nosso. 🔔");
      }
      await checkGate();
      busy(btn, false);
    };
  }
  if (!dlg.open) dlg.showModal();
}
$("dlg-gate").addEventListener("cancel", (e) => e.preventDefault()); // no escaping

// Runs the next popup in line once the gate is passed: name first, then the daily question.
function proceed() {
  if (!gatePassed || !meLoaded) return;
  if (!me.name) openNamePicker();
  else if (!askedDaily) { askedDaily = true; maybeAskDaily(); }
}

// ---------- State ----------
let me = null;          // users/{uid} data
let meLoaded = false;
let askedDaily = false;
let trips = [];
let tripsLoaded = false;
let unsubs = [];

// ---------- Auth flow ----------
const messagingReady = initMessaging().catch((e) => { console.error(e); return false; });

onAuthStateChanged(auth, async (user) => {
  unsubs.forEach((u) => u());
  unsubs = [];
  me = null;
  meLoaded = false;
  askedDaily = false;
  gatePassed = false;
  tripsLoaded = false;
  trips = [];

  if (needsInstall) {
    show("view-app", false);
    show("topbar", false);
    show("view-login", false);
    show("view-install");
    return;
  }
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
  renderTrips(); // shows the loading state until data arrives

  // First person to log in after setup becomes admin (no-op once an admin exists).
  api.claimAdmin().then(({ data }) => { if (data.claimed) toast("Você é o admin agora. 👑", 4000); })
    .catch((e) => console.error("claimAdmin", e));

  // My profile
  unsubs.push(onSnapshot(doc(db, "users", user.uid), (snap) => {
    me = snap.exists() ? snap.data() : {};
    meLoaded = true;
    $("settings-name").textContent = me.name || "(sem apelido)";
    show("admin", me.admin === true);
    renderDays();
    proceed();
  }));

  // Upcoming trips
  const since = Timestamp.fromMillis(Date.now() - 3 * 3600000);
  const q = query(collection(db, "trips"), where("when", ">=", since), orderBy("when"));
  unsubs.push(onSnapshot(q, (snap) => {
    trips = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    tripsLoaded = true;
    renderTrips();
  }, (err) => console.error("trips", err)));

  checkGate();
});

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  busy(btn, true, "Conferindo…");
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch {
    toast("Errou o e-mail ou a senha. Concentra.");
  } finally {
    busy(btn, false);
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
  e.preventDefault();
  const name = ($("name-custom").value.trim() || chosenName).slice(0, 40);
  if (!name) { toast("Escolhe um, vai."); return; }
  const ok = await withBusy(e.submitter, async () => {
    await setDoc(doc(db, "users", auth.currentUser.uid), { name, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  }, "Batizando…");
  if (ok) { $("dlg-name").close(); toast(`Prazer, ${name}. ☕`); }
});

// ---------- Daily question ----------
function isNagDayForMe(weekday) {
  if (weekday === FRIDAY) return true;
  return !((me && me.skipDays) || []).includes(weekday);
}

function maybeAskDaily() {
  if (!gatePassed) return;
  if ($("dlg-daily").open || $("dlg-when").open || $("dlg-name").open || $("dlg-gate").open) return;
  const today = spParts();
  if (me && me.lastAnswered === today.key) { wantDailyQuestion = false; return; }
  const due = today.hour >= 12 && isNagDayForMe(today.weekday);
  if (wantDailyQuestion || due) {
    wantDailyQuestion = false;
    $("daily-hint").textContent = today.weekday === FRIDAY
      ? "É sexta. Sexta é obrigatório. 💅"
      : `Se disser não, nunca mais te pergunto na ${DAY_NAMES[today.weekday]}. (Dá pra mudar nas configurações)`;
    $("dlg-daily").showModal();
  }
}

$("daily-yes").addEventListener("click", () => {
  $("dlg-daily").close();
  openWhenPicker();
});

$("daily-no").addEventListener("click", async () => {
  $("daily-yes").disabled = true;
  const res = await withBusy($("daily-no"), () => api.answerNo(), "Anotando…");
  $("daily-yes").disabled = false;
  if (!res) return;
  $("dlg-daily").close();
  toast(res.data.skipped
    ? `Beleza. Nunca mais te pergunto na ${res.data.skipped}.`
    : "Anotado. Mas sexta que vem eu pergunto de novo. 😌", 4500);
});

// ---------- When picker / create trip ----------
// Custom day + time selects (instead of the native date picker, which shows the
// phone's language and its own arrow).
const pad2 = (n) => String(n).padStart(2, "0");
const localDayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const localTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const WEEK_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function fillWhenSelects() {
  const now = new Date();
  const day = $("when-day");
  day.innerHTML = `<option value="" disabled selected>Dia</option>`;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const label = i === 0 ? "Hoje" : i === 1 ? "Amanhã" : `${WEEK_SHORT[d.getDay()]}, ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
    day.add(new Option(label, localDayKey(d)));
  }
  const time = $("when-time");
  time.innerHTML = `<option value="" disabled selected>Hora</option>`;
  for (let m = 0; m < 24 * 60; m += 15) time.add(new Option(`${pad2(m / 60 | 0)}:${pad2(m % 60)}`, `${pad2(m / 60 | 0)}:${pad2(m % 60)}`));
}

// Puts a specific date into the selects (adds an exact time option if needed, e.g. "Agora").
function setWhen(date) {
  $("when-day").value = localDayKey(date);
  const t = localTime(date);
  const sel = $("when-time");
  if (![...sel.options].some((o) => o.value === t)) {
    const opt = new Option(t, t);
    const before = [...sel.options].find((o) => o.value && o.value > t);
    sel.add(opt, before || null);
  }
  sel.value = t;
  updateWhenSubmit();
}

function chosenWhen() {
  const d = $("when-day").value;
  const t = $("when-time").value;
  return d && t ? new Date(`${d}T${t}:00`) : null;
}

function updateWhenSubmit() {
  $("when-submit").disabled = !chosenWhen();
}

function openWhenPicker() {
  const now = new Date();
  const chips = $("when-chips");
  chips.innerHTML = "";
  const at = (h, addDays = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + addDays, h, 0);
  const options = [
    ["Agora", new Date(now.getTime() + 5 * 60000)],
    ["Daqui 1h", new Date(now.getTime() + 60 * 60000)],
    // After 18h, today's 18h is gone, so it rolls over to tomorrow.
    now.getHours() < 18 ? ["Às 18h", at(18)] : ["Amanhã 18h", at(18, 1)],
    ["Amanhã cedo", at(9, 1)],
  ];
  for (const [label, date] of options) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = label;
    b.onclick = () => {
      setWhen(date);
      chips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("selected", c === b));
    };
    chips.appendChild(b);
  }
  fillWhenSelects();
  updateWhenSubmit();
  $("dlg-when").showModal();
}

$("btn-market").addEventListener("click", openWhenPicker);
$("when-cancel").addEventListener("click", () => $("dlg-when").close());
for (const id of ["when-day", "when-time"]) {
  $(id).addEventListener("change", () => {
    $("when-chips").querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
    updateWhenSubmit();
  });
}

$("when-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const when = chosenWhen();
  if (!when) return toast("Escolhe dia e hora.");
  $("when-cancel").disabled = true;
  const res = await withBusy($("when-submit"), () => api.createTrip({ when: when.toISOString() }), "Avisando geral…");
  $("when-cancel").disabled = false;
  if (!res) return updateWhenSubmit();
  $("dlg-when").close();
  toast(res.data.sent ? `Avisei ${res.data.sent} aparelho(s). Agora aguenta. 📣` : "Criado. Mas ninguém mais tem notificação ativada. 🦗");
});

// ---------- Trips list ----------
function renderTrips() {
  const list = $("trips");
  const uid = auth.currentUser && auth.currentUser.uid;
  const cutoff = Date.now() - 60 * 60000; // keep showing for 1h after it starts
  const visible = trips.filter((t) => t.when && t.when.toMillis() >= cutoff);

  // Don't redraw while a trip button is mid-action (keeps its loading state).
  if (list.querySelector(".busy")) return;
  list.innerHTML = "";
  show("trips-loading", !tripsLoaded);
  show("trips-empty", tripsLoaded && visible.length === 0);

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
  const res = await withBusy(btn, fn);
  if (res) toast(okMsg);
  renderTrips(); // pick up any update that arrived while busy
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
      wrap.classList.add("saving");
      wrap.querySelectorAll("input").forEach((x) => (x.disabled = true));
      try {
        await setDoc(doc(db, "users", auth.currentUser.uid),
          { skipDays: [...current].sort(), updatedAt: serverTimestamp() }, { merge: true });
        toast(cb.checked ? `Ok, volto a perguntar na ${DAY_NAMES[i]}. 😈` : `Ok, ${DAY_NAMES[i]} tá liberada.`);
      } catch (err) { toast(friendlyError(err)); cb.checked = !cb.checked; }
      wrap.classList.remove("saving");
      renderDays();
    };
    l.append(label, cb);
    wrap.appendChild(l);
  });
}

$("open-settings").addEventListener("click", () => $("dlg-settings").showModal());
$("settings-close").addEventListener("click", () => $("dlg-settings").close());
$("change-name").addEventListener("click", () => { $("dlg-settings").close(); openNamePicker(); });

$("logout").addEventListener("click", async () => {
  busy($("logout"), true, "Saindo…");
  try {
    if (currentToken) {
      await deleteDoc(doc(db, "devices", currentToken));
      await deleteToken(messaging);
      currentToken = null;
    }
  } catch (err) { console.error(err); }
  await signOut(auth);
  busy($("logout"), false);
  $("dlg-settings").close();
});

// ---------- Admin ----------
function adminOut(lines) {
  $("adm-out").innerHTML = lines.map(([ok, text]) =>
    `<div class="${ok ? "ok" : "warn"}">${ok ? "✓" : "⚠"} ${esc(text)}</div>`).join("");
}

$("adm-health").addEventListener("click", async () => {
  const lines = [];
  const supported = await messagingReady;
  lines.push([true, `Config Firebase: ${config.projectId}`]);
  lines.push([supported, `Navegador suporta push: ${supported ? "sim" : "não"}`]);
  const perm = "Notification" in window ? Notification.permission : "indisponível";
  lines.push([perm === "granted", `Permissão de notificação: ${perm}`]);
  if (pushProblem) lines.push([false, `Problema de push: ${pushProblem}`]);
  const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
  lines.push([!!(reg && reg.active), `Service worker: ${reg && reg.active ? "ativo" : "não encontrado"}`]);
  lines.push([!isIOS || isStandalone, `Modo app (Tela de Início): ${isStandalone ? "sim" : "não"}`]);
  lines.push([!!currentToken, `Token deste aparelho: ${currentToken ? "ok" : "nenhum"}`]);
  adminOut(lines);

  const res = await withBusy($("adm-health"), () => api.adminHealth({ token: currentToken }), "Examinando…");
  if (!res) return;
  const h = res.data;
  lines.push([true, `Servidor: ${h.serverTime}`]);
  lines.push([h.myDeviceRegistered, `Este aparelho no servidor: ${h.myDeviceRegistered ? "sim" : "não"} (você tem ${h.myDevices})`]);
  lines.push([true, `Pessoas: ${h.users} — ${h.names.join(", ") || "ninguém"}`]);
  lines.push([h.usersWithoutDevices.length === 0, `Sem aparelho: ${h.usersWithoutDevices.join(", ") || "ninguém"}`]);
  lines.push([true, `Aparelhos: ${h.devices}`]);
  lines.push([h.devicesWithoutProfile === 0, `Aparelhos sem perfil: ${h.devicesWithoutProfile}`]);
  lines.push([h.deadTokensRemoved === 0, `Tokens mortos removidos: ${h.deadTokensRemoved}`]);
  lines.push([true, `Mercados: ${h.tripsUpcoming} futuros, ${h.tripsPast} passados`]);
  adminOut(lines);
});

$("adm-test").addEventListener("click", async () => {
  const res = await withBusy($("adm-test"), () => api.adminTest(), "Mandando…");
  if (res) toast(res.data.sent ? `Enviado pra ${res.data.sent} aparelho(s) seu(s).` : "Você não tem aparelho registrado. 🤔");
});

// Clears this device (push token + service worker), then logs out and reloads.
// Note: browsers don't let a site revoke its own notification permission —
// to see the permission prompt again, remove it in the phone/browser settings
// (on iPhone: delete the app from the Home Screen and add it again).
async function wipeThisDevice() {
  try { if (messaging) await deleteToken(messaging); } catch (e) { console.error(e); }
  try {
    const regs = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistrations() : [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch (e) { console.error(e); }
  try { localStorage.clear(); sessionStorage.clear(); } catch {}
  await signOut(auth);
  location.reload();
}

async function adminReset(btn, scope, question) {
  if (!confirm(question)) return;
  if (scope === "all" && !confirm("Certeza MESMO? Apaga mercados, apelidos e aparelhos de TODO MUNDO.")) return;
  const res = await withBusy(btn, () => api.adminReset({ scope }), "Apagando…");
  if (!res) return;
  busy(btn, true, "Limpando este aparelho…");
  await wipeThisDevice();
}

$("adm-reset-me").addEventListener("click", () => adminReset($("adm-reset-me"), "me",
  "Apagar seu apelido, seus mercados e seus aparelhos? Você vai ver tudo de novo como novato."));
$("adm-nuke").addEventListener("click", () => adminReset($("adm-nuke"), "all",
  "Apagar TUDO de todo mundo? (Só o seu status de admin fica.)"));

// Coming back to the app (e.g. from a notification) — re-check the daily question.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !auth.currentUser) return;
  checkGate();
  if (gatePassed && meLoaded && me && me.name) maybeAskDaily();
});

// ---------- Lock the page behind open popups (iOS lets you drag it otherwise) ----------
(function lockScrollUnderDialogs() {
  let savedY = 0;
  const update = () => {
    const anyOpen = !!document.querySelector("dialog[open]");
    const root = document.documentElement;
    if (anyOpen && !root.classList.contains("modal-open")) {
      savedY = window.scrollY;
      document.body.style.top = `-${savedY}px`;
      root.classList.add("modal-open");
    } else if (!anyOpen && root.classList.contains("modal-open")) {
      root.classList.remove("modal-open");
      document.body.style.top = "";
      window.scrollTo(0, savedY);
    }
  };
  const obs = new MutationObserver(update);
  document.querySelectorAll("dialog").forEach((d) => obs.observe(d, { attributes: true, attributeFilter: ["open"] }));
})();
