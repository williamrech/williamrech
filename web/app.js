import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, deleteField, FieldPath, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where,
  orderBy, limit, serverTimestamp, Timestamp,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-functions.js";
import {
  getMessaging, getToken, deleteToken, onMessage, isSupported,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging.js";

const $ = (id) => document.getElementById(id);
const show = (id, on = true) => { $(id).hidden = !on; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- Fun content, palettes & occasions (Firestore config/fun, edited by hand) ----------
// Defaults are used until the doc loads (or if it doesn't exist).
let FUN = {};
const funList = (key, fallback) => (Array.isArray(FUN[key]) && FUN[key].length ? FUN[key] : fallback);
const TZ_SP = "America/Sao_Paulo";
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

// Preview any occasion without changing data: add ?ocasiao=<id> to the address.
const PREVIEW_OCCASION = new URLSearchParams(location.search).get("ocasiao");
// Admin previews (local only, never saved): an occasion object or a palette object.
let previewOcc = null;
let previewPal = null;

const DEFAULT_PALETTE = { name: "Espresso", bg: "#1a1210", surface: "#30221b", text: "#f2e6d6", muted: "#b39d87", accent: "#c98b4f", highlight: "#e2c39b" };

// Today in Brasília time: { y, m, d, weekday, key "YYYY-MM-DD", md "MM-DD" }
function spToday(date = new Date()) {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: TZ_SP }).format(date);
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d, key, md: key.slice(5), weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

// Easter Sunday (Gregorian), as UTC date.
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, month - 1, day);
}

const WD = { sun: 0, dom: 0, mon: 1, seg: 1, tue: 2, ter: 2, wed: 3, qua: 3, thu: 4, qui: 4, fri: 5, sex: 5, sat: 6, sab: 6 };
const pad2s = (n) => String(n).padStart(2, "0");

// Does one date pattern match today? Patterns:
//   12-25 | 2026-11-10 | fri-13 | 2sun-05 | lastfri-11 | easter-47 | 12-20..01-06
function matchesPattern(pat, t) {
  pat = String(pat).trim().toLowerCase();
  if (!pat) return false;
  let m;
  if ((m = pat.match(/^(\d\d-\d\d)\.\.(\d\d-\d\d)$/))) {
    const [a, b] = [m[1], m[2]];
    return a <= b ? t.md >= a && t.md <= b : t.md >= a || t.md <= b; // ranges may wrap the new year
  }
  if (/^\d{4}-\d\d-\d\d$/.test(pat)) return pat === t.key;
  if (/^\d\d-\d\d$/.test(pat)) return pat === t.md;
  if ((m = pat.match(/^([a-z]{3})-(\d\d?)$/)) && m[1] in WD) return t.weekday === WD[m[1]] && t.d === Number(m[2]);
  if ((m = pat.match(/^(\d|last)([a-z]{3})-(\d\d)$/)) && m[2] in WD) {
    if (t.m !== Number(m[3]) || t.weekday !== WD[m[2]]) return false;
    if (m[1] === "last") return t.d + 7 > new Date(Date.UTC(t.y, t.m, 0)).getUTCDate();
    return Math.ceil(t.d / 7) === Number(m[1]);
  }
  if ((m = pat.match(/^easter([+-]\d+)?$/))) {
    const target = new Date(easter(t.y) + Number(m[1] || 0) * 86400000);
    return `${target.getUTCFullYear()}-${pad2s(target.getUTCMonth() + 1)}-${pad2s(target.getUTCDate())}` === t.key;
  }
  return false;
}
// "when" can hold several patterns separated by commas (any one matches).
const occasionMatches = (occ, t) => String(occ.when || "").split(",").some((p) => matchesPattern(p, t));

// All of today's occasions, merged: higher priority wins field by field.
function todaysOccasion() {
  const all = (FUN.occasions && typeof FUN.occasions === "object") ? FUN.occasions : {};
  const t = spToday();
  let list = Object.entries(all).filter(([, o]) => o && typeof o === "object" && o.enabled !== false && occasionMatches(o, t));
  if (previewOcc) list = [[previewOcc.id, previewOcc]];
  else if (PREVIEW_OCCASION && all[PREVIEW_OCCASION]) list = [[PREVIEW_OCCASION, all[PREVIEW_OCCASION]]];
  list.sort((a, b) => (Number(a[1].priority) || 0) - (Number(b[1].priority) || 0));
  const merged = {};
  for (const [id, o] of list) { Object.assign(merged, o); merged.id = id; }
  return list.length ? merged : null;
}

function getPalette(id) {
  const pals = (FUN.palettes && typeof FUN.palettes === "object") ? FUN.palettes : {};
  const p = pals[id];
  return p && typeof p === "object" ? { ...DEFAULT_PALETTE, ...p } : null;
}

