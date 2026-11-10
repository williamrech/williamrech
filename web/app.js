import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where,
  orderBy, limit, serverTimestamp, Timestamp,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-functions.js";
import {
  getMessaging, getToken, deleteToken, onMessage, isSupported,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging.js";

const $ = (id) => document.getElementById(id);
const show = (id, on = true) => { $(id).hidden = !on; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- Fun content (Firestore config/fun, edited by hand in the console) ----------
// Defaults are used until the doc loads (or if it doesn't exist).
let FUN = {};
const funList = (key, fallback) => (Array.isArray(FUN[key]) && FUN[key].length ? FUN[key] : fallback);

// Same "version" for the whole family on a given day: chosen from the date, in Brasília time.
// Purely decorative — not the real app version.
function renderVersion() {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()); // YYYY-MM-DD
  const md = key.slice(5);
  const weekday = new Date(key + "T12:00:00").getDay();
  const specials = (FUN.versionSpecials && typeof FUN.versionSpecials === "object") ? FUN.versionSpecials : {};
  const words = funList("versionWords", []);
  const odds = Number(FUN.versionOdds) || 0;

  // Tiny deterministic hash of the date.
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;

  let v = typeof specials[md] === "string" ? specials[md] : "";
  if (!v && md.endsWith("-13") && weekday === 5 && FUN.friday13) v = String(FUN.friday13);
  if (!v && odds > 0 && words.length && h % odds === 0) {
    // Joke words go in the 2nd or 3rd slot (1.oxe.0 or 1.0.oxe), never the 1st.
    const w = String(words[(h >>> 3) % words.length]);
    v = (h >>> 11) % 2 ? `1.${w}.0` : `1.0.${w}`;
  }
  document.getElementById("version").textContent = v || "1.0.0";
  show("footer-version", true);
}

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
// Local cache: the feed and chamados show instantly from the last visit, then sync live.
let db;
try {
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (e) {
  console.warn("no persistent cache", e);
  db = initializeFirestore(app, {});
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Fun content: live, so console edits show up without a reload.
onSnapshot(doc(db, "config", "fun"), (snap) => {
  FUN = snap.exists() ? snap.data() : {};
  renderVersion();
}, (err) => { console.warn("config/fun", err); renderVersion(); });
const functions = getFunctions(app, "us-central1");
const apiFn = httpsCallable(functions, "api");
const call = (action) => (data = {}) => apiFn({ ...data, action });
const api = {
  fireTemplate: call("fireTemplate"),
  answerRound: call("answerRound"),
  closeRound: call("closeRound"),
  muteTemplate: call("muteTemplate"),
  adminHealth: call("adminHealth"),
  adminTest: call("adminTest"),
  adminReset: call("adminReset"),
  claimAdmin: call("claimAdmin"),
};

// ---------- Constants ----------
const TZ = "America/Sao_Paulo";
const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const DEFAULT_NAMES = [
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
const DEFAULT_BUSY = ["Passando o café…", "Moendo os grãos…", "Esquentando a água…", "Coando…", "Fofocando com o servidor…"];
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
    btn.innerHTML = `<span class="cup" aria-hidden="true"></span><span class="busy-text">${esc(label || pick(funList("busyLines", DEFAULT_BUSY)))}</span>`;
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
let highlightRound = params.get("rodada");
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

// Runs the next popup in line once the gate is passed: name + gender first.
function proceed() {
  if (!gatePassed || !meLoaded) return;
  if (!me.name || !me.gender) openNamePicker();
}

// ---------- State ----------
let me = null;          // users/{uid} data
let meLoaded = false;
let templates = [];     // my chamados
let rounds = [];        // rounds I'm part of
let roundsLoaded = false;
let family = {};        // uid -> user profile
let unsubs = [];

// ---------- Auth flow ----------
const messagingReady = initMessaging().catch((e) => { console.error(e); return false; });

onAuthStateChanged(auth, async (user) => {
  unsubs.forEach((u) => u());
  unsubs = [];
  me = null;
  meLoaded = false;
  gatePassed = false;
  templates = [];
  rounds = [];
  roundsLoaded = false;
  family = {};

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
  renderPins();
  renderChamados();
  renderRounds();

  // First person to log in after setup becomes admin (no-op once an admin exists).
  api.claimAdmin().then(({ data }) => { if (data.claimed) toast("Você é o admin agora. 👑", 4000); })
    .catch((e) => console.error("claimAdmin", e));

  // My profile
  unsubs.push(onSnapshot(doc(db, "users", user.uid), (snap) => {
    me = snap.exists() ? snap.data() : {};
    meLoaded = true;
    $("settings-name").textContent = me.name || "(sem apelido)";
    show("admin", me.admin === true);
    renderSettings();
    renderMeChip();
    proceed();
  }));

  // Family (names for pickers and lists)
  unsubs.push(onSnapshot(collection(db, "users"), (snap) => {
    family = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
    renderMeChip();
    renderRounds(); // names/styles may have changed
  }, (err) => console.error("users", err)));

  // My chamados
  unsubs.push(onSnapshot(query(collection(db, "templates"), where("ownerUid", "==", user.uid)), (snap) => {
    templates = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    renderPins();
    renderChamados();
  }, (err) => console.error("templates", err)));

  // Rounds I'm part of
  const rq = query(collection(db, "rounds"), where("participants", "array-contains", user.uid),
    orderBy("createdAt", "desc"), limit(30));
  unsubs.push(onSnapshot(rq, (snap) => {
    rounds = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    roundsLoaded = true;
    renderRounds();
  }, (err) => console.error("rounds", err)));

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
let chosenGender = "";
$("gender-chips").addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (!b) return;
  chosenGender = b.dataset.g;
  $("gender-chips").querySelectorAll(".chip").forEach((c) => c.classList.toggle("selected", c === b));
});
function openNamePicker() {
  const dlg = $("dlg-name");
  if (dlg.open) return;
  chosenName = "";
  $("name-custom").value = (me && me.name) || "";
  chosenGender = (me && me.gender) || "";
  $("gender-chips").querySelectorAll(".chip").forEach((c) => c.classList.toggle("selected", c.dataset.g === chosenGender));
  const chips = $("name-chips");
  chips.innerHTML = "";
  // Show a random handful so it's different each time.
  const options = [...funList("nameSuggestions", DEFAULT_NAMES)].sort(() => Math.random() - 0.5).slice(0, 7);
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
$("dlg-name").addEventListener("cancel", (e) => { if (!me || !me.name || !me.gender) e.preventDefault(); });
$("name-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = ($("name-custom").value.trim() || chosenName).slice(0, 40);
  if (!name) { toast("Escolhe um apelido, vai."); return; }
  if (!chosenGender) { toast("Menino ou menina? Pra eu xingar direito."); return; }
  const ok = await withBusy(e.submitter, async () => {
    await setDoc(doc(db, "users", auth.currentUser.uid), { name, gender: chosenGender, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  }, "Batizando…");
  if (ok) { $("dlg-name").close(); toast(`Prazer, ${name}. ☕`); }
});

// ---------- Settings ----------
const TIMES_15 = Array.from({ length: 96 }, (_, i) => `${String(i / 4 | 0).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`);
const TIMES_30 = Array.from({ length: 48 }, (_, i) => `${String(i / 2 | 0).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
function fillTimeSelect(sel, values, current) {
  sel.innerHTML = "";
  for (const v of values) sel.add(new Option(v, v));
  if (current) sel.value = current;
}

function renderSettings() {
  const q = (me && me.quiet) || {};
  $("quiet-on").checked = !!q.on;
  show("quiet-times", !!q.on);
  show("quiet-hint", !!q.on);
  if (!$("quiet-start").options.length) {
    fillTimeSelect($("quiet-start"), TIMES_30, "22:00");
    fillTimeSelect($("quiet-end"), TIMES_30, "08:00");
  }
  $("quiet-start").value = q.start || "22:00";
  $("quiet-end").value = q.end || "08:00";

  const list = $("muted-list");
  const mutes = Object.entries((me && me.mutes) || {});
  list.innerHTML = mutes.length ? "" : `<li class="muted small">Nenhum. Que pessoa paciente. 😇</li>`;
  for (const [tid, m] of mutes) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${esc(m.emoji || "🔔")} ${esc(m.title)} <span class="muted small">· de ${esc(m.owner || "?")}</span></span>`;
    const b = document.createElement("button");
    b.className = "link small";
    b.textContent = "reativar";
    b.onclick = async () => {
      const res = await withBusy(b, () => api.muteTemplate({ templateId: tid, mute: false }), "…");
      if (res) toast(`Reativado. Bem-vind${g(me, "o", "a")} de volta ao caos. 🔔`);
    };
    li.appendChild(b);
    list.appendChild(li);
  }
}

async function saveQuiet() {
  const quiet = { on: $("quiet-on").checked, start: $("quiet-start").value, end: $("quiet-end").value };
  show("quiet-times", quiet.on);
  show("quiet-hint", quiet.on);
  try {
    await setDoc(doc(db, "users", auth.currentUser.uid), { quiet, updatedAt: serverTimestamp() }, { merge: true });
    toast(quiet.on ? `Silêncio das ${quiet.start} às ${quiet.end}. 🌙` : "Não me perturbe desligado. Coragem.");
  } catch (err) { toast(friendlyError(err)); }
}
["quiet-on", "quiet-start", "quiet-end"].forEach((id) => $(id).addEventListener("change", saveQuiet));

$("open-settings").addEventListener("click", () => $("dlg-settings").showModal());
$("settings-close").addEventListener("click", () => $("dlg-settings").close());
$("change-name").addEventListener("click", () => { $("dlg-settings").close(); openNamePicker(); });
$("dlg-name").addEventListener("close", () => { if (me && me.name && me.gender) return; setTimeout(proceed, 50); });

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

// First visible character (keeps multi-part emoji like 👨‍👩‍👧 whole).
function firstGrapheme(str) {
  if (!str) return "";
  try { return new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(str)[Symbol.iterator]().next().value.segment; }
  catch { return [...str][0]; }
}

// ---------- Styled names (color, font, effect, badge) — everyone sees them ----------
const NAME_COLORS = ["#e2c39b", "#c98b4f", "#f0a594", "#ff8fb1", "#b9a4ff", "#7fc8f8", "#8fd694", "#f5d76e", "#ffffff"];
const NAME_FONTS = { classic: "Clássica", bold: "Negrito", round: "Fofa", script: "Cursiva", mono: "Máquina" };
const NAME_EFFECTS = { none: "Normal", glow: "Brilho", rainbow: "Arco-íris", wavy: "Ondinha", shadow: "Sombra" };
const NAME_BADGES = ["", "👑", "☕", "🍦", "✨", "🔥", "💅", "🐸", "🦄", "🌵", "🍕", "🐔"];

function cleanStyle(st) {
  st = st || {};
  return {
    color: NAME_COLORS.includes(st.color) ? st.color : NAME_COLORS[0],
    font: st.font in NAME_FONTS ? st.font : "classic",
    effect: st.effect in NAME_EFFECTS ? st.effect : "none",
    badge: typeof st.badge === "string" ? st.badge.slice(0, 4) : "",
  };
}

function styledName(name, style) {
  const st = cleanStyle(style);
  // Badge goes on the left, same line as the name.
  return `<span class="uname-wrap">${st.badge ? `<span class="ubadge">${esc(st.badge)}</span>` : ""}` +
    `<span class="uname f-${st.font} x-${st.effect}" style="--uc:${st.color}">${esc(name)}</span></span>`;
}

function nameHtml(uid, fallback) {
  const p = family[uid];
  return styledName((p && p.name) || fallback || "?", p && p.style);
}

function renderMeChip() {
  const chip = $("me-chip");
  if (!chip || !auth.currentUser) return;
  const p = family[auth.currentUser.uid] || me || {};
  chip.innerHTML = p.name ? styledName(p.name, p.style) : "…";
}

let draftStyle = null;
function renderStyleEditor() {
  const p = me || {};
  $("style-preview").innerHTML = styledName(p.name || "Você", draftStyle);
  const mk = (wrapId, entries, key, render) => {
    const wrap = $(wrapId);
    wrap.innerHTML = "";
    for (const [value, label] of entries) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (draftStyle[key] === value ? " selected" : "");
      render(b, value, label);
      b.onclick = () => { draftStyle[key] = value; renderStyleEditor(); };
      wrap.appendChild(b);
    }
  };
  mk("style-colors", NAME_COLORS.map((c) => [c, c]), "color", (b, c) => {
    b.className += " swatch";
    b.style.setProperty("--sw", c);
    b.setAttribute("aria-label", c);
  });
  mk("style-fonts", Object.entries(NAME_FONTS), "font", (b, v, l) => { b.innerHTML = `<span class="f-${v}">${l}</span>`; });
  mk("style-effects", Object.entries(NAME_EFFECTS), "effect", (b, v, l) => { b.innerHTML = `<span class="uname x-${v}" style="--uc:${draftStyle.color}">${l}</span>`; });
  mk("style-badges", NAME_BADGES.map((e) => [e, e || "nenhum"]), "badge", (b, v, l) => { b.textContent = l; });
}

$("me-chip").addEventListener("click", () => {
  draftStyle = cleanStyle(me && me.style);
  renderStyleEditor();
  $("dlg-style").showModal();
});
$("style-cancel").addEventListener("click", () => $("dlg-style").close());
$("style-rename").addEventListener("click", () => { $("dlg-style").close(); openNamePicker(); });
$("style-save").addEventListener("click", async () => {
  const ok = await withBusy($("style-save"), async () => {
    await setDoc(doc(db, "users", auth.currentUser.uid), { style: draftStyle, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  }, "Salvando…");
  if (ok) { $("dlg-style").close(); toast("Lindo. Todo mundo vai ver. ✨"); }
});

// ---------- Chamados: buttons, live feed, editor ----------
const STARTERS = [
  { emoji: "🍝", title: "Vai ter almoço hoje?", body: "Responde logo que a gente precisa se organizar.", answerType: "options",
    options: ["Sim", "Não", "Só se alguém ajudar"], recipients: [], visibility: "all", nagEveryMin: 30, durationHours: 4,
    schedule: { on: true, days: [0], time: "09:00" }, allowMute: false, label: "Almoço de domingo" },
  { emoji: "🛒", title: "Precisa de algo do mercado?", body: "Tô indo. Fala agora ou cala pra sempre.", answerType: "text",
    options: [], recipients: "all", visibility: "all", nagEveryMin: 0, durationHours: 2,
    schedule: { on: false, days: [], time: "12:00" }, allowMute: true, label: "Precisa de algo?" },
  { emoji: "🛒", title: "Vai no mercado hoje?", body: "Sim ou não, sem enrolação.", answerType: "yesno",
    options: [], recipients: "all", visibility: "all", nagEveryMin: 0, durationHours: 8,
    schedule: { on: true, days: [0, 1, 2, 3, 4, 5, 6], time: "12:00" }, allowMute: true, label: "Mercado do dia" },
  { emoji: "🚗", title: "Tô indo no mercado, quem vai junto?", body: "Saindo daqui a pouco.", answerType: "options",
    options: ["Vou junto 🙋", "Não vou"], recipients: "all", visibility: "all", nagEveryMin: 0, durationHours: 2,
    schedule: { on: false, days: [], time: "18:00" }, allowMute: true, label: "Quem vai junto?" },
  { emoji: "🍕", title: "Bora pedir janta?", body: "", answerType: "yesno",
    options: [], recipients: "all", visibility: "all", nagEveryMin: 0, durationHours: 2,
    schedule: { on: false, days: [], time: "19:00" }, allowMute: true, label: "Janta?" },
];
const BLANK = { emoji: "🔔", title: "", body: "", answerType: "yesno", options: [], recipients: "all", visibility: "all",
  nagEveryMin: 0, durationHours: 12, schedule: { on: false, days: [], time: "12:00" }, allowMute: true };

const g = (person, m, f) => ((person && person.gender) === "f" ? f : m);
const nameOf = (uid) => (family[uid] && family[uid].name) || "?";

function relTime(ts) {
  if (!ts || !ts.toMillis) return "agora";
  const min = Math.round((Date.now() - ts.toMillis()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

function recipientsText(r) {
  if (r === "all") return "Todo mundo";
  const names = (r || []).map(nameOf);
  return names.length ? names.join(", ") : "ninguém";
}
function scheduleText(s) {
  if (!s || !s.on) return "Botão";
  const days = (s.days || []).slice().sort();
  const d = days.length === 7 ? "todo dia" : days.map((i) => DAY_SHORT[i].toLowerCase()).join(", ");
  return `⏰ ${d} às ${s.time}`;
}

// Generic confirm popup → Promise<boolean>
function confirmBox(title, body, yes = "Mandar") {
  return new Promise((resolve) => {
    $("confirm-title").textContent = title;
    $("confirm-body").textContent = body;
    $("confirm-yes").textContent = yes;
    const dlg = $("dlg-confirm");
    const done = (v) => { dlg.close(); resolve(v); };
    $("confirm-yes").onclick = () => done(true);
    $("confirm-no").onclick = () => done(false);
    dlg.oncancel = () => resolve(false);
    dlg.showModal();
  });
}

// Pinned favorites (manual chamados with ★), shown above the tabs.
function renderPins() {
  const wrap = $("pins");
  if (!wrap) return;
  const favs = templates.filter((t) => t.favorite && !(t.schedule && t.schedule.on));
  wrap.innerHTML = "";
  show("pins", favs.length > 0);
  for (const t of favs) {
    const b = document.createElement("button");
    b.className = "pin";
    b.innerHTML = `<span class="tile-emoji">${esc(t.emoji || "🔔")}</span><span class="tile-title">${esc(t.title)}</span>`;
    b.onclick = () => fire(t, b);
    wrap.appendChild(b);
  }
}

// "Chamados" tab: everything I created, with send / favorite / edit.
function renderChamados() {
  const list = $("chamados-list");
  if (!list) return;
  if (list.querySelector(".busy")) return;
  list.innerHTML = templates.length ? "" : `<li class="muted empty">Nenhum chamado ainda. Cria um! ✨</li>`;
  const sorted = [...templates].sort((a, b) =>
    (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) ||
    (a.schedule && a.schedule.on ? 1 : 0) - (b.schedule && b.schedule.on ? 1 : 0) ||
    (a.title || "").localeCompare(b.title || ""));
  for (const t of sorted) {
    const scheduled = !!(t.schedule && t.schedule.on);
    const li = document.createElement("li");
    li.className = "chamado";
    const muted = Object.values(t.mutedBy || {});
    li.innerHTML = `
      <button class="chamado-main">
        <span class="tile-emoji">${esc(t.emoji || "🔔")}</span>
        <span class="manage-text"><b>${esc(t.title)}</b>
          <span class="muted small">${esc(scheduleText(t.schedule))} · ${esc(recipientsText(t.recipients))}</span>
          ${muted.length ? `<span class="muted-by small">🔕 ${muted.map(esc).join(", ")} silenciou</span>` : ""}
        </span>
      </button>
      <div class="chamado-actions"></div>`;
    li.querySelector(".chamado-main").onclick = () => openEditor(t);
    const actions = li.querySelector(".chamado-actions");
    if (!scheduled) {
      const star = document.createElement("button");
      star.className = "star" + (t.favorite ? " on" : "");
      star.setAttribute("aria-label", t.favorite ? "Desafixar" : "Fixar no topo");
      star.textContent = t.favorite ? "★" : "☆";
      star.onclick = async () => {
        star.disabled = true;
        try {
          await updateDoc(doc(db, "templates", t.id), { favorite: !t.favorite, updatedAt: serverTimestamp() });
          toast(t.favorite ? "Desafixado." : "Fixado no topo. ⭐");
        } catch (err) { toast(friendlyError(err)); star.disabled = false; }
      };
      actions.appendChild(star);
    }
    const send = document.createElement("button");
    send.className = "secondary small-btn";
    send.textContent = scheduled ? "Mandar agora" : "Mandar";
    send.onclick = () => fire(t, send);
    actions.appendChild(send);
    list.appendChild(li);
  }
}
$("chamados-new").addEventListener("click", () => openEditor(null));

// Tabs (remembered per browser, just a convenience)
function setTab(name) {
  document.querySelectorAll(".tab").forEach((b) => {
    const on = b.dataset.tab === name;
    b.classList.toggle("selected", on);
    b.setAttribute("aria-selected", on);
  });
  show("tab-feed", name === "feed");
  show("tab-chamados", name === "chamados");
  try { localStorage.setItem("tab", name); } catch {}
}
document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
setTab((() => { try { return localStorage.getItem("tab") || "feed"; } catch { return "feed"; } })());

async function fire(t, btn) {
  const who = recipientsText(t.recipients);
  if (!(await confirmBox(`${t.emoji || "🔔"} ${t.title}`, `Mandar pra: ${who}?`))) return;
  const res = await withBusy(btn, () => api.fireTemplate({ templateId: t.id }), "Mandando…");
  if (!res) return;
  const d = res.data;
  toast(d.delayed ? `Mandado! ${d.delayed} pessoa(s) em modo silêncio recebem depois. 🌙` : `Mandado pra ${d.recipients} pessoa(s). 📣`);
}

// Home: live feed of rounds
function renderRounds() {
  const list = $("rounds");
  if (!list || !auth.currentUser) return;
  if (list.querySelector(".busy")) return;
  const uid = auth.currentUser.uid;
  const dayAgo = Date.now() - 24 * 3600000;
  const visible = rounds.filter((r) => r.open || (r.createdAt && r.createdAt.toMillis() > dayAgo));
  list.innerHTML = "";
  show("rounds-empty", roundsLoaded && visible.length === 0);

  for (const r of visible) {
    const li = document.createElement("li");
    li.className = "round" + (r.open ? "" : " closed") + (r.id === highlightRound ? " highlight" : "");
    const mine = r.ownerUid === uid;
    const isRecipient = r.recipients.includes(uid);
    const myAnswer = r.answers && r.answers[uid];
    const canSeeAll = mine || r.visibility === "all";

    // Answers summary
    let answersHtml = "";
    if (r.answerType !== "none") {
      const rows = r.recipients
        .filter((u) => canSeeAll || u === uid)
        .map((u) => {
          const a = r.answers && r.answers[u];
          const who = u === uid ? "Você" : nameHtml(u, r.recipientNames && r.recipientNames[u]);
          if (!a) return `<li class="waiting">${who} <span>…esperando</span></li>`;
          const changed = a.changes ? ` <span class="changed">(mudou ${a.changes}x)</span>` : "";
          return `<li>${who} <b>${esc(a.value)}</b>${changed}</li>`;
        });
      if (r.answerType !== "text" && canSeeAll) {
        const counts = {};
        Object.values(r.answers || {}).forEach((a) => (counts[a.value] = (counts[a.value] || 0) + 1));
        const waiting = r.recipients.length - Object.keys(r.answers || {}).length;
        const summary = Object.entries(counts).map(([v, n]) => `${esc(v)} ${n}`).concat(waiting ? [`esperando ${waiting}`] : []).join(" · ");
        if (summary) answersHtml += `<div class="summary">${summary}</div>`;
      }
      answersHtml += `<ul class="answers">${rows.join("")}</ul>`;
      if (!canSeeAll) answersHtml += `<div class="muted small">Só ${esc(r.ownerName)} vê as respostas.</div>`;
    }

    li.innerHTML = `
      <div class="round-head"><span class="round-emoji">${esc(r.emoji || "🔔")}</span>
        <div><div class="round-title">${esc(r.title)}</div>
        <div class="muted small">${mine ? "Você" : nameHtml(r.ownerUid, r.ownerName)} · ${relTime(r.createdAt)}${r.open ? "" : " · encerrado"}</div></div>
        <div class="round-corner"></div></div>
      ${r.body ? `<p class="round-body">${esc(r.body)}</p>` : ""}
      ${answersHtml}
      <div class="actions"></div>
      <div class="round-foot"></div>`;
    const actions = li.querySelector(".actions");
    const foot = li.querySelector(".round-foot");

    if (isRecipient && r.open && r.answerType !== "none") {
      if (r.answerType === "text") {
        const b = document.createElement("button");
        b.className = myAnswer ? "secondary" : "primary";
        b.textContent = myAnswer ? "Mudar resposta" : "Responder";
        b.onclick = () => openTextAnswer(r);
        actions.appendChild(b);
      } else {
        for (const opt of r.options) {
          const b = document.createElement("button");
          const selected = myAnswer && myAnswer.value === opt;
          b.className = selected ? "primary" : "secondary";
          b.textContent = opt;
          b.onclick = () => answer(r, opt, b);
          actions.appendChild(b);
        }
      }
    }
    // Only the creator can close a round (the server enforces it too).
    if (mine && r.open && r.answerType !== "none") {
      const b = document.createElement("button");
      b.className = "link small";
      b.textContent = "encerrar";
      b.onclick = async () => {
        if (!(await confirmBox("Encerrar?", "Ninguém mais responde e para de insistir.", "Encerrar"))) return;
        const res = await withBusy(b, () => api.closeRound({ roundId: r.id }), "…");
        if (res) toast("Encerrado. 🔒");
      };
      li.querySelector(".round-corner").appendChild(b);
    }
    if (isRecipient && r.allowMute !== false && !(me && me.mutes && me.mutes[r.templateId])) {
      const b = document.createElement("button");
      b.className = "link small";
      b.textContent = "silenciar esse chamado";
      b.onclick = async () => {
        if (!(await confirmBox("Silenciar?", `Você para de receber “${r.title}”. ${r.ownerName} vai ficar sabendo. 😬`, "Silenciar"))) return;
        const res = await withBusy(b, () => api.muteTemplate({ roundId: r.id, mute: true }), "…");
        if (res) toast("Silenciado. Dá pra reativar nas configurações. 🔕");
      };
      foot.appendChild(b);
    }
    list.appendChild(li);
  }
  if (highlightRound) {
    const el = list.querySelector(".highlight");
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); highlightRound = null; }
  }
}
setInterval(renderRounds, 60000);

async function answer(r, value, btn) {
  const res = await withBusy(btn, () => api.answerRound({ roundId: r.id, value }), "…");
  if (!res) return;
  toast(res.data.changes ? `Mudou de ideia (${res.data.changes}ª vez). Todo mundo vai saber. 🌀` : "Respondido! ✓");
  renderRounds();
}

let textRound = null;
function openTextAnswer(r) {
  textRound = r;
  $("text-title").textContent = `${r.emoji || "🔔"} ${r.title}`;
  const mine = r.answers && r.answers[auth.currentUser.uid];
  $("text-input").value = mine ? mine.value : "";
  $("dlg-text").showModal();
  setTimeout(() => $("text-input").focus(), 50);
}
$("text-cancel").addEventListener("click", () => $("dlg-text").close());
$("text-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const v = $("text-input").value.trim();
  if (!v || !textRound) return;
  const res = await withBusy($("text-send"), () => api.answerRound({ roundId: textRound.id, value: v }), "Enviando…");
  if (!res) return;
  $("dlg-text").close();
  toast(res.data.changes ? "Resposta trocada. 🌀" : "Respondido! ✓");
});

// Editor
let ed = null;       // working copy
let edId = null;     // template id when editing

function segSelect(id, value) {
  $(id).querySelectorAll(".chip").forEach((c) => c.classList.toggle("selected", c.dataset.v === value));
}
function segValue(id) {
  const c = $(id).querySelector(".chip.selected");
  return c && c.dataset.v;
}
for (const id of ["ed-type", "ed-visibility", "ed-when"]) {
  $(id).addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (!c) return;
    segSelect(id, c.dataset.v);
    syncEditorVisibility();
  });
}

function syncEditorVisibility() {
  const type = segValue("ed-type");
  show("ed-options", type === "options");
  show("ed-answer-opts", type !== "none");
  show("ed-schedule", segValue("ed-when") === "schedule");
}

function renderRecipients() {
  const wrap = $("ed-recipients");
  wrap.innerHTML = "";
  const uid = auth.currentUser.uid;
  const mk = (label, value) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = label;
    const sel = value === "all" ? ed.recipients === "all" : Array.isArray(ed.recipients) && ed.recipients.includes(value);
    b.classList.toggle("selected", sel);
    b.onclick = () => {
      if (value === "all") ed.recipients = "all";
      else {
        const cur = new Set(Array.isArray(ed.recipients) ? ed.recipients : []);
        cur.has(value) ? cur.delete(value) : cur.add(value);
        ed.recipients = [...cur];
      }
      renderRecipients();
    };
    wrap.appendChild(b);
  };
  mk("Todo mundo", "all");
  Object.entries(family).filter(([u, p]) => u !== uid && p.name)
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .forEach(([u, p]) => mk(p.name, u));
}

function renderEdDays() {
  const wrap = $("ed-days");
  wrap.innerHTML = "";
  DAY_SHORT.forEach((label, i) => {
    const l = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = (ed.schedule.days || []).includes(i);
    cb.onchange = () => {
      const set = new Set(ed.schedule.days || []);
      cb.checked ? set.add(i) : set.delete(i);
      ed.schedule.days = [...set].sort();
    };
    l.append(label, cb);
    wrap.appendChild(l);
  });
}

function loadEditor(t) {
  ed = JSON.parse(JSON.stringify({ ...BLANK, ...t, schedule: { ...BLANK.schedule, ...(t.schedule || {}) } }));
  $("ed-emoji").value = ed.emoji || "";
  $("ed-title").value = ed.title || "";
  $("ed-body").value = ed.body || "";
  $("ed-options").value = (ed.options || []).join(", ");
  segSelect("ed-type", ed.answerType);
  segSelect("ed-visibility", ed.visibility);
  segSelect("ed-when", ed.schedule.on ? "schedule" : "button");
  $("ed-nag").value = String(ed.nagEveryMin || 0);
  $("ed-duration").value = String(ed.durationHours || 12);
  // Only quarter hours: the server checks schedules every 15 minutes.
  const snap = (hm) => { const [h, m] = String(hm || "12:00").split(":").map(Number); const q = Math.round(m / 15) * 15; return `${String((h + (q === 60 ? 1 : 0)) % 24).padStart(2, "0")}:${String(q % 60).padStart(2, "0")}`; };
  fillTimeSelect($("ed-time"), TIMES_15, snap(ed.schedule.time));
  $("ed-mute").checked = ed.allowMute !== false;
  renderRecipients();
  renderEdDays();
  syncEditorVisibility();
}

function openEditor(t) {
  edId = t ? t.id : null;
  $("editor-title").textContent = t ? "Editar chamado" : "Novo chamado";
  show("ed-delete", !!t);
  show("starter-wrap", !t);
  const chips = $("starter-chips");
  chips.innerHTML = "";
  for (const st of STARTERS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = `${st.emoji} ${st.label}`;
    b.onclick = () => {
      loadEditor(st);
      chips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("selected", c === b));
      if (Array.isArray(st.recipients) && !st.recipients.length) toast("Agora escolhe pra quem. 👇");
    };
    chips.appendChild(b);
  }
  loadEditor(t || BLANK);
  $("dlg-editor").showModal();
}

$("ed-cancel").addEventListener("click", () => $("dlg-editor").close());
$("ed-delete").addEventListener("click", async () => {
  if (!edId || !(await confirmBox("Apagar chamado?", "Some pra sempre. As rodadas antigas continuam no histórico.", "Apagar"))) return;
  const ok = await withBusy($("ed-delete"), async () => { await deleteDoc(doc(db, "templates", edId)); return true; }, "…");
  if (ok) { $("dlg-editor").close(); toast("Apagado. 🗑️"); }
});

$("editor-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const type = segValue("ed-type") || "none";
  const scheduleOn = segValue("ed-when") === "schedule";
  const options = $("ed-options").value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 6);
  const data = {
    emoji: firstGrapheme($("ed-emoji").value.trim()) || "🔔",
    title: $("ed-title").value.trim(),
    body: $("ed-body").value.trim(),
    answerType: type,
    options: type === "options" ? options : [],
    recipients: ed.recipients === "all" ? "all" : (ed.recipients || []),
    visibility: segValue("ed-visibility") || "all",
    allowMute: $("ed-mute").checked,
    nagEveryMin: type === "none" ? 0 : Number($("ed-nag").value),
    durationHours: Number($("ed-duration").value),
    schedule: { on: scheduleOn, days: ed.schedule.days || [], time: $("ed-time").value },
    updatedAt: serverTimestamp(),
  };
  if (!data.title) return toast("Dá um título, vai.");
  if (data.recipients !== "all" && !data.recipients.length) return toast("Pra quem? Escolhe alguém.");
  if (type === "options" && options.length < 2) return toast("Coloca pelo menos 2 opções.");
  if (scheduleOn && !data.schedule.days.length) return toast("Escolhe pelo menos um dia.");

  const ok = await withBusy($("ed-save"), async () => {
    if (edId) await updateDoc(doc(db, "templates", edId), data);
    else await addDoc(collection(db, "templates"), { ...data, ownerUid: auth.currentUser.uid, createdAt: serverTimestamp() });
    return true;
  }, "Salvando…");
  if (!ok) return;
  $("dlg-editor").close();
  toast(scheduleOn ? `Agendado: ${scheduleText(data.schedule)}. ⏰` : "Salvo! Tá lá nos seus chamados. ✨");
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
  lines.push([true, `Chamados: ${h.templates} (${h.scheduledTemplates} agendados) · rodadas abertas: ${h.openRounds}`]);
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

// Coming back to the app (e.g. from a notification) — re-check permission and refresh times.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !auth.currentUser) return;
  checkGate();
  renderRounds(); // refresh "há X min"
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