function applyPalette(p) {
  const root = document.documentElement.style;
  const set = (v, val) => { if (HEX.test(String(val || ""))) root.setProperty(v, val); else root.removeProperty(v); };
  set("--bg", p.bg); set("--surface", p.surface); set("--fg", p.text);
  set("--muted", p.muted); set("--caramel", p.accent); set("--crema", p.highlight);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && HEX.test(p.bg)) meta.content = p.bg;
}

let todayOcc = null;
// Chooses the look: an occasion forces its palette on everyone; otherwise the user's choice.
function applyLook() {
  todayOcc = todaysOccasion();
  let userPal = (typeof me !== "undefined" && me && me.palette) || "espresso";
  const chosen = getPalette(userPal);
  if (chosen && chosen.onlyOccasions) userPal = "espresso"; // occasion-only palettes can't be kept as a personal choice
  const pal = (previewPal && { ...DEFAULT_PALETTE, ...previewPal }) ||
    (todayOcc && getPalette(todayOcc.palette)) || getPalette(userPal) || getPalette("espresso") || DEFAULT_PALETTE;
  applyPalette(pal);
  const decorSpec = (todayOcc && todayOcc.decor) || pal.decor || "";
  // Remember the look so the next launch paints it immediately (see the inline script in index.html).
  const previewing = !!(previewOcc || previewPal || PREVIEW_OCCASION);
  if (!previewing) try {
    localStorage.setItem("look", JSON.stringify({
      bg: pal.bg, surface: pal.surface, text: pal.text, muted: pal.muted, accent: pal.accent, highlight: pal.highlight, decor: decorSpec,
    }));
  } catch {}
  renderVersion();
  renderBanner();
  placeDecor(decorSpec);
  renderPreviewBar(previewing);
  runEffect(todayOcc && todayOcc.effect);
  if (typeof renderSettings === "function" && typeof auth !== "undefined" && auth.currentUser) renderSettings();
  if (typeof renderAdmin === "function" && typeof auth !== "undefined" && auth.currentUser) renderAdmin();
}

// Little floating bar while an admin preview is active.
function renderPreviewBar(on) {
  let bar = document.getElementById("preview-bar");
  if (!on) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "preview-bar";
    document.body.appendChild(bar);
  }
  const label = previewPal ? `paleta “${previewPal.name || previewPal.id}”` : `ocasião “${(previewOcc && previewOcc.id) || PREVIEW_OCCASION}”`;
  bar.innerHTML = `<span>Prévia: ${esc(label)}</span>`;
  const b = document.createElement("button");
  b.textContent = "sair";
  b.onclick = () => {
    previewOcc = null; previewPal = null;
    if (PREVIEW_OCCASION) { location.href = location.pathname; return; }
    applyLook();
  };
  bar.appendChild(b);
}

// Same "version" for the whole family on a given day. Purely decorative.
function renderVersion() {
  const t = spToday();
  const words = funList("versionWords", []);
  const odds = Number(FUN.versionOdds) || 0;
  let h = 2166136261; // tiny deterministic hash of the date
  for (const c of t.key) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;

  let v = todayOcc && typeof todayOcc.version === "string" ? todayOcc.version : "";
  if (!v && odds > 0 && words.length && h % odds === 0) {
    // Joke words go in the 2nd or 3rd slot (1.oxe.0 or 1.0.oxe), never the 1st.
    const w = String(words[(h >>> 3) % words.length]);
    v = (h >>> 11) % 2 ? `1.${w}.0` : `1.0.${w}`;
  }
  document.getElementById("version").textContent = v || "1.0.0";
  show("footer-version", true);
}

function renderBanner() {
  const el = document.getElementById("banner");
  if (!el) return;
  const text = todayOcc && typeof todayOcc.banner === "string" ? todayOcc.banner : "";
  el.textContent = text;
  if (text && (PREVIEW_OCCASION || previewOcc)) el.insertAdjacentHTML("beforeend", ` <span class="preview-tag">prévia</span>`);
  el.hidden = !text;
}

// Background decor. A "decor" spec is a space-separated mix of drawings from web/decor
// ("latte.svg") and emoji ("🎃🦇"). Occasion decor beats palette decor beats the coffee default.
const DEFAULT_DECOR = "latte.svg mug.svg bean.svg bean.svg bean.svg";
const svgCache = {};
let uploadedSvgs = {}; // drawings uploaded by admins (Firestore decor/{name}); they win over repo files

// Only plain, safe SVGs: no scripts, event handlers, external links or embedded documents.
function cleanSvg(text) {
  let t = String(text || "").trim()
    .replace(/^<\?xml[^>]*>/i, "").replace(/<!DOCTYPE[^>]*>/i, "").replace(/<!--[\s\S]*?-->/g, "").trim();
  if (t.length > 60000 || !/^<svg[\s>]/i.test(t) || !/<\/svg>\s*$/i.test(t)) return "";
  if (/<script|<foreignObject|<iframe|<image|<use[^>]+href\s*=\s*["'](?!#)|\son\w+\s*=|javascript:|href\s*=\s*["'](?!#)/i.test(t)) return "";
  return t;
}

async function loadSvg(name) {
  if (uploadedSvgs[name]) return cleanSvg(uploadedSvgs[name]);
  if (!(name in svgCache)) {
    svgCache[name] = fetch(`decor/${name}`).then((r) => (r.ok ? r.text() : "")).then(cleanSvg).catch(() => "");
  }
  return svgCache[name];
}

function parseDecor(spec) {
  const out = [];
  for (const token of String(spec || "").trim().split(/\s+/).filter(Boolean)) {
    if (/^[\w-]+\.svg$/i.test(token)) out.push({ svg: token });
    else for (const g of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(token)) {
      if (g.segment.trim()) out.push({ emoji: g.segment });
    }
  }
  return out;
}

let decorKey = null;
let lastDecorSpec = "";
function placeDecor(spec, force = false) {
  spec = String(spec || "").trim() || DEFAULT_DECOR;
  lastDecorSpec = spec;
  if (spec === decorKey && !force) return; // don't reshuffle on every config update
  decorKey = spec;
  const box = document.getElementById("decor");
  box.innerHTML = "";
  const items = parseDecor(spec);
  if (!items.length) return;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const edgeX = () => (Math.random() < 0.5 ? rnd(-8, 18) : rnd(78, 102));
  // A short spec (e.g. 3 emoji) gets repeated a bit so the background isn't empty.
  const list = items.length >= 5 ? items : Array.from({ length: Math.min(8, items.length * 2) }, (_, i) => items[i % items.length]);

  list.forEach((it, i) => {
    const big = i < 2; // the first two are the big ones, kept near the sides
    const el = document.createElement("span");
    el.className = "decor-item";
    const size = it.svg ? (big ? rnd(130, 200) : rnd(26, 44)) : (big ? rnd(60, 90) : rnd(26, 46));
    el.style.cssText = `left:${big ? edgeX() : rnd(0, 96)}vw;top:${rnd(2, 95)}vh;` +
      `opacity:${it.svg ? (big ? rnd(0.10, 0.15) : rnd(0.16, 0.26)) : rnd(0.12, 0.22)};` +
      `transform:translate(-50%,-50%) rotate(${rnd(-28, 28)}deg);` +
      (it.svg ? `width:${size}px` : `font-size:${size}px`);
    if (it.emoji) el.textContent = it.emoji;
    else loadSvg(it.svg).then((svg) => { el.innerHTML = svg; });
    box.appendChild(el);
  });
}

// Effects: "confetti" (a burst on open) or "snow" (gentle, continuous).
let effectKey = null;
function runEffect(kind) {
  if (kind === effectKey) return;
  effectKey = kind;
  const layer = document.getElementById("fx");
  layer.innerHTML = "";
  if (!kind || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const css = getComputedStyle(document.documentElement);
  const colors = ["--caramel", "--crema", "--fg", "--muted"].map((v) => css.getPropertyValue(v).trim()).concat(["#ff8fb1", "#7fc8f8", "#f5d76e"]);
  const rnd = (a, b) => a + Math.random() * (b - a);
  if (kind === "confetti") {
    for (let i = 0; i < 70; i++) {
      const s = document.createElement("i");
      s.className = "confetti";
      s.style.cssText = `left:${rnd(0, 100)}vw;background:${colors[i % colors.length]};animation-delay:${rnd(0, 0.8)}s;animation-duration:${rnd(2.4, 4.2)}s;--drift:${rnd(-60, 60)}px;--spin:${rnd(-720, 720)}deg;width:${rnd(6, 10)}px;height:${rnd(8, 14)}px`;
      layer.appendChild(s);
    }
    setTimeout(() => { if (effectKey === "confetti") layer.innerHTML = ""; }, 6000);
  } else if (kind === "snow") {
    for (let i = 0; i < 26; i++) {
      const s = document.createElement("i");
      s.className = "snow";
      s.textContent = "❄";
      s.style.cssText = `left:${rnd(0, 100)}vw;font-size:${rnd(8, 18)}px;opacity:${rnd(0.25, 0.6)};animation-delay:${rnd(-12, 0)}s;animation-duration:${rnd(8, 16)}s;--drift:${rnd(-40, 40)}px`;
      layer.appendChild(s);
    }
  }
}

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
  applyLook();
}, (err) => { console.warn("config/fun", err); applyLook(); });
placeDecor(window.__lookDecor || null); // last known decor right away; config may swap it once loaded

// Uploaded drawings: when they change, redraw the decor (and the admin gallery).
onSnapshot(collection(db, "decor"), (snap) => {
  uploadedSvgs = Object.fromEntries(snap.docs.map((d) => [d.id, d.get("svg")]));
  if (parseDecor(lastDecorSpec).some((it) => it.svg && uploadedSvgs[it.svg])) placeDecor(lastDecorSpec, true);
  if (typeof renderAdmin === "function") renderAdmin();
}, (err) => console.warn("decor", err));
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
  setAdmin: call("setAdmin"),
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
    setAdminVisible(me.admin === true);
    applyLook();
    renderSettings();
    renderMeChip();
    proceed();
  }));

  // Family (names for pickers and lists)
  unsubs.push(onSnapshot(collection(db, "users"), (snap) => {
    family = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
    renderMeChip();
    renderRounds(); // names/styles may have changed
    renderAdmin();
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

function renderPalettes() {
  const wrap = $("palettes");
  if (!wrap) return;
  const pals = (FUN.palettes && typeof FUN.palettes === "object") ? FUN.palettes : { espresso: DEFAULT_PALETTE };
  const current = (me && me.palette) || "espresso";
  const forced = todayOcc && todayOcc.palette && getPalette(todayOcc.palette);
  $("palette-forced").textContent = forced ? `Hoje o tema é obrigatório (${todayOcc.banner || todayOcc.id}). Sua escolha volta amanhã. 😌` : "";
  show("palette-forced", !!forced);
  wrap.innerHTML = "";
  Object.entries(pals)
    .filter(([, p]) => p && typeof p === "object" && !p.onlyOccasions)
    .sort((a, b) => String(a[1].name || a[0]).localeCompare(String(b[1].name || b[0])))
    .forEach(([id, raw]) => {
      const p = { ...DEFAULT_PALETTE, ...raw };
      const b = document.createElement("button");
      b.className = "palette" + (id === current ? " selected" : "");
      const dots = [p.bg, p.surface, p.accent, p.highlight].filter((c) => HEX.test(String(c)))
        .map((c) => `<i style="background:${c}"></i>`).join("");
      b.innerHTML = `<span class="dots">${dots}</span><span>${esc(p.name || id)}</span>`;
      b.onclick = async () => {
        try {
          await setDoc(doc(db, "users", auth.currentUser.uid), { palette: id, updatedAt: serverTimestamp() }, { merge: true });
          toast(forced ? "Salvo. Mas hoje o tema é obrigatório. 🙃" : `Tema ${p.name || id}. ☕`);
        } catch (err) { toast(friendlyError(err)); }
      };
      wrap.appendChild(b);
    });
}

function renderSettings() {
  renderPalettes();
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
function setAdminVisible(on) {
  show("tab-btn-admin", on);
  document.querySelector(".tabs").classList.toggle("three", on);
  if (!on && document.querySelector('.tab[data-tab="admin"].selected')) setTab("feed");
  if (on) renderAdmin();
}

function setTab(name) {
  document.querySelectorAll(".tab").forEach((b) => {
    const on = b.dataset.tab === name;
    b.classList.toggle("selected", on);
    b.setAttribute("aria-selected", on);
  });
  show("tab-feed", name === "feed");
  show("tab-chamados", name === "chamados");
  show("tab-admin", name === "admin");
  if (name === "admin") renderAdmin();
  try { localStorage.setItem("tab", name); } catch {}
}
document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
setTab((() => { try { const t = localStorage.getItem("tab") || "feed"; return t === "admin" ? "feed" : t; } catch { return "feed"; } })());

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

// =====================================================================
// Admin tab: people, palettes, occasions, drawings, texts.
// Everything edits Firestore config/fun (and decor/{name}); rules allow admins only.
// =====================================================================
const funRef = () => doc(db, "config", "fun");
const isAdminNow = () => !!(me && me.admin === true);
const SLUG = /^[a-z0-9-]{2,40}$/;
const PAL_FIELDS = [
  ["bg", "Fundo"], ["surface", "Cartões"], ["text", "Texto"],
  ["muted", "Texto fraco"], ["accent", "Botões"], ["highlight", "Realces"],
];
let builtinDrawings = [];
fetch("decor/index.json").then((r) => r.json()).then((list) => { builtinDrawings = Array.isArray(list) ? list : []; renderAdmin(); }).catch(() => {});

const allPalettes = () => ((FUN.palettes && typeof FUN.palettes === "object") ? FUN.palettes : {});
const allOccasions = () => ((FUN.occasions && typeof FUN.occasions === "object") ? FUN.occasions : {});
const allDrawingNames = () => [...new Set([...builtinDrawings, ...Object.keys(uploadedSvgs)])].sort();

// Next dates an occasion hits (up to n, within ~2 years).
function nextDates(when, n = 3) {
  const out = [];
  const t0 = spToday();
  for (let i = 0; i < 800 && out.length < n; i++) {
    const d = new Date(Date.UTC(t0.y, t0.m - 1, t0.d + i));
    const key = `${d.getUTCFullYear()}-${pad2s(d.getUTCMonth() + 1)}-${pad2s(d.getUTCDate())}`;
    const t = { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), key, md: key.slice(5), weekday: d.getUTCDay() };
    if (String(when || "").split(",").some((p) => matchesPattern(p, t))) out.push({ i, t });
  }
  return out;
}
const fmtDate = ({ i, t }) => (i === 0 ? "hoje" : i === 1 ? "amanhã" : `${DAY_SHORT[t.weekday].toLowerCase()} ${pad2s(t.d)}/${pad2s(t.m)}${t.y !== spToday().y ? "/" + String(t.y).slice(2) : ""}`);

function renderAdmin() {
  if (!isAdminNow() || !$("tab-admin") || $("tab-admin").hidden) return;
  renderAdminPeople();
  renderAdminPalettes();
  renderAdminOccasions();
  renderAdminDrawings();
  renderAdminTexts();
}

// ---------- People ----------
function renderAdminPeople() {
  const list = $("adm-people");
  const uid = auth.currentUser && auth.currentUser.uid;
  const admins = Object.entries(family).filter(([, p]) => p.admin === true).length;
  list.innerHTML = "";
  Object.entries(family).sort((a, b) => String(a[1].name || "").localeCompare(String(b[1].name || ""))).forEach(([u, p]) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${nameHtml(u, "(sem apelido)")}${p.admin ? ` <span class="badge">admin</span>` : ""}${u === uid ? ` <span class="muted small">· você</span>` : ""}</span>`;
    const b = document.createElement("button");
    b.className = "link small";
    const lastAdmin = p.admin && admins <= 1;
    b.textContent = p.admin ? (lastAdmin ? "único admin" : "remover admin") : "tornar admin";
    b.disabled = lastAdmin;
    b.onclick = async () => {
      if (!(await confirmBox(p.admin ? "Remover admin?" : "Tornar admin?", `${p.name || "Essa pessoa"} ${p.admin ? "perde" : "ganha"} acesso à aba Admin.`, "Confirmar"))) return;
      const res = await withBusy(b, () => api.setAdmin({ uid: u, admin: !p.admin }), "…");
      if (res) toast(p.admin ? "Admin removido." : "Novo admin. 👑");
    };
    li.appendChild(b);
    list.appendChild(li);
  });
}

// ---------- Palettes ----------
function paletteDots(p) {
  return [p.bg, p.surface, p.accent, p.highlight].filter((c) => HEX.test(String(c))).map((c) => `<i style="background:${c}"></i>`).join("");
}
function usedByOccasions(palId) {
  return Object.entries(allOccasions()).filter(([, o]) => o && o.palette === palId).map(([id]) => id);
}
function renderAdminPalettes() {
  const list = $("adm-palettes");
  list.innerHTML = "";
  Object.entries(allPalettes()).sort((a, b) => String(a[1].name || a[0]).localeCompare(String(b[1].name || b[0]))).forEach(([id, raw]) => {
    const p = { ...DEFAULT_PALETTE, ...raw };
    const used = usedByOccasions(id);
    const li = document.createElement("li");
    li.innerHTML = `<button class="adm-row"><span class="dots">${paletteDots(p)}</span>
      <span class="adm-row-text"><b>${esc(p.name || id)}</b><span class="muted small">${esc(id)}${raw.onlyOccasions ? " · só ocasiões" : ""}${used.length ? " · usada em " + esc(used.join(", ")) : ""}</span></span></button>`;
    li.querySelector("button").onclick = () => openPaletteEditor(id);
    list.appendChild(li);
  });
}

let palEditing = null; // id when editing
function readPalForm() {
  const obj = { name: $("pal-name").value.trim() };
  for (const [k] of PAL_FIELDS) obj[k] = $(`pal-${k}-hex`).value.trim();
  const decor = $("pal-decor").value.trim();
  if (decor) obj.decor = decor;
  if ($("pal-only").checked) obj.onlyOccasions = true;
  return obj;
}

function renderPalPreview() {
  const p = readPalForm();
  const box = $("pal-preview");
  const vars = { "--bg": p.bg, "--surface": p.surface, "--fg": p.text, "--muted": p.muted, "--caramel": p.accent, "--crema": p.highlight };
  for (const [k, v] of Object.entries(vars)) { if (HEX.test(v)) box.style.setProperty(k, v); }
  const svgs = parseDecor(p.decor || DEFAULT_DECOR).filter((i) => i.svg).slice(0, 3);
  box.innerHTML = `
    <div class="pv-decor">${svgs.map(() => `<span class="pv-svg"></span>`).join("")}</div>
    <div class="pv-card">
      <div class="round-title">Vai ter almoço hoje?</div>
      <div class="muted small">Você · agora</div>
      <div class="chips"><span class="chip selected">Selecionado</span><span class="chip">Normal</span></div>
      <div class="row-buttons"><span class="primary pv-btn">Sim</span><span class="secondary pv-btn">Não</span></div>
    </div>`;
  box.querySelectorAll(".pv-svg").forEach((el, i) => loadSvg(svgs[i].svg).then((t) => { el.innerHTML = t; }));
}

function renderDecorPicker(pickerId, inputId) {
  const wrap = $(pickerId);
  wrap.innerHTML = "";
  for (const name of allDrawingNames()) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = name.replace(/\.svg$/, "");
    b.title = "Adicionar";
    b.onclick = () => {
      const inp = $(inputId);
      inp.value = (inp.value.trim() + " " + name).trim();
      inp.dispatchEvent(new Event("input"));
    };
    wrap.appendChild(b);
  }
}

function openPaletteEditor(id) {
  palEditing = id;
  const raw = id ? allPalettes()[id] || {} : {};
  const p = { ...DEFAULT_PALETTE, ...raw };
  $("pal-title").textContent = id ? `Paleta: ${p.name || id}` : "Nova paleta";
  $("pal-id").value = id || "";
  $("pal-id").readOnly = !!id;
  $("pal-name").value = id ? (p.name || "") : "";
  $("pal-decor").value = raw.decor || "";
  $("pal-only").checked = !!raw.onlyOccasions;
  const colors = $("pal-colors");
  colors.innerHTML = "";
  for (const [k, label] of PAL_FIELDS) {
    const row = document.createElement("label");
    row.className = "pal-color";
    row.innerHTML = `<span>${label}</span><input type="color" id="pal-${k}" value="${HEX.test(p[k]) && p[k].length === 7 ? p[k] : "#000000"}"><input id="pal-${k}-hex" maxlength="7" value="${esc(p[k] || "")}">`;
    colors.appendChild(row);
    const picker = row.querySelector(`#pal-${k}`), hex = row.querySelector(`#pal-${k}-hex`);
    picker.oninput = () => { hex.value = picker.value; renderPalPreview(); };
    hex.oninput = () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) picker.value = hex.value; renderPalPreview(); };
  }
  show("pal-delete", !!id && id !== "espresso");
  renderDecorPicker("pal-decor-picker", "pal-decor");
  renderPalPreview();
  $("dlg-pal").showModal();
}
$("pal-decor").addEventListener("input", renderPalPreview);
$("adm-pal-new").addEventListener("click", () => openPaletteEditor(null));
$("pal-cancel").addEventListener("click", () => $("dlg-pal").close());
$("pal-try").addEventListener("click", () => {
  const p = readPalForm();
  if (PAL_FIELDS.some(([k]) => !HEX.test(p[k]))) return toast("Tem cor inválida. Use #rrggbb.");
  previewOcc = null;
  previewPal = { ...p, id: palEditing || $("pal-id").value.trim() };
  $("dlg-pal").close();
  applyLook();
  toast("Prévia só no seu aparelho. Toque em “sair” pra voltar.", 4000);
});
$("pal-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = palEditing || $("pal-id").value.trim().toLowerCase();
  const p = readPalForm();
  if (!SLUG.test(id)) return toast("ID: só letras minúsculas, números e hífen.");
  if (!palEditing && allPalettes()[id]) return toast("Já existe uma paleta com esse ID.");
  if (!p.name) return toast("Dá um nome pra paleta.");
  const bad = PAL_FIELDS.find(([k]) => !HEX.test(p[k]));
  if (bad) return toast(`Cor inválida em “${bad[1]}”. Use #rrggbb.`);
  const ok = await withBusy($("pal-save"), async () => { await updateDoc(funRef(), new FieldPath("palettes", id), p); return true; }, "Salvando…");
  if (ok) { $("dlg-pal").close(); toast("Paleta salva. 🎨"); }
});
$("pal-delete").addEventListener("click", async () => {
  const id = palEditing;
  const used = usedByOccasions(id);
  const msg = used.length ? `Ela é usada em: ${used.join(", ")}. Essas ocasiões vão ficar sem paleta.` : "Quem tinha escolhido ela volta pro Espresso.";
  if (!(await confirmBox("Apagar paleta?", msg, "Apagar"))) return;
  const ok = await withBusy($("pal-delete"), async () => { await updateDoc(funRef(), new FieldPath("palettes", id), deleteField()); return true; }, "…");
  if (ok) { $("dlg-pal").close(); toast("Paleta apagada."); }
});

// ---------- Occasions ----------
function renderAdminOccasions() {
  const today = todaysOccasion();
  const t = spToday();
  $("adm-today").textContent = `Hoje (${DAY_SHORT[t.weekday].toLowerCase()}, ${pad2s(t.d)}/${pad2s(t.m)}): ${today ? "“" + today.id + "”" : "nenhuma ocasião"}${previewOcc || previewPal ? " (prévia ativa)" : ""}`;
  const list = $("adm-occasions");
  list.innerHTML = "";
  Object.entries(allOccasions())
    .map(([id, o]) => ({ id, o: o || {}, next: nextDates((o || {}).when, 1)[0] }))
    .sort((a, b) => (a.next ? a.next.i : 9999) - (b.next ? b.next.i : 9999) || a.id.localeCompare(b.id))
    .forEach(({ id, o, next }) => {
      const pal = getPalette(o.palette);
      const li = document.createElement("li");
      li.innerHTML = `<button class="adm-row"><span class="dots">${pal ? paletteDots(pal) : ""}</span>
        <span class="adm-row-text"><b>${esc(id)}${o.enabled === false ? ` <span class="badge off">desativada</span>` : ""}${next && next.i === 0 ? ` <span class="badge">hoje</span>` : ""}</b>
        <span class="muted small">${esc(o.when || "(sem data)")} · ${next ? "próxima: " + fmtDate(next) : "nunca"}</span></span></button>`;
      li.querySelector("button").onclick = () => openOccasionEditor(id);
      list.appendChild(li);
    });
}

let occEditing = null;
function readOccForm() {
  const o = { when: $("occ-when").value.trim() };
  const put = (k, v) => { if (v !== "" && v !== null && v !== undefined) o[k] = v; };
  put("banner", $("occ-banner").value.trim());
  put("version", $("occ-version").value.trim());
  put("palette", $("occ-palette").value);
  put("decor", $("occ-decor").value.trim());
  put("effect", $("occ-effect").value);
  const pr = $("occ-priority").value.trim();
  if (pr !== "") o.priority = Number(pr) || 0;
  if (!$("occ-enabled").checked) o.enabled = false;
  return o;
}
function renderWhenInfo() {
  const when = $("occ-when").value.trim();
  if (!when) { $("occ-when-info").textContent = "Sem data: só aparece na prévia."; return; }
  const next = nextDates(when, 3);
  $("occ-when-info").textContent = next.length ? `${next[0].i === 0 ? "✓ Bate hoje · " : ""}Próximas: ${next.map(fmtDate).join(", ")}` : "⚠ Não bate em nenhum dia dos próximos 2 anos. Confere o formato.";
}
function openOccasionEditor(id) {
  occEditing = id;
  const o = id ? allOccasions()[id] || {} : { priority: 5 };
  $("occ-title").textContent = id ? `Ocasião: ${id}` : "Nova ocasião";
  $("occ-id").value = id || "";
  $("occ-id").readOnly = !!id;
  $("occ-when").value = o.when || "";
  $("occ-banner").value = o.banner || "";
  $("occ-version").value = o.version || "";
  $("occ-decor").value = o.decor || "";
  $("occ-effect").value = o.effect || "";
  $("occ-priority").value = o.priority ?? "";
  $("occ-enabled").checked = o.enabled !== false;
  const sel = $("occ-palette");
  sel.innerHTML = `<option value="">(a de cada um)</option>`;
  Object.entries(allPalettes()).forEach(([pid, p]) => sel.add(new Option((p && p.name) || pid, pid)));
  sel.value = o.palette || "";
  show("occ-delete", !!id);
  renderDecorPicker("occ-decor-picker", "occ-decor");
  renderWhenInfo();
  $("dlg-occ").showModal();
}
$("occ-when").addEventListener("input", renderWhenInfo);
$("adm-occ-new").addEventListener("click", () => openOccasionEditor(null));
$("occ-cancel").addEventListener("click", () => $("dlg-occ").close());
$("occ-try").addEventListener("click", () => {
  previewPal = null;
  previewOcc = { ...readOccForm(), id: occEditing || $("occ-id").value.trim() || "nova", enabled: true };
  effectKey = null; // replay the effect
  $("dlg-occ").close();
  applyLook();
  toast("Prévia só no seu aparelho. Toque em “sair” pra voltar.", 4000);
});
$("occ-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = occEditing || $("occ-id").value.trim().toLowerCase();
  const o = readOccForm();
  if (!SLUG.test(id)) return toast("ID: só letras minúsculas, números e hífen.");
  if (!occEditing && allOccasions()[id]) return toast("Já existe uma ocasião com esse ID.");
  const ok = await withBusy($("occ-save"), async () => { await updateDoc(funRef(), new FieldPath("occasions", id), o); return true; }, "Salvando…");
  if (ok) { $("dlg-occ").close(); toast("Ocasião salva. 📅"); }
});
$("occ-delete").addEventListener("click", async () => {
  if (!(await confirmBox("Apagar ocasião?", `“${occEditing}” some pra sempre.`, "Apagar"))) return;
  const ok = await withBusy($("occ-delete"), async () => { await updateDoc(funRef(), new FieldPath("occasions", occEditing), deleteField()); return true; }, "…");
  if (ok) { $("dlg-occ").close(); toast("Ocasião apagada."); }
});

// ---------- Drawings ----------
function renderAdminDrawings() {
  const grid = $("adm-drawings");
  grid.innerHTML = "";
  for (const name of allDrawingNames()) {
    const uploaded = !!uploadedSvgs[name];
    const tile = document.createElement("div");
    tile.className = "drawing";
    tile.innerHTML = `<div class="drawing-img"></div><span class="small">${esc(name.replace(/\.svg$/, ""))}</span>${uploaded ? `<button class="drawing-del" aria-label="Apagar">×</button>` : ""}`;
    loadSvg(name).then((t) => { tile.querySelector(".drawing-img").innerHTML = t || "⚠"; });
    tile.querySelector(".drawing-img").onclick = async () => {
      try { await navigator.clipboard.writeText(name); toast(`“${name}” copiado.`); } catch { toast(name); }
    };
    if (uploaded) {
      tile.querySelector(".drawing-del").onclick = async () => {
        const users = [
          ...Object.entries(allPalettes()).filter(([, p]) => String((p || {}).decor || "").includes(name)).map(([id]) => "paleta " + id),
          ...Object.entries(allOccasions()).filter(([, o]) => String((o || {}).decor || "").includes(name)).map(([id]) => "ocasião " + id),
        ];
        if (!(await confirmBox(`Apagar ${name}?`, users.length ? `Usado em: ${users.join(", ")}. Lá ele simplesmente some.` : "Não é usado em lugar nenhum.", "Apagar"))) return;
        try { await deleteDoc(doc(db, "decor", name)); toast("Desenho apagado."); } catch (err) { toast(friendlyError(err)); }
      };
    }
    grid.appendChild(tile);
  }
}

async function saveDrawing(rawName, text, btn) {
  let name = String(rawName || "").trim().toLowerCase().replace(/\.svg$/, "").replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!name) return toast("Dá um nome pro desenho.");
  name += ".svg";
  const svg = cleanSvg(text);
  if (!svg) return toast("Esse SVG não serve: precisa ser um <svg> simples, sem scripts, links ou imagens, até 60 KB.", 5000);
  if (builtinDrawings.includes(name)) return toast("Já existe um desenho embutido com esse nome. Escolhe outro.");
  if (uploadedSvgs[name] && !(await confirmBox("Substituir?", `Já existe “${name}”. Trocar pelo novo?`, "Substituir"))) return;
  return withBusy(btn, async () => {
    await setDoc(doc(db, "decor", name), { svg, updatedAt: serverTimestamp(), by: auth.currentUser.uid });
    toast(`Desenho “${name}” salvo. Use no campo decor. 🖼️`, 4000);
    return true;
  }, "Enviando…");
}
$("adm-svg-file").addEventListener("change", async (e) => {
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f) return;
  if (f.size > 60000) return toast("Arquivo grande demais (máx. 60 KB).");
  await saveDrawing(f.name, await f.text(), $("adm-svg-paste"));
});
$("adm-svg-paste").addEventListener("click", () => { $("svg-name").value = ""; $("svg-code").value = ""; $("dlg-svg").showModal(); });
$("svg-cancel").addEventListener("click", () => $("dlg-svg").close());
$("svg-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const ok = await saveDrawing($("svg-name").value, $("svg-code").value, $("svg-save"));
  if (ok) $("dlg-svg").close();
});

// ---------- Texts ----------
const linesOf = (id) => $(id).value.split("\n").map((x) => x.trim()).filter(Boolean);
let textsDirty = false;
["adm-odds", "adm-words", "adm-names", "adm-busy"].forEach((id) => $(id).addEventListener("input", () => { textsDirty = true; }));
function renderAdminTexts() {
  $("adm-version-today").textContent = `Versão de hoje: ${$("version").textContent}`;
  if (textsDirty) return; // don't overwrite what's being typed
  $("adm-odds").value = Number(FUN.versionOdds) || 0;
  $("adm-words").value = funList("versionWords", []).join("\n");
  $("adm-names").value = funList("nameSuggestions", DEFAULT_NAMES).join("\n");
  $("adm-busy").value = funList("busyLines", DEFAULT_BUSY).join("\n");
}
$("adm-texts-save").addEventListener("click", async () => {
  const data = {
    versionOdds: Math.max(0, Math.min(365, Number($("adm-odds").value) || 0)),
    versionWords: linesOf("adm-words").slice(0, 200),
    nameSuggestions: linesOf("adm-names").slice(0, 100).map((x) => x.slice(0, 40)),
    busyLines: linesOf("adm-busy").slice(0, 50).map((x) => x.slice(0, 40)),
  };
  const ok = await withBusy($("adm-texts-save"), async () => { await updateDoc(funRef(), data); return true; }, "Salvando…");
  if (ok) { textsDirty = false; toast("Textos salvos. ✍️"); }
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
