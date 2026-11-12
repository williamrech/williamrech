import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, deleteField, FieldPath,
  disableNetwork, enableNetwork, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where,
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
  if ((m = pat.match(/^(\d{4}-\d\d-\d\d)\.\.(\d{4}-\d\d-\d\d)$/))) return t.key >= m[1] && t.key <= m[2];
  if ((m = pat.match(/^easter([+-]\d+)?\.\.easter([+-]\d+)?$/))) {
    const diff = Math.round((Date.UTC(t.y, t.m - 1, t.d) - easter(t.y)) / 86400000);
    return diff >= Number(m[1] || 0) && diff <= Number(m[2] || 0);
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
  applyTerms();
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
  // An occasion's effect is for everyone; otherwise the theme's own effect, unless you switched it off.
  const fxOff = typeof me !== "undefined" && me && me.fxOff === true;
  runEffect((todayOcc && todayOcc.effect) || (!fxOff && pal.effect) || null);
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

// ---------- The day's name for "recados" ----------
// Usually "recado"; on some days an easter egg (cutucada, berro…). Same for everyone, picked from the date.
const DEFAULT_TERM = { id: "recado", one: "recado", many: "recados", g: "m", verb: "Mandar", ask: "Mandar pra {who}?", done: "Mandado pra {n} pessoa(s). 📣" };
const PREVIEW_TERM = new URLSearchParams(location.search).get("termo");
let TERM = DEFAULT_TERM;

function pickTerm() {
  const terms = (FUN.terms && typeof FUN.terms === "object") ? FUN.terms : {};
  const valid = Object.entries(terms).filter(([, t]) => t && t.one && t.many && t.verb && (Number(t.weight) || 0) > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));
  if (PREVIEW_TERM && terms[PREVIEW_TERM]) return { ...DEFAULT_TERM, ...terms[PREVIEW_TERM], id: PREVIEW_TERM };
  if (!valid.length) return DEFAULT_TERM;
  const key = spToday().key + "|term";
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const total = valid.reduce((n, [, t]) => n + Number(t.weight), 0);
  let r = (h % 100000) / 100000 * total;
  for (const [id, t] of valid) { r -= Number(t.weight); if (r < 0) return { ...DEFAULT_TERM, ...t, id }; }
  return { ...DEFAULT_TERM, ...valid[0][1], id: valid[0][0] };
}

// Grammar helpers: T.one "recado", T.Many "Recados", T.novo "Novo"/"Nova", T.esse "esse"/"essa"…
const cap = (x) => String(x).charAt(0).toUpperCase() + String(x).slice(1);
const T = {
  get one() { return TERM.one; }, get many() { return TERM.many; },
  get One() { return cap(TERM.one); }, get Many() { return cap(TERM.many); },
  get f() { return TERM.g === "f"; },
  get novo() { return T.f ? "Nova" : "Novo"; }, get nenhum() { return T.f ? "Nenhuma" : "Nenhum"; },
  get esse() { return T.f ? "essa" : "esse"; }, get seus() { return T.f ? "suas" : "seus"; },
  get Seus() { return T.f ? "Suas" : "Seus"; }, get o() { return T.f ? "a" : "o"; },
  get verb() { return TERM.verb; },
  ask: (who) => String(TERM.ask || DEFAULT_TERM.ask).replace("{who}", who),
  done: (n) => String(TERM.done || DEFAULT_TERM.done).replace("{n}", n),
};

// Static texts in the page that use the word.
function applyTerms() {
  TERM = pickTerm();
  const set = (sel, text) => { const el = document.querySelector(sel); if (el) el.textContent = text; };
  set('.tab[data-tab="chamados"]', T.Many);
  set("#chamados-new .tile-title", `${T.novo} ${T.one}`);
  set("#stab-btn-muted", "Silenciados");
  if (typeof renderChamados === "function" && typeof auth !== "undefined" && auth.currentUser) renderChamados();
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

// Splits text into visible characters (emoji-safe). Older browsers without Intl.Segmenter
// fall back to a regex that keeps most emoji (incl. ZWJ sequences) together.
function graphemes(str) {
  try { return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(str)].map((x) => x.segment); }
  catch { return String(str).match(/(?:\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*|.)/gsu) || []; }
}

function parseDecor(spec) {
  const out = [];
  for (const token of String(spec || "").trim().split(/\s+/).filter(Boolean)) {
    if (/^[\w-]+\.svg$/i.test(token)) out.push({ svg: token });
    else for (const g of graphemes(token)) {
      if (g.trim()) out.push({ emoji: g });
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

// Effects: "confetti" (a burst on open), "snow" (gentle, falling), "bubbles" (fizz rising from below)
// or "smoke" (a coffee cup low in the middle of the screen, behind the feed, that now and then
// lets a soft wisp of steam rise and vanish).
// Occasions can force one for everyone; a theme can have its own, which each person can switch off.
// One list of names, used in the palette studio, the occasion editor and Configurações.
const EFFECTS = { smoke: "☕ Xícara fumegante", bubbles: "🫧 Bolhinhas subindo", snow: "❄️ Neve caindo", confetti: "🎉 Chuva de confete", sparkles: "✨ Brilhinhos" };
const SPARKLE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill="currentColor"/></svg>`;
function fillEffectSelect(sel) {
  const keep = sel.value;
  sel.innerHTML = `<option value="">Nenhum</option>`;
  for (const [k, label] of Object.entries(EFFECTS)) sel.add(new Option(label, k));
  sel.value = keep in EFFECTS ? keep : "";
}
// A plain cup on a saucer in the theme's drawing colors (coffee on Espresso, matcha on Matcha…).
const CUP_SVG = `<svg viewBox="0 0 140 100" aria-hidden="true">
<ellipse cx="70" cy="86" rx="62" ry="11" fill="var(--d-pale)" opacity=".55"/>
<ellipse cx="70" cy="83" rx="44" ry="6.5" fill="var(--d-pale)"/>
<path d="M106 46 q 22 -2 20 15 q -2 13 -22 13" fill="none" stroke="var(--d-pale)" stroke-width="7" stroke-linecap="round"/>
<path d="M30 36 Q30 79 70 81 Q110 79 110 36 Z" fill="var(--d-pale)"/>
<path d="M110 36 Q110 73 82 80 Q103 68 104 36 Z" fill="var(--d-dark)" opacity=".25"/>
<ellipse cx="70" cy="36" rx="40" ry="9" fill="var(--d-pale)"/>
<ellipse cx="70" cy="37" rx="35" ry="6.5" fill="var(--d-mid)"/>
<ellipse cx="70" cy="37" rx="35" ry="6.5" fill="var(--d-dark)" opacity=".55"/>
<ellipse cx="62" cy="36" rx="11" ry="2.2" fill="var(--d-light)" opacity=".6"/>
</svg>`;
// A little cloud of steam.
const PUFF_SVG = `<svg viewBox="0 0 60 40" aria-hidden="true"><path d="M15 36 a11 11 0 0 1 -1 -22 a13 13 0 0 1 24 -5 a11 11 0 0 1 15 10 a9 9 0 0 1 -3 17 z" fill="currentColor"/></svg>`;
function spawnEffect(layer, kind, scale = 1) {
  clearTimeout(layer._fxTimer);
  layer.innerHTML = "";
  layer.dataset.fx = kind || "";
  if (!(kind in EFFECTS)) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (kind === "smoke") {
    // The cup stays put; steam only now and then (never with reduced motion).
    const cup = document.createElement("div");
    cup.className = "steam-cup";
    cup.innerHTML = CUP_SVG;
    layer.appendChild(cup);
    if (still) return;
    const puff = () => {
      if (!cup.isConnected) return;
      // While the app is in the background animations are paused: don't pile up puffs that
      // would all float up at once when you come back.
      if (document.hidden || cup.querySelectorAll(".puff").length >= 3) {
        layer._fxTimer = setTimeout(puff, 2500 + Math.random() * 4500);
        return;
      }
      const n = Math.random() < 0.3 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const w = document.createElement("i");
        w.className = "puff";
        w.style.cssText = `left:${50 + (Math.random() * 24 - 12)}%;--dur:${(3.2 + Math.random() * 1.4).toFixed(2)}s;--wob:${Math.round(Math.random() * 28 - 14)}px;--peak:${(0.16 + Math.random() * 0.08).toFixed(2)};animation-delay:${k * 0.6}s`;
        w.innerHTML = PUFF_SVG;
        w.addEventListener("animationend", (e) => { if (e.target === w) w.remove(); });
        cup.appendChild(w);
      }
      layer._fxTimer = setTimeout(puff, 2500 + Math.random() * 4500);
    };
    layer._fxTimer = setTimeout(puff, 700);
    return;
  }
  if (still) return;
  const css = getComputedStyle(layer);
  const colors = ["--caramel", "--crema", "--fg", "--muted"].map((v) => css.getPropertyValue(v).trim()).filter(Boolean).concat(["#ff8fb1", "#7fc8f8", "#f5d76e"]);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const add = (cls, style, text) => {
    const s = document.createElement("i");
    s.className = cls;
    s.style.cssText = style;
    if (text) s.textContent = text;
    layer.appendChild(s);
    return s;
  };
  if (kind === "confetti") {
    // A big burst on open, then every few seconds a different shower: amount, speed and spread
    // all random (sometimes a sprinkle, sometimes a cluster on one side, now and then a big one).
    const burst = (count, speed, center, spread) => {
      for (let i = 0; i < count; i++) {
        const el = add("confetti", `left:${Math.min(99, Math.max(0, center + rnd(-spread, spread)))}%;background:${colors[Math.floor(Math.random() * colors.length)]};animation-delay:${rnd(0, 0.9)}s;animation-duration:${rnd(2.4, 4.2) * speed}s;--drift:${rnd(-60, 60) * scale}px;--spin:${rnd(-720, 720)}deg;width:${rnd(6, 10) * Math.max(scale, 0.6)}px;height:${rnd(8, 14) * Math.max(scale, 0.6)}px`);
        el.addEventListener("animationend", () => el.remove());
      }
    };
    burst(Math.round(70 * scale), 1, 50, 50);
    const again = () => {
      if (layer.dataset.fx !== "confetti") return;
      if (!document.hidden && layer.childElementCount < 100 * scale + 10) {
        const r = Math.random();
        const count = r < 0.5 ? rnd(8, 20) : r < 0.85 ? rnd(20, 40) : rnd(45, 80);
        const wide = Math.random() < 0.55;
        burst(Math.round(count * scale), rnd(0.7, 1.6), wide ? 50 : rnd(12, 88), wide ? 50 : rnd(10, 30));
      }
      layer._fxTimer = setTimeout(again, rnd(5, 13) * 1000);
    };
    layer._fxTimer = setTimeout(again, rnd(5, 9) * 1000);
  } else if (kind === "snow") {
    for (let i = 0; i < Math.round(26 * scale); i++) {
      add("snow", `left:${rnd(0, 100)}%;font-size:${rnd(8, 18) * Math.max(scale, 0.6)}px;opacity:${rnd(0.25, 0.6)};animation-delay:${rnd(-12, 0)}s;animation-duration:${rnd(8, 16) * Math.max(scale, 0.5)}s;--drift:${rnd(-40, 40) * scale}px`, "❄");
    }
  } else if (kind === "bubbles") {
    // Fizz: a few thin streams of tiny clear bubbles rising from fixed spots (speeding up and
    // growing as they climb), plus some bigger loose ones wobbling up.
    const streams = Math.max(2, Math.round(6 * scale));
    for (let k = 0; k < streams; k++) {
      const x = rnd(4, 96), dur = rnd(3.2, 5.5) * Math.max(scale, 0.6), per = Math.round(rnd(5, 8));
      for (let i = 0; i < per; i++) {
        const size = rnd(2.5, 5) * Math.max(scale, 0.7);
        add("fizz", `left:${x}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${(-dur * i) / per}s;--wob:${rnd(-3, 3)}px;opacity:${rnd(0.35, 0.6)}`);
      }
    }
    for (let i = 0; i < Math.round(9 * scale); i++) {
      const size = rnd(6, 13) * Math.max(scale, 0.6);
      add("bubble", `left:${rnd(0, 100)}%;width:${size}px;height:${size}px;opacity:${rnd(0.25, 0.5)};animation-delay:${rnd(-14, 0) * Math.max(scale, 0.5)}s;animation-duration:${rnd(7, 13) * Math.max(scale, 0.5)}s;--wob:${rnd(3, 9) * scale}px`);
    }
  }
  else if (kind === "sparkles") {
    // Little four-point stars twinkling in random spots; each one hops somewhere new after it fades.
    const tints = ["--crema", "--fg", "--caramel"].map((v) => css.getPropertyValue(v).trim()).filter(Boolean).concat(["#ffffff"]);
    for (let i = 0; i < Math.max(6, Math.round(26 * scale)); i++) {
      const el = add("sparkle", `animation-duration:${rnd(2.2, 3.6)}s;animation-delay:${-rnd(0, 3.6)}s`);
      el.innerHTML = SPARKLE_SVG;
      const move = () => {
        const size = rnd(9, 20) * Math.max(scale, 0.6);
        el.style.left = `${rnd(2, 95)}%`;
        el.style.top = `${rnd(3, 92)}%`;
        el.style.width = el.style.height = `${size}px`;
        el.style.color = tints[Math.floor(Math.random() * tints.length)];
      };
      move();
      el.addEventListener("animationiteration", move);
    }
  }
  layer.dataset.fx = kind;
}
let effectKey = null;
function runEffect(kind) {
  kind = kind || null;
  if (kind === effectKey) return;
  effectKey = kind;
  // The steaming cup lives behind the feed (like the drawings); the rest float above it.
  const behind = kind === "smoke";
  spawnEffect(document.getElementById("fx"), behind ? null : kind);
  spawnEffect(document.getElementById("fx-back"), behind ? kind : null);
}

// ---------- Phone only ----------
// Generous on purpose (real family phones must never be blocked): any Android/iPhone/iPod,
// anything that says "Mobile", and iPads (which pretend to be Macs but have a touch screen).
const IS_PHONE = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|Opera Mini|IEMobile/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
  (navigator.userAgentData && navigator.userAgentData.mobile === true);
if (!IS_PHONE) {
  $("desktop-url").textContent = location.origin + location.pathname;
  show("view-desktop");
  throw new Error("Phone only");
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
  deleteRound: call("deleteRound"),
  muteTemplate: call("muteTemplate"),
  sendOnce: call("sendOnce"),
  seenRound: call("seenRound"),
  adminHealth: call("adminHealth"),
  adminTest: call("adminTest"),
  adminReset: call("adminReset"),
  adminListUsers: call("adminListUsers"),
  adminCreateUser: call("adminCreateUser"),
  adminSetPassword: call("adminSetPassword"),
  adminDeleteUser: call("adminDeleteUser"),
  adminSetUserFlag: call("adminSetUserFlag"),
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
  finally { if (btn && btn.isConnected) busy(btn, false); }
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
      swReg.showNotification(n.title || "", {
        body: n.body, icon: "icons/icon-192.png",
        data: { url: payload.data && payload.data.url, logId: payload.data && payload.data.logId },
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
    }, { merge: true }); // merge: keep lastRecv written by the receipts
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
  subscribeAdminData(false);
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
    renderRounds(); // hidden rounds may have changed
    applyLook();
    renderSettings();
    renderMeChip();
    renderNameNudge();
    applyComfort();
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
      b.innerHTML = `<span class="dots">${dots}</span><span>${esc(p.name || id)}${EFFECTS[p.effect] ? ` <span class="fx-tag" title="Tem efeito: ${EFFECTS[p.effect]}">✨</span>` : ""}</span>`;
      b.onclick = async () => {
        try {
          await setDoc(doc(db, "users", auth.currentUser.uid), { palette: id, updatedAt: serverTimestamp() }, { merge: true });
          toast(forced ? "Salvo. Mas hoje o tema é obrigatório. 🙃" : `Tema ${p.name || id}. ☕`);
        } catch (err) { toast(friendlyError(err)); }
      };
      wrap.appendChild(b);
    });
  // The theme's effect switch only exists when your theme has an effect.
  const mine = getPalette(current);
  const fx = mine && !mine.onlyOccasions && EFFECTS[mine.effect];
  show("fx-row", !!fx);
  if (fx) {
    $("set-fx-label").textContent = `Efeito do tema: ${fx}`;
    $("set-fx").checked = !(me && me.fxOff === true);
  }
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
  // The "Silenciados" tab only exists while something is silenced.
  show("stab-btn-muted", mutes.length > 0);
  if (!mutes.length && !$("stab-muted").hidden) setSettingsTab("general");
  list.innerHTML = "";
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
    toast(quiet.on ? `Não perturbe das ${quiet.start} às ${quiet.end}. 🌙` : "Não perturbe desligado. Coragem.");
  } catch (err) { toast(friendlyError(err)); }
}
["quiet-on", "quiet-start", "quiet-end"].forEach((id) => $(id).addEventListener("change", saveQuiet));
$("set-big").addEventListener("change", (e) => saveComfort("bigText", e.target.checked));
$("set-fx").addEventListener("change", async (e) => {
  try {
    await setDoc(doc(db, "users", auth.currentUser.uid), { fxOff: !e.target.checked, updatedAt: serverTimestamp() }, { merge: true });
    toast(e.target.checked ? "Efeito ligado. ✨" : "Efeito desligado.");
  } catch (err) { e.target.checked = !e.target.checked; toast(friendlyError(err)); }
});

$("open-settings").addEventListener("click", () => openSettings("general"));
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
  return graphemes(str)[0] || "";
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

// One popup, two tabs: the gear opens "Configurações", the name chip opens "Seu nome".
function setSettingsTab(name) {
  document.querySelectorAll("[data-stab]").forEach((b) => b.classList.toggle("selected", b.dataset.stab === name));
  show("stab-general", name === "general");
  show("stab-name", name === "name");
  show("stab-muted", name === "muted");
  if (name === "name") {
    draftStyle = cleanStyle(me && me.style);
    renderStyleEditor();
    // First visit to the name tab: stop the "look here" glow for good.
    if (me && !me.seenStyle && auth.currentUser) {
      setDoc(doc(db, "users", auth.currentUser.uid), { seenStyle: true }, { merge: true }).catch(() => {});
    }
  }
}
function openSettings(tab) {
  setSettingsTab(tab);
  if (!$("dlg-settings").open) $("dlg-settings").showModal();
}
document.querySelectorAll("[data-stab]").forEach((b) => b.addEventListener("click", () => setSettingsTab(b.dataset.stab)));
$("me-chip").addEventListener("click", () => openSettings("name"));
$("style-cancel").addEventListener("click", () => $("dlg-settings").close());
$("muted-close").addEventListener("click", () => $("dlg-settings").close());

// "Letra grande": a class on <html>, remembered for the next launch.
function applyComfort() {
  const big = !!(me && me.bigText);
  document.documentElement.classList.toggle("big", big);
  document.documentElement.classList.remove("simple");
  try { localStorage.setItem("comfort", JSON.stringify({ big })); } catch {}
  if ($("set-big")) $("set-big").checked = big;
}
async function saveComfort(key, value) {
  try {
    await setDoc(doc(db, "users", auth.currentUser.uid), { [key]: value, updatedAt: serverTimestamp() }, { merge: true });
    toast(value ? "Letra grande ligada. 🔎" : "Letra normal.");
  } catch (err) { toast(friendlyError(err)); }
}

// Gentle glow on the name chip (and a dot on the tab) until the person has opened "Seu nome" once.
function renderNameNudge() {
  const nudge = !!(me && me.name && !me.seenStyle);
  $("me-chip").classList.toggle("nudge", nudge);
  show("name-dot", nudge);
}
$("style-save").addEventListener("click", async () => {
  const ok = await withBusy($("style-save"), async () => {
    await setDoc(doc(db, "users", auth.currentUser.uid), { style: draftStyle, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  }, "Salvando…");
  if (ok) toast("Lindo. Todo mundo vai ver. ✨");
});

// ---------- Chamados: buttons, live feed, editor ----------
// 🎲 in the editor fills one of these (content only; who/when stay as you set them).
const STARTERS = [
  { emoji: "🍝", title: "Vai ter almoço hoje?", body: "Responde logo que a gente precisa se organizar.", answerType: "options", options: ["Sim", "Não", "Só se alguém ajudar"] },
  { emoji: "🛒", title: "Precisa de algo do mercado?", body: "Tô indo. Fala agora ou cala pra sempre.", answerType: "text", options: [] },
  { emoji: "🛒", title: "Vai no mercado hoje?", body: "Sim ou não, sem enrolação.", answerType: "yesno", options: [] },
  { emoji: "🚗", title: "Tô indo no mercado, quem vai junto?", body: "Saindo daqui a pouco.", answerType: "options", options: ["Vou junto 🙋", "Não vou"] },
  { emoji: "🍕", title: "Bora pedir janta?", body: "", answerType: "yesno", options: [] },
  { emoji: "💊", title: "Tomou o remédio?", body: "Não me faz perguntar de novo.", answerType: "yesno", options: [] },
  { emoji: "🗑️", title: "Hoje é dia de lixo!", body: "Quem leva?", answerType: "options", options: ["Eu levo", "Já levei", "Hoje não dá"] },
  { emoji: "🏠", title: "Chegou bem?", body: "Só pra eu dormir tranquila.", answerType: "yesno", options: [] },
  { emoji: "☕", title: "Café?", body: "Tô passando um agora.", answerType: "options", options: ["Quero ☕", "Não, valeu"] },
  { emoji: "🎬", title: "Filme hoje à noite?", body: "Escolhe o horário.", answerType: "options", options: ["20h", "21h", "Hoje não"] },
];
const BLANK = { emoji: "", title: "", body: "", answerType: "yesno", options: [], recipients: "all", visibility: "all",
  nagEveryMin: 15, durationHours: 2, schedule: { on: false, slots: [], dates: [] }, allowMute: true, keep: true };

const g = (person, m, f) => ((person && person.gender) === "f" ? f : m);
const nameOf = (uid) => (family[uid] && family[uid].name) || "?";

// Deadline, both ways: "até 18:00" + "faltam 2 h 15 min" (urgent in the last hour).
function deadlineParts(ts) {
  if (!ts || !ts.toMillis) return null;
  const ms = ts.toMillis(), min = Math.round((ms - Date.now()) / 60000);
  const d = new Date(ms), hm = `${pad2s(d.getHours())}:${pad2s(d.getMinutes())}`;
  const same = (x, y) => x.toDateString() === y.toDateString();
  const abs = same(d, new Date()) ? `até ${hm}` : same(d, new Date(Date.now() + 86400000)) ? `até amanhã ${hm}`
    : `até ${DAY_SHORT[d.getDay()].toLowerCase()} ${pad2s(d.getDate())}/${pad2s(d.getMonth() + 1)} ${hm}`;
  const fal = (n, unit) => `${n === 1 ? "falta" : "faltam"} ${n} ${unit}`;
  let rel;
  if (min <= 0) rel = "fechando…";
  else if (min < 60) rel = fal(min, "min");
  else if (min < 6 * 60) { const h = Math.floor(min / 60), m = min % 60; rel = fal(h, "h") + (m ? ` ${m} min` : ""); }
  else if (min < 24 * 60) rel = fal(Math.round(min / 60), "h");
  else { const dd = Math.floor(min / 1440), h = Math.round((min % 1440) / 60); rel = dd === 1 ? `falta 1 dia${h ? ` e ${h} h` : ""}` : `faltam ${dd} dias`; }
  return { abs, rel, urgent: min < 60 };
}

// "fecha às 21:30" / "fecha amanhã às 09:00" / "fecha sex 14/11 às 09:00"
function closesText(ts) {
  if (!ts || !ts.toMillis) return "aberto";
  const d = new Date(ts.toMillis());
  const hm = `${pad2s(d.getHours())}:${pad2s(d.getMinutes())}`;
  const today = new Date(); const tomorrow = new Date(Date.now() + 86400000);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (d.getTime() <= Date.now()) return "fechando…";
  if (same(d, today)) return `fecha às ${hm}`;
  if (same(d, tomorrow)) return `fecha amanhã às ${hm}`;
  return `fecha ${DAY_SHORT[d.getDay()].toLowerCase()} ${pad2s(d.getDate())}/${pad2s(d.getMonth() + 1)} às ${hm}`;
}

// Creator's view: ONE icon per person with only the furthest step reached:
// enviado ✓ < chegou ✓✓ < viu 👁 < clicou 👆 (an answer replaces the icon). Tap = details.
function statusFor(r, u) {
  const d = (r.delivery && r.delivery[u]) || {};
  const seen = r.seen && r.seen[u];
  const t = (ms) => { const x = new Date(ms); return `${pad2s(x.getHours())}:${pad2s(x.getMinutes())}`; };
  const steps = [];
  if (d.at && d.st === "sent") steps.push(`enviado ${t(d.at)}`);
  if (d.recv) steps.push(`chegou ${t(d.recv)}`);
  if (seen) steps.push(`viu no app ${t(seen)}`);
  if (d.open) steps.push(`clicou na notificação ${t(d.open)}`);
  const detail = steps.join(" · ");
  if (d.st === "failed") return { icon: "⚠", cls: "bad", detail: "A notificação não chegou nesse celular." + (seen ? ` Mas viu no app ${t(seen)}.` : "") };
  if (d.st === "nodevice") return { icon: "⚠", cls: "bad", detail: "Não tem celular com notificação ativada." + (seen ? ` Mas viu no app ${t(seen)}.` : "") };
  if (d.st === "quiet" && !seen) return { icon: "🌙", cls: "", detail: "Em horário de silêncio. Vai receber depois." };
  if (d.open) return { icon: "👆", cls: "good", detail };
  if (seen) return { icon: "👁", cls: "good", detail };
  if (d.recv) return { icon: "✓✓", cls: "good", detail };
  if (d.st === "sent") return { icon: "✓", cls: "", detail };
  return { icon: "", cls: "", detail: "" }; // older rounds without tracking
}
function statusHtml(r, u) {
  const st = statusFor(r, u);
  if (!st.icon) return "";
  return `<button class="st ${st.cls}" data-detail="${esc(st.detail)}" aria-label="${esc(st.detail)}">${st.icon}</button>`;
}

// Stamp "visto" on rounds I'm asked in, once they're on screen.
const seenSent = new Set();
function markSeen(list) {
  if (document.visibilityState !== "visible" || $("tab-feed").hidden || !auth.currentUser) return;
  const uid = auth.currentUser.uid;
  for (const r of list) {
    if (!r.open || !r.recipients.includes(uid) || (r.seen && r.seen[uid]) || seenSent.has(r.id)) continue;
    seenSent.add(r.id);
    api.seenRound({ roundId: r.id }).catch((e) => console.warn("seen", e)); // server stamps it and logs "visualizou"
  }
}

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
  const self = typeof auth !== "undefined" && auth.currentUser && auth.currentUser.uid;
  const names = (r || []).map((u) => (u === self ? "você" : nameOf(u)));
  return names.length ? names.join(", ") : "ninguém";
}
// Schedule = { on, slots: [{ d: 0-6, t: "HH:MM" }] (every week), dates: ["YYYY-MM-DD HH:MM"] (once each) }.
// Older recados have { days: [], time } — read as slots.
function scheduleSlots(s) {
  if (!s) return [];
  if (Array.isArray(s.slots)) return s.slots;
  return Array.isArray(s.days) && s.time ? s.days.map((d) => ({ d, t: s.time })) : [];
}
const dateKeyOf = (d) => `${d.getFullYear()}-${pad2s(d.getMonth() + 1)}-${pad2s(d.getDate())}`;
const parseWhen = (str) => { const [ymd, hm] = str.split(" "); const [y, m, d] = ymd.split("-").map(Number); const [h, mi] = hm.split(":").map(Number); return new Date(y, m - 1, d, h, mi); };
function whenLabel(date) {
  const hm = `${pad2s(date.getHours())}:${pad2s(date.getMinutes())}`;
  const today = new Date(), tom = new Date(Date.now() + 86400000);
  if (date.toDateString() === today.toDateString()) return `hoje ${hm}`;
  if (date.toDateString() === tom.toDateString()) return `amanhã ${hm}`;
  return `${DAY_SHORT[date.getDay()].toLowerCase()} ${pad2s(date.getDate())}/${pad2s(date.getMonth() + 1)} ${hm}`;
}
function nextFire(s) {
  if (!s || !s.on) return null;
  const now = Date.now();
  let best = null;
  for (const x of s.dates || []) { const t = parseWhen(x); if (t.getTime() > now - 60000 && (!best || t < best)) best = t; }
  const slots = scheduleSlots(s);
  for (let k = 0; k < 8 && slots.length; k++) {
    const day = new Date(); day.setDate(day.getDate() + k);
    for (const sl of slots) {
      if (sl.d !== day.getDay()) continue;
      const [h, m] = sl.t.split(":").map(Number);
      const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
      if (t.getTime() > now && (!best || t < best)) best = t;
    }
  }
  return best;
}
// "seg, qua 08:00 · sáb 10:00, 18:00 · 📅 sex 14/11 09:00 +2"
function scheduleText(s) {
  const slots = scheduleSlots(s), dates = (s && s.dates) || [];
  if (!s || !s.on || (!slots.length && !dates.length)) return "Botão";
  const parts = [];
  if (slots.length) {
    const byDay = {};
    for (const x of slots) (byDay[x.d] ||= []).push(x.t);
    const groups = {};
    for (const [d, ts] of Object.entries(byDay)) { const k = ts.sort().join(", "); (groups[k] ||= []).push(Number(d)); }
    for (const [ts, ds] of Object.entries(groups)) {
      const dd = ds.length === 7 ? "todo dia" : ds.sort().map((i) => DAY_SHORT[i].toLowerCase()).join(", ");
      parts.push(`${dd} ${ts}`);
    }
  }
  if (dates.length) {
    const sorted = [...dates].sort();
    parts.push(`📅 ${whenLabel(parseWhen(sorted[0]))}${sorted.length > 1 ? ` +${sorted.length - 1}` : ""}`);
  }
  return `⏰ ${parts.join(" · ")}`;
}

// Generic confirm popup → Promise<boolean>
function confirmBox(title, body, yes = "Mandar") {
  // Came from a tap on a visible button (in the popup on top, if any)? Ask right there.
  const a = lastTap;
  const top = [...document.querySelectorAll("dialog[open]")].pop();
  if (a && a.isConnected && Date.now() - lastTapAt < 2000 && a.getClientRects().length && (!top || top.contains(a))) {
    return confirmPop(a, title, body, yes);
  }
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
  list.innerHTML = templates.length ? "" : `<li class="muted empty">${T.nenhum} ${T.one} ainda. Cria um${T.f ? "a" : ""}! ✨</li>`;
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
          ${scheduled && nextFire(t.schedule) ? `<span class="next-fire small">próximo: ${esc(whenLabel(nextFire(t.schedule)))}${t.keep === false ? " · some depois" : ""}</span>` : ""}
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
    send.textContent = scheduled ? `${T.verb} agora` : T.verb;
    send.onclick = () => fire(t, send);
    actions.appendChild(send);
    list.appendChild(li);
  }
}
$("chamados-new").addEventListener("click", () => openEditor(null));
$("fab").addEventListener("click", () => openEditor(null, { quick: true }));

// Tabs (remembered per browser, just a convenience)
// Admin-only live data: notification log and everyone's phones.
let logEntries = [];
let logFilter = "all";
let adminDevices = {}; // uid -> [{ id, ua, lastRecv, updatedAt }]
let adminUnsubs = [];
function subscribeAdminData(on) {
  adminUnsubs.forEach((u) => u());
  adminUnsubs = [];
  if (!on) return;
  adminUnsubs.push(onSnapshot(query(collection(db, "notifLog"), orderBy("at", "desc"), limit(250)), (snap) => {
    logEntries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAdminLog();
  }, (err) => console.warn("notifLog", err)));
  adminUnsubs.push(onSnapshot(collection(db, "devices"), (snap) => {
    adminDevices = {};
    snap.docs.forEach((d) => (adminDevices[d.get("uid")] ||= []).push({ id: d.id, ...d.data() }));
    renderAdminPeople();
  }, (err) => console.warn("devices", err)));
}

function setAdminVisible(on) {
  if (on !== !!adminUnsubs.length) subscribeAdminData(on);
  show("tab-btn-admin", on);
  document.querySelector(".tabs").classList.toggle("three", on);
  if (!on && document.querySelector('.tab[data-tab="admin"].selected')) setTab("feed");
  if (on && restoreAdminTab) { restoreAdminTab = false; setTab("admin"); }
  if (on) renderAdmin();
}

function setTab(name) {
  document.querySelectorAll(".tab[data-tab]").forEach((b) => {
    const on = b.dataset.tab === name;
    b.classList.toggle("selected", on);
    b.setAttribute("aria-selected", on);
  });
  show("tab-feed", name === "feed");
  show("tab-chamados", name === "chamados");
  show("tab-admin", name === "admin");
  if (name === "admin") { renderAdmin(); if (authUsers === null) loadAuthUsers(); }
  if (!restoreAdminTab) { try { localStorage.setItem("tab", name); } catch {} }
}
document.querySelectorAll(".tab[data-tab]").forEach((b) => b.addEventListener("click", () => { restoreAdminTab = false; setTab(b.dataset.tab); }));
// The Admin tab can only be restored once we know the person is an admin (see setAdminVisible).
const savedTab = (() => { try { return localStorage.getItem("tab") || "feed"; } catch { return "feed"; } })();
let restoreAdminTab = savedTab === "admin";
setTab(savedTab === "admin" ? "feed" : savedTab);

async function fire(t, btn) {
  const who = t.recipients === "all" ? "todo mundo" : recipientsText(t.recipients);
  const hrs = Number(t.durationHours) || 12;
  const dur = hrs % 24 === 0 ? `${hrs / 24} dia${hrs > 24 ? "s" : ""}` : `${hrs} hora${hrs > 1 ? "s" : ""}`;
  if (!(await confirmBox(`${t.emoji || "🔔"} ${t.title}`, `${T.ask(who)} Fica aberto por ${dur}.`, T.verb))) return;
  const res = await withBusy(btn, () => api.fireTemplate({ templateId: t.id }));
  if (!res) return;
  const d = res.data;
  toast(d.delayed ? `${T.done(d.recipients)} ${d.delayed} em modo silêncio recebe(m) depois. 🌙` : T.done(d.recipients), 4000);
}

// Home: live feed of rounds, in three groups from MY point of view:
//  "Pra você"       — waiting for my answer (big buttons, on top)
//  "Em andamento"   — I answered or sent it, someone's still missing; avisos still open
//  "Resolvidos"     — everyone answered, or it's closed. One line each; today's shown, older behind a tap.
// A question with a deadline stays until the deadline / the sender closes it; "resolvido" only moves it down.
const allAnswered = (r) => r.answerType !== "none" && r.recipients.length > 0 && r.recipients.every((u) => r.answers && r.answers[u]);
const isDone = (r) => !r.open || allAnswered(r);
let showOlderDone = false;
function renderRounds() {
  const list = $("rounds");
  if (!list || !auth.currentUser) return;
  if (list.querySelector(".busy")) return;
  const uid = auth.currentUser.uid;
  const dayAgo = Date.now() - 24 * 3600000;
  const hidden = (me && me.hidden) || {};
  const visible = rounds.filter((r) => !hidden[r.id] && (r.open || (r.createdAt && r.createdAt.toMillis() > dayAgo)));
  const waitingForMe = (r) => r.open && r.answerType !== "none" && r.recipients.includes(uid) && !(r.answers && r.answers[uid]);
  const mineToAnswer = visible.filter(waitingForMe);
  const going = visible.filter((r) => !waitingForMe(r) && !isDone(r));
  const done = visible.filter((r) => !waitingForMe(r) && isDone(r));
  const today = new Date().toDateString();
  const isToday = (r) => r.createdAt && new Date(r.createdAt.toMillis()).toDateString() === today;
  const doneToday = done.filter(isToday), doneOlder = done.filter((r) => !isToday(r));
  list.innerHTML = "";
  show("rounds-empty", roundsLoaded && visible.length === 0);

  const head = (txt) => list.insertAdjacentHTML("beforeend", `<li class="feed-head">${txt}</li>`);
  const groups = [mineToAnswer.length, going.length, done.length].filter(Boolean).length;
  if (mineToAnswer.length) { head("Pra você"); mineToAnswer.forEach((r) => list.appendChild(buildRound(r, true))); }
  if (going.length) { if (groups > 1) head("Em andamento"); going.forEach((r) => list.appendChild(buildRound(r, false))); }
  if (done.length) {
    head(`Resolvidos <span class="feed-count">${done.length}</span>`);
    doneToday.forEach((r) => list.appendChild(buildRound(r, false)));
    if (doneOlder.length) {
      if (showOlderDone) doneOlder.forEach((r) => list.appendChild(buildRound(r, false)));
      const li = document.createElement("li");
      li.className = "feed-more";
      li.innerHTML = `<button type="button" class="link">${showOlderDone ? "Esconder os de ontem" : `Ver os de ontem (${doneOlder.length})`}</button>`;
      li.querySelector("button").onclick = () => { showOlderDone = !showOlderDone; renderRounds(); };
      list.appendChild(li);
    }
  }

  markSeen(visible);
  if (highlightRound) {
    const el = list.querySelector(".highlight");
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); highlightRound = null; }
  }
}

const editingAnswer = new Set(); // rounds where I tapped "mudar" (this session only)
function buildRound(r, ask) {
  const uid = auth.currentUser.uid;
  const li = document.createElement("li");
  const done = isDone(r);
  const collapsed = done && !expandedRounds.has(r.id) && r.id !== highlightRound;
  li.className = "round" + (ask ? " ask" : "") + (done ? " closed" : "") + (collapsed ? " collapsed" : "") + (r.id === highlightRound ? " highlight" : "");
  const mine = r.ownerUid === uid;
  const isRecipient = r.recipients.includes(uid);
  const myAnswer = r.answers && r.answers[uid];
  const canSeeAll = mine || r.visibility === "all";
  const nameOfR = (u) => (u === uid ? "Você" : nameHtml(u, r.recipientNames && r.recipientNames[u]));
  const changedHtml = (a) => (a.changes ? ` <span class="changed">(mudou ${a.changes}x)</span>` : "");

  // Answers. Who's still missing only matters to the sender (with one status icon each);
  // everyone else just sees answers as they arrive. My own answer has its own line below.
  let peopleHtml = "";
  if (r.answerType !== "none" || mine) {
    const rows = r.recipients.filter((u) => (canSeeAll || u === uid) && !(u === uid && myAnswer && isRecipient)).map((u) => {
      const a = r.answers && r.answers[u];
      if (a) return `<li>${nameOfR(u)} <b>${esc(a.value)}</b>${changedHtml(a)}</li>`;
      if (!mine) return "";
      const st = statusHtml(r, u);
      if (r.answerType === "none") return `<li>${nameOfR(u)} ${st}</li>`;
      return `<li class="waiting">${nameOfR(u)} ${st || `<span class="dots">…</span>`}</li>`;
    }).filter(Boolean);
    if (rows.length && !(ask && !mine)) peopleHtml = `<ul class="answers">${rows.join("")}</ul>`;
    if (!canSeeAll && r.answerType !== "none" && !ask) peopleHtml += `<div class="muted small">Só ${esc(r.ownerName)} vê as respostas.</div>`;
  }

  // Resolved rounds collapse to one line: who answered what.
  let doneSummary = "";
  if (done) {
    const answered = Object.entries(r.answers || {});
    if (r.answerType === "none") doneSummary = "aviso";
    else if (!canSeeAll) doneSummary = myAnswer ? `você: ${myAnswer.value}` : "sem resposta sua";
    else doneSummary = answered.map(([u, a]) => `${u === uid ? "você" : (family[u] && family[u].name) || a.name}: ${a.value}`).join(" · ") || "ninguém respondeu";
  }

  // Footer: who sent it on the left, the time left on the right (exact time on long-press/hover).
  const who = mine ? "Você" : `de ${nameHtml(r.ownerUid, r.ownerName)}`;
  const dl = r.open ? deadlineParts(r.closesAt) : null;
  const when = !r.open ? `<span class="deadline">encerrado</span>`
    : dl ? `<span class="deadline${dl.urgent ? " urgent" : ""}" title="${esc(dl.abs)}">⏳ ${esc(dl.rel)}</span>` : "";

  li.innerHTML = `
    <div class="round-head"><span class="round-emoji">${esc(r.emoji || "🔔")}</span>
      <div class="round-text"><div class="round-title">${esc(r.title)}</div>
      ${r.body ? `<p class="round-body">${esc(r.body)}</p>` : ""}
      ${done ? `<div class="closed-summary small">${collapsed ? esc(doneSummary) + " " : ""}<span class="chev">${collapsed ? "▾" : "▴ recolher"}</span></div>` : ""}</div>
      <div class="round-corner"></div></div>
    ${peopleHtml}
    <div class="my-answer"></div>
    <div class="actions"></div>
    <div class="round-meta small"><span class="who">${who}</span>${when}</div>`;
  const actions = li.querySelector(".actions");

  // Status icons: tap for the details.
  li.querySelectorAll(".st").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); toast(b.dataset.detail || "Sem detalhes.", 4500); }));

  if (done) {
    // Tap the header of a resolved round to expand / collapse it.
    li.querySelector(".round-head").addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      expandedRounds.has(r.id) ? expandedRounds.delete(r.id) : expandedRounds.add(r.id);
      if (highlightRound === r.id) highlightRound = null;
      renderRounds();
    });
  }

  // My answer: a quiet line ("✓ Você: Eu não · mudar"); the buttons only come back to change it.
  const canAnswer = isRecipient && r.open && r.answerType !== "none";
  if (isRecipient && myAnswer && r.answerType !== "none" && !editingAnswer.has(r.id)) {
    const box = li.querySelector(".my-answer");
    box.innerHTML = `<span>✓ Você: <b>${esc(myAnswer.value)}</b>${changedHtml(myAnswer)}</span>`;
    if (canAnswer) {
      const ch = document.createElement("button");
      ch.type = "button";
      ch.className = "link";
      ch.textContent = "mudar";
      ch.onclick = (e) => {
        e.stopPropagation();
        if (r.answerType === "text") return openTextAnswer(r);
        editingAnswer.add(r.id);
        renderRounds();
      };
      box.appendChild(ch);
    }
  } else if (canAnswer) {
    if (r.answerType === "text") {
      const b = document.createElement("button");
      b.className = "primary";
      b.textContent = "Responder";
      b.onclick = () => openTextAnswer(r);
      actions.appendChild(b);
    } else {
      for (const opt of r.options) {
        const b = document.createElement("button");
        const selected = myAnswer && myAnswer.value === opt;
        b.className = "secondary" + (selected ? " chosen" : "");
        b.textContent = selected ? `✓ ${opt}` : opt;
        b.onclick = async () => {
          if (selected) { editingAnswer.delete(r.id); return renderRounds(); }
          editingAnswer.delete(r.id);
          await answer(r, opt, b);
        };
        actions.appendChild(b);
      }
    }
  }

  // Secondary actions live in a small "⋯" popover next to the button; risky ones ask right there.
  const menu = [];
  if (mine && r.open && r.answerType !== "none") {
    menu.push({ label: "🔒 Encerrar", ask: "Ninguém mais responde e para de insistir.", yes: "Encerrar", run: async () => {
      const res = await withBusy(null, () => api.closeRound({ roundId: r.id }));
      if (res) toast("Encerrado. 🔒");
    } });
  }
  if (done || r.answerType === "none") {
    if (mine) {
      menu.push({ label: "🗑️ Apagar pra todo mundo", danger: true, ask: "Some do feed de todo mundo.", yes: "Apagar", run: async () => {
        const res = await withBusy(null, () => api.deleteRound({ roundId: r.id }));
        if (res) toast("Apagado. 🧹");
      } });
    } else {
      menu.push({ label: "🙈 Ocultar do meu feed", run: async () => {
        try {
          await setDoc(doc(db, "users", auth.currentUser.uid), { hidden: { [r.id]: true }, updatedAt: serverTimestamp() }, { merge: true });
          toast("Ocultado do seu feed. 🙈");
        } catch (err) { toast(friendlyError(err)); }
      } });
    }
  }
  if (isRecipient && r.templateId && r.allowMute !== false && !(me && me.mutes && me.mutes[r.templateId])) {
    menu.push({ label: `🔕 Silenciar ${T.esse} ${T.one}`, ask: `Você para de receber “${r.title}”. ${r.ownerName} vai ficar sabendo. 😬`, yes: "Silenciar", run: async () => {
      const res = await withBusy(null, () => api.muteTemplate({ roundId: r.id, mute: true }));
      if (res) toast("Silenciado. Dá pra reativar nas configurações. 🔕");
    } });
  }
  if (menu.length) {
    const b = document.createElement("button");
    b.className = "more";
    b.setAttribute("aria-label", "Mais opções");
    b.setAttribute("aria-haspopup", "menu");
    b.textContent = "⋯";
    b.onclick = (e) => { e.stopPropagation(); openPopMenu(b, menu); };
    li.querySelector(".round-corner").appendChild(b);
  }
  return li;
}

// Small popover anchored to a button (inside the open popup if there is one, so it shows on top).
// Closes on outside tap, scroll, Esc — closing without choosing counts as "cancel".
let popMenu = null;
function closePopMenu(result) {
  if (!popMenu) return;
  const p = popMenu;
  popMenu = null;
  p.el.remove();
  p.anchor.setAttribute("aria-expanded", "false");
  if (p.onClose) p.onClose(result);
}
function openPop(anchor, build, onClose) {
  const again = popMenu && popMenu.anchor === anchor;
  closePopMenu();
  if (again) { if (onClose) onClose(); return; }
  const el = document.createElement("div");
  el.className = "pop-menu";
  const place = () => {
    const a = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.max(8, Math.min(a.right - w, innerWidth - w - 8));
    const below = a.bottom + 6 + h < innerHeight - 8;
    el.style.left = `${left}px`;
    el.style.top = `${below ? a.bottom + 6 : Math.max(8, a.top - 6 - h)}px`;
  };
  (anchor.closest("dialog[open]") || document.body).appendChild(el);
  anchor.setAttribute("aria-expanded", "true");
  popMenu = { el, anchor, onClose };
  build(el, place);
  place();
  el.querySelector("button")?.focus({ preventScroll: true });
}
function openPopMenu(anchor, items) {
  openPop(anchor, (el, place) => {
    el.setAttribute("role", "menu");
    const list = () => {
      el.innerHTML = "";
      for (const it of items) {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("role", "menuitem");
        b.className = it.danger ? "danger-text" : "";
        b.textContent = it.label;
        b.onclick = () => (it.ask ? confirmStep(it) : (closePopMenu(), it.run()));
        el.appendChild(b);
      }
    };
    const confirmStep = (it) => {
      el.innerHTML = `<p class="pop-ask"></p><div class="pop-row"><button type="button" class="secondary">Cancelar</button><button type="button" class="${it.danger ? "danger" : "primary"}"></button></div>`;
      el.querySelector(".pop-ask").textContent = it.ask;
      const [no, yes] = el.querySelectorAll(".pop-row button");
      yes.textContent = it.yes;
      no.onclick = () => { list(); place(); };
      yes.onclick = () => { closePopMenu(); it.run(); };
      place();
      yes.focus();
    };
    list();
  });
}
// "Are you sure?" right next to the button you tapped → Promise<boolean>
function confirmPop(anchor, title, body, yes) {
  return new Promise((resolve) => {
    openPop(anchor, (el) => {
      el.setAttribute("role", "alertdialog");
      el.classList.add("pop-confirm");
      const risky = /^(Apagar|Remover|Sair|Substituir|Tirar)/.test(yes) || /^(Apagar|Remover|Tirar)/.test(title);
      el.innerHTML = `<p class="pop-title"></p><p class="pop-ask"></p><div class="pop-row"><button type="button" class="secondary">Cancelar</button><button type="button" class="${risky ? "danger" : "primary"}"></button></div>`;
      el.querySelector(".pop-title").textContent = title;
      el.querySelector(".pop-ask").textContent = body;
      el.querySelector(".pop-ask").hidden = !body;
      const [no, ok] = el.querySelectorAll(".pop-row button");
      ok.textContent = yes;
      no.onclick = () => closePopMenu(false);
      ok.onclick = () => closePopMenu(true);
    }, (result) => resolve(result === true));
    setTimeout(() => popMenu && popMenu.el.querySelector(".pop-row button:last-child")?.focus(), 0);
  });
}
let lastTap = null, lastTapAt = 0;
document.addEventListener("pointerdown", (e) => {
  if (popMenu && !popMenu.el.contains(e.target) && e.target !== popMenu.anchor && !popMenu.anchor.contains(e.target)) closePopMenu();
  lastTap = e.target.closest && e.target.closest("button, .chip, [role=button]");
  lastTapAt = Date.now();
}, true);
addEventListener("scroll", (e) => { if (popMenu && !popMenu.el.contains(e.target)) closePopMenu(); }, true);
addEventListener("resize", () => closePopMenu());
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && popMenu) { e.preventDefault(); closePopMenu(); } }, true);

// Every popup closes when you tap outside it (unless it can't be closed, like the first-time ones).
document.querySelectorAll("dialog").forEach((d) => {
  let downOutside = false;
  const outside = (e) => {
    if (e.target !== d) return false;
    const r = d.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  d.addEventListener("pointerdown", (e) => { downOutside = outside(e); });
  d.addEventListener("click", (e) => {
    if (!downOutside || !outside(e)) return;
    downOutside = false;
    const ev = new Event("cancel", { cancelable: true });
    d.dispatchEvent(ev);
    if (!ev.defaultPrevented && d.open) d.close();
  });
});
setInterval(renderRounds, 60000);

async function answer(r, value, btn) {
  const res = await withBusy(btn, () => api.answerRound({ roundId: r.id, value }), "…");
  if (!res) return;
  toast(res.data.changes ? `Mudou de ideia (${res.data.changes}ª vez). Todo mundo vai saber. 🌀` : "Respondido! ✓");
  renderRounds();
}

let textRound = null;
const expandedRounds = new Set(); // closed rounds the user opened (this session only)
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
    syncEditor();
  });
}

function syncEditorVisibility() { syncEditor(); }

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
  mk("Eu", uid); // send only to yourself (a reminder, a test) — or add yourself to a list
  Object.entries(family).filter(([u, p]) => u !== uid && p.name)
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .forEach(([u, p]) => mk(p.name, u));
}

// ---- Agendar: every week (same time for all days, or per day) + one-off dates ----
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // seg → dom
function timeChips(list, onChange) {
  const row = document.createElement("div");
  row.className = "time-row";
  for (const t of [...list].sort()) {
    const c = document.createElement("span");
    c.className = "chip selected time-chip";
    c.innerHTML = `${t} <button type="button" aria-label="Tirar ${t}">✕</button>`;
    c.querySelector("button").onclick = () => onChange(list.filter((x) => x !== t));
    row.appendChild(c);
  }
  const add = document.createElement("select");
  add.className = "add-time";
  add.setAttribute("aria-label", "Adicionar horário");
  add.innerHTML = `<option value="">＋ horário</option>` + TIMES_15.filter((t) => !list.includes(t)).map((t) => `<option>${t}</option>`).join("");
  add.onchange = () => { if (add.value) onChange([...list, add.value]); };
  row.appendChild(add);
  return row;
}
function renderSchedule() {
  // Day pills
  const days = $("ed-days");
  days.innerHTML = "";
  for (const i of WEEK_ORDER) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "day-pill" + (ed.days.has(i) ? " on" : "");
    b.textContent = DAY_SHORT[i].slice(0, 1);
    b.title = DAY_SHORT[i];
    b.setAttribute("aria-label", DAY_SHORT[i]);
    b.setAttribute("aria-pressed", String(ed.days.has(i)));
    b.onclick = () => {
      if (ed.days.has(i)) ed.days.delete(i);
      else { ed.days.add(i); if (!ed.dayTimes[i] || !ed.dayTimes[i].length) ed.dayTimes[i] = [...(ed.times.length ? ed.times : ["08:00"])]; }
      renderSchedule(); syncEditor();
    };
    days.appendChild(b);
  }
  $("ed-perday").textContent = ed.perDay ? "mesmo horário pra todos" : "horário por dia";
  show("ed-perday", ed.days.size > 1 || ed.perDay);
  const box = $("ed-slot-times");
  box.innerHTML = "";
  if (!ed.days.size) {
    box.innerHTML = `<p class="muted small sched-empty">Escolhe os dias pra repetir toda semana.</p>`;
  } else if (!ed.perDay) {
    box.appendChild(timeChips(ed.times, (l) => { ed.times = l; renderSchedule(); syncEditor(); }));
  } else {
    for (const i of WEEK_ORDER.filter((d) => ed.days.has(d))) {
      const line = document.createElement("div");
      line.className = "day-line";
      line.innerHTML = `<span class="day-name">${DAY_SHORT[i]}</span>`;
      line.appendChild(timeChips(ed.dayTimes[i] || [], (l) => { ed.dayTimes[i] = l; renderSchedule(); syncEditor(); }));
      box.appendChild(line);
    }
  }
  // Dates
  const dl = $("ed-dates");
  dl.innerHTML = "";
  for (const x of [...ed.dates].sort()) {
    const c = document.createElement("span");
    c.className = "chip selected time-chip";
    c.innerHTML = `${esc(whenLabel(parseWhen(x)))} <button type="button" aria-label="Tirar">✕</button>`;
    c.querySelector("button").onclick = () => { ed.dates = ed.dates.filter((y) => y !== x); renderSchedule(); syncEditor(); };
    dl.appendChild(c);
  }
  const q = $("ed-date-quick");
  q.innerHTML = "";
  const now = new Date();
  const inHour = new Date(Math.ceil((now.getTime() + 3600000) / 900000) * 900000);
  const at = (dayOffset, h) => { const d = new Date(); d.setDate(d.getDate() + dayOffset); d.setHours(h, 0, 0, 0); return d; };
  const picks = [["daqui 1 h", inHour], ["hoje 18:00", at(0, 18)], ["hoje 20:00", at(0, 20)], ["amanhã 08:00", at(1, 8)]]
    .filter(([, d]) => d.getTime() > now.getTime() + 5 * 60000);
  for (const [label, d] of picks) {
    const key = `${dateKeyOf(d)} ${pad2s(d.getHours())}:${pad2s(d.getMinutes())}`;
    if (ed.dates.includes(key)) continue;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = `＋ ${label}`;
    b.onclick = () => { ed.dates.push(key); renderSchedule(); syncEditor(); };
    q.appendChild(b);
  }
}
$("ed-perday").addEventListener("click", () => {
  if (ed.perDay) {
    const first = WEEK_ORDER.find((d) => ed.days.has(d));
    ed.times = [...((first !== undefined && ed.dayTimes[first]) || ed.times)];
  } else {
    for (const d of ed.days) ed.dayTimes[d] = [...ed.times];
  }
  ed.perDay = !ed.perDay;
  renderSchedule();
  syncEditor();
});
$("ed-date-add").addEventListener("click", () => {
  const day = $("ed-date-day").value, t = $("ed-date-time").value;
  if (!day || !t) return toast("Escolhe o dia e o horário.");
  const key = `${day} ${t}`;
  if (parseWhen(key).getTime() <= Date.now()) return toast("Essa data já passou. ⏳");
  if (!ed.dates.includes(key)) ed.dates.push(key);
  renderSchedule();
  syncEditor();
});
function edSlots() {
  const out = [];
  for (const d of ed.days) for (const t of (ed.perDay ? ed.dayTimes[d] || [] : ed.times)) out.push({ d, t });
  return out;
}

// Everything that depends on other choices: what shows, what's forced, the button text.
function syncEditor() {
  const type = segValue("ed-type");
  show("ed-options", type === "options");
  show("ed-answer-opts", type !== "none");
  let when = segValue("ed-when");
  const keepBox = $("ed-keep");
  // "Só no botão" only makes sense for something you keep.
  show("ed-when-button", keepBox.checked || !!edId);
  if (when === "button" && !keepBox.checked && !edId) { when = "now"; segSelect("ed-when", "now"); }
  show("ed-schedule", when === "schedule");
  const weekly = when === "schedule" && edSlots().length > 0;
  // Repeating every week always stays saved.
  keepBox.disabled = weekly;
  if (weekly) keepBox.checked = true;
  show("ed-keep-wrap", !edId || ed.keep === false);
  const hint = weekly ? "Repetir toda semana fica salvo nos recados."
    : when === "schedule" && !keepBox.checked ? "Some dos recados depois da última data." : "";
  $("ed-keep-hint").textContent = hint;
  show("ed-keep-hint", !!hint);
  // Mute only matters for something that comes back.
  show("ed-mute-wrap", keepBox.checked || weekly);
  // Summary of the folded options
  const nag = Number($("ed-nag").value), dur = Number($("ed-duration").value);
  const sum = [
    type !== "none" ? (segValue("ed-visibility") === "owner" ? "só eu vejo" : "todo mundo vê") : null,
    type !== "none" ? (nag ? `insiste a cada ${nag >= 60 ? nag / 60 + " h" : nag + " min"}` : "não insiste") : null,
    `fica ${dur >= 24 ? dur / 24 + (dur === 24 ? " dia" : " dias") : dur + " h"}`,
  ].filter(Boolean).join(" · ");
  $("ed-more-sum").textContent = sum;
  const v = T.verb;
  $("ed-save").textContent = when === "now" ? (keepBox.checked ? `Salvar e ${v.toLowerCase()}` : v)
    : when === "schedule" ? "Agendar" : "Salvar";
}
["ed-nag", "ed-duration"].forEach((id) => $(id).addEventListener("change", syncEditor));
$("ed-keep").addEventListener("change", syncEditor);

function loadEditor(t) {
  ed = JSON.parse(JSON.stringify({ ...BLANK, ...t, schedule: { ...BLANK.schedule, ...(t.schedule || {}) } }));
  $("ed-emoji").value = ed.emoji || "";
  $("ed-title").value = ed.title || "";
  $("ed-body").value = ed.body || "";
  $("ed-options").value = (ed.options || []).join(", ");
  segSelect("ed-type", ed.answerType);
  segSelect("ed-visibility", ed.visibility);
  $("ed-nag").value = String(ed.nagEveryMin ?? 15);
  $("ed-duration").value = String(ed.durationHours || 2);
  $("ed-mute").checked = ed.allowMute !== false;
  // Schedule → editable state (quarter hours only: the server checks every 15 minutes)
  const snap = (hm) => { const [h, m] = String(hm || "08:00").split(":").map(Number); const q = Math.round(m / 15) * 15; return `${pad2s((h + (q === 60 ? 1 : 0)) % 24)}:${pad2s(q % 60)}`; };
  const slots = scheduleSlots(ed.schedule).map((x) => ({ d: x.d, t: snap(x.t) }));
  ed.days = new Set(slots.map((x) => x.d));
  ed.dayTimes = {};
  for (const x of slots) (ed.dayTimes[x.d] ||= []).includes(x.t) || ed.dayTimes[x.d].push(x.t);
  const sets = Object.values(ed.dayTimes).map((l) => l.sort().join(","));
  ed.perDay = new Set(sets).size > 1;
  ed.times = sets.length ? sets[0].split(",") : ["08:00"];
  ed.dates = (ed.schedule.dates || []).filter((x) => parseWhen(x).getTime() > Date.now());
  const nextHour = new Date(Math.ceil((Date.now() + 1) / 3600000) * 3600000);
  $("ed-date-day").value = dateKeyOf(nextHour);
  $("ed-date-day").min = dateKeyOf(new Date());
  fillTimeSelect($("ed-date-time"), TIMES_15, `${pad2s(nextHour.getHours())}:00`);
  renderRecipients();
  renderSchedule();
}

let edQuick = false; // opened from the feed's ＋ (same form; starts as "send now, don't keep")
function openEditor(t, opts = {}) {
  edQuick = !!opts.quick;
  edId = t ? t.id : null;
  $("editor-title").textContent = edQuick ? `${T.verb} agora` : t ? `Editar ${T.one}` : `${T.novo} ${T.one}`;
  $("ed-keep-label").textContent = `Salvar nos meus ${T.many}`;
  show("ed-delete", !!t);
  show("ed-random", !t);
  loadEditor(t || BLANK);
  $("ed-keep").checked = t ? t.keep !== false : !edQuick;
  segSelect("ed-when", t ? (t.schedule && t.schedule.on ? "schedule" : "button") : edQuick ? "now" : "button");
  $("ed-more").open = false;
  syncEditor();
  $("dlg-editor").showModal();
}
// Emoji: tap opens a small grid; "outro" opens the keyboard for anything else.
const EMOJI_PICKS = ["🔔", "❓", "📢", "🚨", "⏰", "📅", "🍝", "🍕", "🍔", "🥗", "☕", "🍦", "🍷", "🍺", "🛒", "📦",
  "🚗", "✈️", "🏠", "🛏️", "🚿", "🧺", "🧹", "🗑️", "💊", "🩺", "🐶", "🐱", "🎂", "🎉", "🎁", "❤️",
  "💘", "😂", "😴", "🙏", "👍", "💰", "🔑", "📞", "🎬", "📺", "🎮", "⚽", "🏖️", "☀️", "🌧️", "🌙"];
const edEmoji = $("ed-emoji");
edEmoji.readOnly = true;
edEmoji.setAttribute("inputmode", "none");
edEmoji.addEventListener("click", () => {
  if (!edEmoji.readOnly) return;
  openPop(edEmoji, (el) => {
    el.classList.add("pop-emoji");
    el.innerHTML = `<div class="emoji-grid"></div><button type="button" class="emoji-other">⌨️ Outro emoji (teclado)</button>`;
    const grid = el.querySelector(".emoji-grid");
    for (const e of EMOJI_PICKS) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = e;
      b.setAttribute("aria-label", e);
      b.classList.toggle("on", edEmoji.value === e);
      b.onclick = () => { edEmoji.value = e; closePopMenu(); };
      grid.appendChild(b);
    }
    el.querySelector(".emoji-other").onclick = () => {
      closePopMenu();
      edEmoji.readOnly = false;
      edEmoji.removeAttribute("inputmode");
      edEmoji.value = "";
      edEmoji.focus();
    };
  });
});
edEmoji.addEventListener("input", () => {
  const g = firstGrapheme(edEmoji.value.trim());
  if (g && g !== edEmoji.value) edEmoji.value = g;
});
edEmoji.addEventListener("blur", () => { edEmoji.readOnly = true; edEmoji.setAttribute("inputmode", "none"); });

let lastStarter = -1;
$("ed-random").addEventListener("click", () => {
  let i;
  do { i = Math.floor(Math.random() * STARTERS.length); } while (i === lastStarter && STARTERS.length > 1);
  lastStarter = i;
  const st = STARTERS[i];
  $("ed-emoji").value = st.emoji;
  $("ed-title").value = st.title;
  $("ed-body").value = st.body;
  $("ed-options").value = st.options.join(", ");
  segSelect("ed-type", st.answerType);
  syncEditor();
});

$("ed-cancel").addEventListener("click", () => $("dlg-editor").close());
$("ed-delete").addEventListener("click", async () => {
  if (!edId || !(await confirmBox(`Apagar ${T.esse} ${T.one}?`, "Some pra sempre. As rodadas antigas continuam no histórico.", "Apagar"))) return;
  const ok = await withBusy($("ed-delete"), async () => { await deleteDoc(doc(db, "templates", edId)); return true; }, "…");
  if (ok) { $("dlg-editor").close(); toast("Apagado. 🗑️"); }
});

$("editor-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const type = segValue("ed-type") || "none";
  const when = segValue("ed-when") || "now";
  const keep = $("ed-keep").checked || (!!edId && ed.keep !== false);
  const options = $("ed-options").value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 6);
  const slots = when === "schedule" ? edSlots() : [];
  const dates = when === "schedule" ? ed.dates.filter((x) => parseWhen(x).getTime() > Date.now()).sort() : [];
  const data = {
    emoji: firstGrapheme($("ed-emoji").value.trim()) || "🔔",
    title: $("ed-title").value.trim(),
    body: $("ed-body").value.trim(),
    answerType: type,
    options: type === "options" ? options : [],
    recipients: ed.recipients === "all" ? "all" : (ed.recipients || []),
    visibility: segValue("ed-visibility") || "all",
    allowMute: keep && $("ed-mute").checked,
    nagEveryMin: type === "none" ? 0 : Number($("ed-nag").value),
    durationHours: Number($("ed-duration").value),
    schedule: { on: slots.length > 0 || dates.length > 0, slots, dates },
    keep,
    updatedAt: serverTimestamp(),
  };
  if (!data.title) return toast("Dá um título, vai.");
  if (data.recipients !== "all" && !data.recipients.length) return toast("Pra quem? Escolhe alguém.");
  if (type === "options" && options.length < 2) return toast("Coloca pelo menos 2 opções.");
  if (when === "schedule") {
    if (ed.days.size && !slots.length) return toast("Escolhe um horário pros dias marcados.");
    if (!data.schedule.on) return toast("Escolhe dias da semana ou uma data. 📅");
  }

  // Send now, without keeping it
  if (when === "now" && !keep) {
    const { updatedAt, schedule, allowMute, keep: _k, ...once } = data;
    const res = await withBusy($("ed-save"), () => api.sendOnce(once));
    if (!res) return;
    $("dlg-editor").close();
    setTab("feed");
    highlightRound = res.data.id;
    renderRounds();
    toast(T.done(res.data.recipients), 4000);
    return;
  }

  // Save (new or edited); "Agora" also sends right away.
  const res = await withBusy($("ed-save"), async () => {
    let id = edId;
    if (id) await updateDoc(doc(db, "templates", id), data);
    else id = (await addDoc(collection(db, "templates"), { ...data, ownerUid: auth.currentUser.uid, createdAt: serverTimestamp() })).id;
    if (when === "now") return api.fireTemplate({ templateId: id });
    return { data: null };
  }, when === "schedule" ? "Agendando…" : "Salvando…");
  if (!res) return;
  $("dlg-editor").close();
  if (when === "now" && res.data) {
    setTab("feed");
    highlightRound = res.data.id;
    renderRounds();
    toast(`${T.done(res.data.recipients)} E ficou salv${T.o}. ✨`, 4000);
  } else if (when === "schedule") {
    const nx = nextFire(data.schedule);
    toast(`Agendado${nx ? `: próximo ${whenLabel(nx)}` : ""}. ⏰${keep ? "" : " Some depois da última data."}`, 4500);
  } else {
    toast(`Salv${T.o}! Tá lá nos ${T.seus} ${T.many}. ✨`);
  }
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
fetch("decor/index.json", { cache: "no-cache" }).then((r) => r.json()).then((list) => { builtinDrawings = Array.isArray(list) ? list : []; renderAdmin(); }).catch(() => {});

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
  renderAdminLog();
  renderAdminPalettes();
  renderAdminOccasions();
  renderAdminDrawings();
  renderAdminTexts();
}

// ---------- People (logins from Firebase Auth + profiles) ----------
let authUsers = null; // null = not loaded yet
let authUsersError = "";
async function loadAuthUsers() {
  try {
    const { data } = await api.adminListUsers();
    authUsers = data.users || [];
    authUsersError = "";
  } catch (err) {
    authUsersError = friendlyError(err);
  }
  renderAdminPeople();
}

function showCredentials(title, email, password) {
  const link = location.origin + location.pathname;
  const text = `Oi! Seu acesso ao “Ela gosta de sorvete?” 🍦\n\n${link}\nE-mail: ${email}\nSenha: ${password}\n\nNo iPhone: abre no Safari → Compartilhar → Adicionar à Tela de Início, e entra por lá.`;
  $("cred-title").textContent = title;
  $("cred-text").textContent = text;
  $("cred-wa").href = `https://wa.me/?text=${encodeURIComponent(text)}`;
  $("cred-copy").onclick = async () => {
    try { await navigator.clipboard.writeText(text); toast("Copiado. 📋"); } catch { toast("Não deu pra copiar. Seleciona o texto."); }
  };
  $("dlg-cred").showModal();
}
$("cred-close").addEventListener("click", () => $("dlg-cred").close());

// "iPhone · app", "Android · Chrome"… (same as the server's labels)
function deviceLabel(ua) {
  ua = String(ua || "");
  const os = /iPhone|iPod/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : "Outro";
  const br = /SamsungBrowser/.test(ua) ? "Samsung" : /FxiOS|Firefox/.test(ua) ? "Firefox" : /EdgA|EdgiOS|Edg\//.test(ua) ? "Edge"
    : /OPR|Opera/.test(ua) ? "Opera" : /CriOS|Chrome/.test(ua) ? "Chrome"
    : (os === "iPhone" || os === "iPad") ? (/Safari\//.test(ua) ? "Safari" : "app") : /Safari/.test(ua) ? "Safari" : "navegador";
  return `${os} · ${br}`;
}
const agoText = (ms) => (ms ? relTime({ toMillis: () => ms }) : "");
function devicesHtml(uid) {
  const devs = adminDevices[uid] || [];
  if (!devs.length) return `<div class="devices small warn-text">⚠ nenhum aparelho com notificação</div>`;
  return `<div class="devices small">${devs.map((d) =>
    `<div class="device-row"><span>📱 ${esc(deviceLabel(d.userAgent))} · ${d.lastRecv ? "recebeu " + agoText(d.lastRecv) : "nunca confirmou recebimento"}${d.updatedAt && d.updatedAt.toMillis ? ` · entrou ${agoText(d.updatedAt.toMillis())}` : ""}</span>` +
    `<button class="link small device-del" data-dev="${esc(d.id)}" data-label="${esc(deviceLabel(d.userAgent))}">remover</button></div>`).join("")}</div>`;
}

function renderAdminPeople() {
  const list = $("adm-people");
  const uid = auth.currentUser && auth.currentUser.uid;
  const admins = Object.values(family).filter((p) => p.admin === true).length;
  $("adm-people-msg").textContent = authUsersError || (authUsers === null ? "Carregando contas…" : "");
  // Everyone with a login, plus any profile without one (shouldn't happen, but show it).
  const rows = new Map();
  for (const u of authUsers || []) rows.set(u.uid, { uid: u.uid, email: u.email, lastSignIn: u.lastSignIn });
  for (const u of Object.keys(family)) if (!rows.has(u)) rows.set(u, { uid: u, email: "" });
  list.innerHTML = "";
  [...rows.values()]
    .sort((a, b) => String((family[a.uid] || {}).name || a.email).localeCompare(String((family[b.uid] || {}).name || b.email)))
    .forEach((r) => {
      const p = family[r.uid] || {};
      const li = document.createElement("li");
      li.className = "person";
      const name = p.name ? nameHtml(r.uid, p.name) : `<span class="muted">(ainda não entrou)</span>`;
      li.innerHTML = `
        <div class="person-main">
          <div>${name}${p.admin ? ` <span class="badge">admin</span>` : ""}${r.uid === uid ? ` <span class="muted small">· você</span>` : ""}</div>
          <div class="muted small">${esc(r.email || "sem login")}</div>
          ${devicesHtml(r.uid)}
        </div>
        <div class="person-actions"></div>`;
      const actions = li.querySelector(".person-actions");
      const link = (text, fn, disabled = false) => {
        const b = document.createElement("button");
        b.className = "link small";
        b.textContent = text;
        b.disabled = disabled;
        b.onclick = () => fn(b);
        actions.appendChild(b);
      };
      if (p.name) {
        const lastAdmin = p.admin && admins <= 1;
        link(p.admin ? (lastAdmin ? "único admin" : "tirar admin") : "tornar admin", async (b) => {
          if (!(await confirmBox(p.admin ? "Tirar admin?" : "Tornar admin?", `${p.name} ${p.admin ? "perde" : "ganha"} acesso à aba Admin.`, "Confirmar"))) return;
          const res = await withBusy(b, () => api.setAdmin({ uid: r.uid, admin: !p.admin }), "…");
          if (res) toast(p.admin ? "Admin removido." : "Novo admin. 👑");
        }, lastAdmin);
      }
      if (p.name) {
        link(p.bigText ? "✓ letra grande" : "letra grande", async (b) => {
          const res = await withBusy(b, () => api.adminSetUserFlag({ uid: r.uid, key: "bigText", value: !p.bigText }), "…");
          if (res) toast(`${p.name}: letra grande ${p.bigText ? "desligada" : "ligada"}.`);
        });
      }
      if (r.email) {
        link("nova senha", async (b) => {
          if (!(await confirmBox("Gerar nova senha?", `A senha atual de ${r.email} para de funcionar.`, "Gerar"))) return;
          const res = await withBusy(b, () => api.adminSetPassword({ uid: r.uid }), "…");
          if (res) showCredentials("Nova senha", res.data.email || r.email, res.data.password);
        });
      }
      if (r.uid !== uid && !p.admin) {
        link("remover", async (b) => {
          const who = p.name || r.email || "essa pessoa";
          if (!(await confirmBox(`Remover ${who}?`, "Apaga o login, o apelido, os aparelhos e os recados dessa pessoa. Não tem volta.", "Remover"))) return;
          const res = await withBusy(b, () => api.adminDeleteUser({ uid: r.uid }), "…");
          if (res) { toast(`${who} removid${p.gender === "f" ? "a" : "o"}.`); loadAuthUsers(); }
        });
      }
      list.appendChild(li);
    });
}

// Remove a phone from the notification list (e.g. an old browser someone logged in once).
$("adm-people").addEventListener("click", async (e) => {
  const b = e.target.closest(".device-del");
  if (!b) return;
  if (!(await confirmBox(`Remover ${b.dataset.label}?`,
    "Esse aparelho para de receber notificações. Se a pessoa abrir o app nele de novo (ainda logada), ele volta sozinho — pra sumir de vez, é só sair do app nesse aparelho.",
    "Remover"))) return;
  try { await deleteDoc(doc(db, "devices", b.dataset.dev)); toast("Aparelho removido. 📵"); }
  catch (err) { toast(friendlyError(err)); }
});

$("adm-add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("adm-add-email").value.trim();
  const password = $("adm-add-pass").value.trim();
  if (password && password.length < 6) return toast("Senha: pelo menos 6 caracteres (ou deixa vazio).");
  const res = await withBusy($("adm-add-btn"), () => api.adminCreateUser({ email, password }), "Criando…");
  if (!res) return;
  $("adm-add-email").value = "";
  $("adm-add-pass").value = "";
  showCredentials("Acesso criado", res.data.email, res.data.password);
  loadAuthUsers();
});

// ---------- Logs: one line per thing that happened ----------
// Delivery entries (one per phone) become up to 3 events: sent, arrived, opened.
// Event entries (type "event") are things done to a round: created, answered, seen, closed…
const NOISY_KINDS = ["resposta", "mudou de ideia", "silenciou", "reativou"]; // telling others about an answer
function personName(uid, fallback) { return (uid && family[uid] && family[uid].name) || fallback || "?"; }

function flattenLog(entries) {
  const out = [];
  for (const e of entries) {
    const title = e.roundTitle || e.title || "";
    const emoji = e.emoji || "";
    const push = (at, icon, text, extra = "", cls = "") => out.push({ at, icon, text, title, emoji, extra, cls, who: [e.toUid, e.actorUid].filter(Boolean) });
    if (e.type === "event") {
      const a = personName(e.actorUid, e.actorName);
      switch (e.ev) {
        case "created": push(e.at, e.scheduled ? "⏰" : "📣", `${a} mandou pra ${e.count} pessoa${e.count === 1 ? "" : "s"}${e.scheduled ? " (agendado)" : ""}`); break;
        case "answer": push(e.at, e.changes ? "🌀" : "💬", e.changes ? `${a} mudou pra: ${e.value} (${e.changes}ª vez)` : `${a} respondeu: ${e.value}`, "", "good"); break;
        case "seen": push(e.at, "👁", `${a} visualizou`, "", "good"); break;
        case "closed": push(e.at, "🔒", `${a} encerrou`); break;
        case "expired": push(e.at, "⌛", "fechou (acabou o tempo)"); break;
        case "muted": push(e.at, "🔕", `${a} silenciou`, "", "meh"); break;
        case "unmuted": push(e.at, "🔔", `${a} reativou`); break;
      }
      continue;
    }
    // Delivery entry
    const p = personName(e.toUid, e.toName);
    const dev = e.device || "";
    const noisy = NOISY_KINDS.includes(e.kind);
    if (e.status === "failed") { push(e.at, "❌", `não chegou pra ${p}`, [dev, e.error].filter(Boolean).join(" · "), "bad"); continue; }
    if (e.status === "nodevice") { if (!noisy) push(e.at, "⚠", `${p} não tem aparelho com notificação`, "", "bad"); continue; }
    if (e.status === "quiet") { if (!noisy) push(e.at, "⏸", `${p} em horário de silêncio`, e.note || "", "meh"); continue; }
    if (e.status === "muted") { push(e.at, "🔕", `${p} tinha silenciado, não recebeu`, "", "meh"); continue; }
    if (noisy) continue; // the answer itself is already a line
    const sentText = e.kind === "insistência" ? `insistiu com ${p}` : e.kind === "teste" ? `teste enviado pra ${p}` : `enviado pra ${p}`;
    push(e.at, e.kind === "insistência" ? "🔁" : "📨", sentText, dev);
    if (e.receivedAt) push(e.receivedAt, "✓✓", `chegou no celular de ${p}`, dev, "good");
    if (e.openedAt) push(e.openedAt, "👆", `${p} abriu a notificação`, "", "good");
  }
  return out.sort((a, b) => b.at - a.at);
}

function dayLabel(ms) {
  const d = new Date(ms), today = new Date(), y = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === y.toDateString()) return "Ontem";
  return `${cap(DAY_SHORT[d.getDay()].toLowerCase())}, ${pad2s(d.getDate())}/${pad2s(d.getMonth() + 1)}`;
}

function renderAdminLog() {
  const list = $("adm-log");
  if (!list || !isAdminNow()) return;
  const events = flattenLog(logEntries);

  // Filter chips: everyone + each person who appears.
  const people = {};
  logEntries.forEach((e) => [e.toUid, e.actorUid].filter(Boolean).forEach((u) => { people[u] = personName(u, e.toName || e.actorName); }));
  const chips = $("log-filter");
  chips.innerHTML = "";
  [["all", "Todos"], ...Object.entries(people).sort((a, b) => a[1].localeCompare(b[1]))].forEach(([id, label]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (logFilter === id ? " selected" : "");
    b.textContent = label;
    b.onclick = () => { logFilter = id; renderAdminLog(); };
    chips.appendChild(b);
  });

  const shown = events.filter((ev) => logFilter === "all" || ev.who.includes(logFilter)).slice(0, 300);
  list.innerHTML = shown.length ? "" : `<li class="muted small">Nada por aqui ainda.</li>`;
  let lastDay = "";
  for (const ev of shown) {
    const day = dayLabel(ev.at);
    if (day !== lastDay) {
      lastDay = day;
      list.insertAdjacentHTML("beforeend", `<li class="log-day">${esc(day)}</li>`);
    }
    const d = new Date(ev.at);
    const sub = [ev.emoji + " " + ev.title, ev.extra].filter((x) => x && x.trim()).join(" · ");
    list.insertAdjacentHTML("beforeend", `
      <li class="log-line ${ev.cls}">
        <span class="log-time">${pad2s(d.getHours())}:${pad2s(d.getMinutes())}</span>
        <span class="log-body"><span class="log-text">${esc(ev.icon)} ${esc(ev.text)}</span>${sub ? `<span class="log-sub">${esc(sub)}</span>` : ""}</span>
      </li>`);
  }
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
      <span class="adm-row-text"><b>${esc(p.name || id)}${EFFECTS[raw.effect] ? ` <span class="fx-tag" title="${esc(EFFECTS[raw.effect])}">✨</span>` : ""}</b><span class="muted small">${esc(id)}${raw.onlyOccasions ? " · só ocasiões" : ""}${used.length ? " · usada em " + esc(used.join(", ")) : ""}</span></span>${raw.onlyOccasions ? `<span class="adm-lock" title="Só em ocasiões" aria-label="Só em ocasiões">🔒</span>` : ""}</button>`;
    li.querySelector("button").onclick = () => openPaletteEditor(id);
    list.appendChild(li);
  });
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

// ===================================================================
// Palette studio: one screen. Tap a tile (or a part of the mini-app) to edit
// that color; the sliders always start on its real values. Changes are live.
// ===================================================================
const ROLES = [
  { key: "bg", label: "Fundo", hint: "o fundo do app" },
  { key: "surface", label: "Cartões", hint: "cartões, abas e popups" },
  { key: "text", label: "Texto", hint: "texto normal" },
  { key: "muted", label: "Legendas", hint: "detalhes e legendas" },
  { key: "accent", label: "Botões", hint: "botões principais e o ＋" },
  { key: "highlight", label: "Realces", hint: "títulos, seleção e destaques" },
];
const roleOf = (k) => ROLES.find((r) => r.key === k);

// --- color math ---
function hexToRgb(hex) {
  let h = String(hex).replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
function hexToHsl(hex) {
  let [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h) % 360, Math.round(s * 100), Math.round(l * 100)];
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
const slugify = (x) => String(x).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);

// --- studio state ---
let st = null; // { id, isNew, pal:{name,bg,…}, role, locks:Set, decor:[], emoji, only, hist:[], fut:[] }
const snap = () => JSON.stringify({ pal: st.pal, decor: st.decor, emoji: st.emoji, only: st.only, effect: st.effect });
function restore(json) { const o = JSON.parse(json); st.pal = o.pal; st.decor = o.decor; st.emoji = o.emoji; st.only = o.only; st.effect = o.effect || ""; }
function commit(change) { st.hist.push(snap()); if (st.hist.length > 80) st.hist.shift(); st.fut = []; change(); renderStudio(); }

function studioId() {
  if (!st.isNew) return st.id;
  let base = slugify(st.pal.name) || "paleta";
  if (base.length < 2) base += "-1";
  let id = base, n = 2;
  while (allPalettes()[id]) id = `${base}-${n++}`;
  return id;
}

function palMenu(open) {
  show("pal-menu", open);
  $("pal-more").setAttribute("aria-expanded", String(open));
}

function openPaletteEditor(id) {
  const raw = id ? allPalettes()[id] || {} : null;
  const base = { ...DEFAULT_PALETTE, ...(raw || {}) };
  const parsed = parseDecor(raw ? raw.decor || "" : "");
  st = {
    id, isNew: !id,
    pal: { name: raw ? base.name || id : "", bg: base.bg, surface: base.surface, text: base.text, muted: base.muted, accent: base.accent, highlight: base.highlight },
    role: "accent", locks: new Set(),
    decor: parsed.filter((x) => x.svg).map((x) => x.svg).filter((v, i, a) => a.indexOf(v) === i),
    emoji: parsed.filter((x) => x.emoji).map((x) => x.emoji).join(""),
    only: !!(raw && raw.onlyOccasions), effect: (raw && raw.effect in EFFECTS) ? raw.effect : "", hist: [], fut: [],
  };
  if (!raw) st.decor = ["latte.svg", "mug.svg", "bean.svg"];
  $("pal-preview").querySelector(".mini-fx")?.removeAttribute("data-k");
  const from = $("pal-from");
  from.innerHTML = `<option value="">Escolher…</option>`;
  Object.entries(allPalettes()).forEach(([pid, p]) => { if (pid !== id) from.add(new Option((p && p.name) || pid, pid)); });
  $("pal-name").value = st.pal.name;
  show("pal-delete", !!id && id !== "espresso");
  palMenu(false);
  renderStudio();
  $("dlg-pal").showModal();
  $("pal-decor-gallery").scrollLeft = 0;
  if (!id) setTimeout(() => $("pal-name").focus(), 60);
}

// Which pair of colors must stay readable when this role changes
function readPair(role, p) {
  return {
    bg: { other: p.text, need: 4.5, what: "texto no fundo" },
    surface: { other: p.text, need: 4.5, what: "texto nos cartões" },
    text: { other: p.surface, need: 4.5, what: "texto nos cartões" },
    muted: { other: p.surface, need: 3, what: "legendas nos cartões" },
    accent: { other: p.bg, need: 4.5, what: "letra dentro dos botões" },
    highlight: { other: p.surface, need: 3, what: "títulos nos cartões" },
  }[role];
}

function renderStudio() {
  const p = st.pal;
  const dirty = st.isNew || st.hist.length > 0;
  $("pal-idline").textContent = st.isNew ? (p.name ? `Nova · id: ${studioId()}` : "Nova paleta · dá um nome ✍️") : `id: ${st.id}`;
  $("pal-undo").disabled = !st.hist.length;
  $("pal-redo").disabled = !st.fut.length;
  $("pal-save").classList.toggle("dirty", dirty);
  $("pal-only").checked = st.only;
  $("pal-effect").value = st.effect;
  if (document.activeElement !== $("pal-emoji")) $("pal-emoji").value = st.emoji;

  const vars = { "--bg": p.bg, "--surface": p.surface, "--fg": p.text, "--muted": p.muted, "--caramel": p.accent, "--crema": p.highlight };

  // Live mini-app (tap a part to edit its color)
  const box = $("pal-preview");
  for (const [k, v] of Object.entries(vars)) if (HEX.test(v)) box.style.setProperty(k, v);
  if (!box.firstChild) {
    box.innerHTML = `
      <div class="mini" data-role="bg">
        <div class="mini-decor"></div>
        <div class="mini-top"><span data-role="muted">Ela gosta de sorvete?</span><span data-role="muted">⚙</span></div>
        <div class="mini-tabs" data-role="surface"><span class="sel" data-role="highlight">Feed</span><span data-role="muted">Recados</span></div>
        <div class="mini-card" data-role="surface">
          <div class="mini-title" data-role="highlight">🍝 Vai ter almoço hoje?</div>
          <div class="mini-meta" data-role="muted">de Patroa · há 5 min</div>
          <div class="mini-text" data-role="text">Responde logo, por favor!</div>
          <div class="mini-btns"><span class="mini-btn pri" data-role="accent">Sim</span><span class="mini-btn sec" data-role="text">Não</span></div>
        </div>
        <span class="mini-fab" data-role="accent">＋</span>
        <div class="mini-fx"></div>
      </div>`;
    box.addEventListener("click", (e) => {
      const el = e.target.closest("[data-role]");
      if (el) { st.role = el.dataset.role; renderStudio(); }
    });
  }
  box.querySelectorAll("[data-role]").forEach((el) => el.classList.toggle("on", el.dataset.role === st.role));
  const dec = box.querySelector(".mini-decor");
  const want = st.decor.slice(0, 3).join("|") + "|" + st.emoji;
  if (dec.dataset.k !== want) {
    dec.dataset.k = want;
    dec.innerHTML = "";
    st.decor.slice(0, 3).forEach((name, i) => {
      const s = document.createElement("span");
      s.className = `mini-svg n${i}`;
      loadSvg(name).then((t) => { s.innerHTML = t; });
      dec.appendChild(s);
    });
    graphemes(st.emoji).slice(0, 2).forEach((g, i) => {
      const s = document.createElement("span");
      s.className = `mini-emo e${i}`;
      s.textContent = g;
      dec.appendChild(s);
    });
  }

  // The theme's effect, live in the mini-app
  const fxl = box.querySelector(".mini-fx");
  if (fxl.dataset.k !== st.effect) {
    fxl.dataset.k = st.effect;
    fxl.classList.toggle("back", st.effect === "smoke");
    spawnEffect(fxl, st.effect, 0.45);
  }

  // Role tiles = the palette
  const roles = $("pal-roles");
  if (!roles.firstChild) {
    for (const r of ROLES) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ps-role";
      b.dataset.role = r.key;
      b.title = r.hint;
      b.innerHTML = `<i></i><span>${r.label}</span>`;
      b.onclick = () => { st.role = r.key; renderStudio(); };
      roles.appendChild(b);
    }
  }
  roles.querySelectorAll(".ps-role").forEach((b) => {
    const k = b.dataset.role;
    b.classList.toggle("on", k === st.role);
    b.setAttribute("aria-pressed", String(k === st.role));
    const i = b.querySelector("i");
    i.style.background = p[k];
    i.innerHTML = st.locks.has(k) ? "<em>🔒</em>" : "";
  });

  // Editor: starts on the selected color's real values
  const cur = p[st.role];
  const [h, s, l] = hexToHsl(cur);
  $("pk-swatch").style.background = cur;
  if (document.activeElement !== $("pk-hex")) $("pk-hex").value = cur;
  const locked = st.locks.has(st.role);
  $("pk-lock").textContent = locked ? "🔒" : "🔓";
  $("pk-lock").setAttribute("aria-pressed", String(locked));
  $("pk-lock").setAttribute("aria-label", locked ? "Destravar cor (o 🎲 volta a mudar ela)" : "Travar cor (o 🎲 não muda ela)");
  if (!draggingSlider) { $("pk-h").value = h; $("pk-s").value = s; $("pk-l").value = l; }
  const H = +$("pk-h").value, S = +$("pk-s").value, L = +$("pk-l").value;
  const tracks = {
    "pk-h": `linear-gradient(90deg, ${[0, 60, 120, 180, 240, 300, 360].map((x) => hslToHex(x, Math.max(S, 35), Math.min(Math.max(L, 35), 65))).join(",")})`,
    "pk-s": `linear-gradient(90deg, ${hslToHex(H, 0, L)}, ${hslToHex(H, 100, L)})`,
    "pk-l": `linear-gradient(90deg, #000, ${hslToHex(H, S, 50)}, #fff)`,
  };
  for (const [id, bg] of Object.entries(tracks)) {
    const inp = $(id);
    inp.style.background = bg;
    inp.style.setProperty("--thumb", cur);
    // keep the label on the side away from the thumb
    inp.parentElement.classList.toggle("flip", +inp.value / +inp.max > 0.55);
  }

  // Readability: tap to fix it automatically
  const pr = readPair(st.role, p);
  const ratio = contrast(cur, pr.other);
  const v = ratio >= 7 ? ["ótima", "good"] : ratio >= pr.need ? ["boa", "good"] : ratio >= 3 ? ["fraca", "meh"] : ["ruim", "bad"];
  const rd = $("pk-contrast");
  rd.className = `ps-read ${v[1]}`;
  rd.textContent = `Leitura ${v[0]} ${ratio.toFixed(1)}${ratio < pr.need ? " · corrigir ✨" : ""}`;
  rd.title = `${pr.what}: ${ratio.toFixed(1)}:1${ratio < pr.need ? " · toque pra corrigir" : ""}`;

  // Suggestions: nearby tones | the palette's other colors
  const sug = $("pk-suggest");
  sug.innerHTML = "";
  const seen = new Set([cur.toLowerCase()]);
  const add = (c) => {
    if (seen.has(c.toLowerCase())) return;
    seen.add(c.toLowerCase());
    const b = document.createElement("button");
    b.type = "button";
    b.style.background = c;
    b.setAttribute("aria-label", c);
    b.onclick = () => commit(() => { st.pal[st.role] = c; });
    sug.appendChild(b);
  };
  [hslToHex(h, s, l - 20), hslToHex(h, s, l - 9), hslToHex(h, s, l + 9), hslToHex(h, s, l + 20), hslToHex(h - 25, s, l), hslToHex(h + 25, s, l)].forEach(add);
  const gap = document.createElement("span");
  gap.className = "gap";
  sug.appendChild(gap);
  ROLES.forEach((r) => add(p[r.key]));

  // Drawings row (in this palette's colors, numbered in order)
  const gal = $("pal-decor-gallery");
  for (const [k, v2] of Object.entries(vars)) if (HEX.test(v2)) gal.style.setProperty(k, v2);
  const names = allDrawingNames();
  if (gal.dataset.k !== names.join("|")) {
    gal.dataset.k = names.join("|");
    gal.innerHTML = `<span class="ps-decor-label">desenhos</span>`;
    for (const name of names) {
      const t = document.createElement("button");
      t.type = "button";
      t.className = "dg";
      t.dataset.name = name;
      t.title = name.replace(/\.svg$/, "");
      t.setAttribute("aria-label", t.title);
      t.innerHTML = `<span class="dg-img"></span><span class="dg-n"></span>`;
      loadSvg(name).then((svg) => { t.querySelector(".dg-img").innerHTML = svg; });
      t.onclick = () => commit(() => {
        const i = st.decor.indexOf(name);
        if (i >= 0) st.decor.splice(i, 1); else st.decor.push(name);
      });
      gal.appendChild(t);
    }
  }
  gal.querySelectorAll(".dg").forEach((t) => {
    const i = st.decor.indexOf(t.dataset.name);
    t.classList.toggle("on", i >= 0);
    t.setAttribute("aria-pressed", String(i >= 0));
    t.querySelector(".dg-n").textContent = i >= 0 ? i + 1 : "";
  });
}

// Sliders: one undo step per drag
let draggingSlider = false;
for (const id of ["pk-h", "pk-s", "pk-l"]) {
  $(id).addEventListener("input", () => {
    if (!draggingSlider) { st.hist.push(snap()); st.fut = []; draggingSlider = true; }
    st.pal[st.role] = hslToHex(+$("pk-h").value, +$("pk-s").value, +$("pk-l").value);
    renderStudio();
  });
  $(id).addEventListener("change", () => { draggingSlider = false; renderStudio(); });
}
$("pk-hex").addEventListener("input", (e) => {
  let v = e.target.value.trim();
  if (v && v[0] !== "#") v = "#" + v;
  if (/^#[0-9a-f]{6}$/i.test(v)) commit(() => { st.pal[st.role] = v.toLowerCase(); });
});
$("pk-hex").addEventListener("focus", (e) => e.target.select());
$("pk-hex").addEventListener("blur", () => renderStudio());
$("pk-lock").addEventListener("click", () => {
  st.locks.has(st.role) ? st.locks.delete(st.role) : st.locks.add(st.role);
  renderStudio();
});
// Readability fix: move this color's lightness away from its partner until it reads well
$("pk-contrast").addEventListener("click", () => {
  const pr = readPair(st.role, st.pal);
  if (contrast(st.pal[st.role], pr.other) >= pr.need) return toast(`Já tá boa: ${pr.what}. 👍`);
  const [h, s, l] = hexToHsl(st.pal[st.role]);
  const step = luminance(pr.other) < 0.18 ? 1 : -1;
  let fixed = step > 0 ? "#ffffff" : "#000000";
  for (let L = l; L >= 0 && L <= 100; L += step) {
    const c = hslToHex(h, s, L);
    if (contrast(c, pr.other) >= pr.need) { fixed = c; break; }
  }
  commit(() => { st.pal[st.role] = fixed; });
  toast("Pronto, agora dá pra ler. 👓");
});
$("pal-name").addEventListener("input", (e) => { st.pal.name = e.target.value; renderStudio(); });
$("pal-emoji").addEventListener("input", (e) => { st.emoji = e.target.value; renderStudio(); });
$("pal-only").addEventListener("change", (e) => commit(() => { st.only = e.target.checked; }));
fillEffectSelect($("pal-effect"));
fillEffectSelect($("occ-effect"));
$("pal-effect").addEventListener("change", (e) => commit(() => { st.effect = e.target.value; }));
$("pal-undo").addEventListener("click", () => { if (!st.hist.length) return; st.fut.push(snap()); restore(st.hist.pop()); renderStudio(); });
$("pal-redo").addEventListener("click", () => { if (!st.fut.length) return; st.hist.push(snap()); restore(st.fut.pop()); renderStudio(); });
$("pal-more").addEventListener("click", (e) => { e.stopPropagation(); palMenu($("pal-menu").hidden); });
$("dlg-pal").addEventListener("click", (e) => {
  if (!$("pal-menu").hidden && !e.target.closest("#pal-menu") && !e.target.closest("#pal-more")) palMenu(false);
});
$("pal-from").addEventListener("change", (e) => {
  const src = allPalettes()[e.target.value];
  e.target.value = "";
  if (!src) return;
  commit(() => {
    for (const r of ROLES) if (!st.locks.has(r.key) && HEX.test(src[r.key] || "")) st.pal[r.key] = src[r.key];
    const d = parseDecor(src.decor || "");
    st.decor = d.filter((x) => x.svg).map((x) => x.svg).filter((v, i, a) => a.indexOf(v) === i);
    st.emoji = d.filter((x) => x.emoji).map((x) => x.emoji).join("");
    st.effect = src.effect in EFFECTS ? src.effect : "";
  });
  palMenu(false);
  toast("Copiado. Agora é só ajustar. 🎨");
});

// 🎲 A harmonious random palette (locked colors stay).
$("pal-random").addEventListener("click", () => commit(() => {
  const h = Math.floor(Math.random() * 360);
  const shift = [0, 30, -30, 180, 150][Math.floor(Math.random() * 5)];
  const sat = 18 + Math.random() * 22;
  const gen = {
    bg: hslToHex(h, sat, 6 + Math.random() * 3),
    surface: hslToHex(h, sat, 14 + Math.random() * 4),
    text: hslToHex(h, 25, 91 + Math.random() * 4),
    muted: hslToHex(h, 14, 62 + Math.random() * 8),
    accent: hslToHex(h + shift, 55 + Math.random() * 30, 55 + Math.random() * 10),
    highlight: hslToHex(h + shift + 20, 60 + Math.random() * 30, 78 + Math.random() * 8),
  };
  for (const r of ROLES) if (!st.locks.has(r.key)) st.pal[r.key] = gen[r.key];
}));

$("pal-cancel").addEventListener("click", async () => {
  if (st.hist.length && !(await confirmBox("Sair sem salvar?", "As mudanças dessa paleta vão se perder.", "Sair"))) return;
  $("dlg-pal").close();
});
$("dlg-pal").addEventListener("cancel", (e) => {
  e.preventDefault();
  if (!$("pal-menu").hidden) return palMenu(false);
  $("pal-cancel").click();
});

function studioPalette() {
  const p = { ...st.pal, name: st.pal.name.trim() };
  const decor = [...st.decor, st.emoji.trim()].filter(Boolean).join(" ");
  if (decor) p.decor = decor;
  if (st.only) p.onlyOccasions = true;
  if (st.effect) p.effect = st.effect;
  return p;
}
$("pal-save").addEventListener("click", async () => {
  const p = studioPalette();
  if (!p.name) { toast("Dá um nome pra paleta. ✍️"); $("pal-name").focus(); return; }
  const bad = ROLES.find((r) => !HEX.test(p[r.key]));
  if (bad) return toast(`Cor inválida em “${bad.label}”.`);
  const id = studioId();
  const ok = await withBusy($("pal-save"), async () => { await updateDoc(funRef(), new FieldPath("palettes", id), p); return true; }, "…");
  if (ok) { $("dlg-pal").close(); toast(`Paleta “${p.name}” salva. 🎨`); }
});
$("pal-delete").addEventListener("click", async () => {
  palMenu(false);
  const id = st.id;
  const used = usedByOccasions(id);
  const msg = used.length ? `Ela é usada em: ${used.join(", ")}. Essas ocasiões vão ficar sem paleta.` : "Quem tinha escolhido ela volta pro Espresso.";
  if (!(await confirmBox("Apagar paleta?", msg, "Apagar"))) return;
  const ok = await withBusy($("pal-delete"), async () => { await updateDoc(funRef(), new FieldPath("palettes", id), deleteField()); return true; }, "…");
  if (ok) { $("dlg-pal").close(); toast("Paleta apagada."); }
});

$("adm-pal-new").addEventListener("click", () => openPaletteEditor(null));

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
        <span class="muted small">${esc(describeWhen(o.when))}</span>
        <span class="muted small">${next ? "Próxima: " + fmtDate(next) : "Nunca"}</span></span></button>`;
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
  $("occ-when-info").textContent = next.length ? `${next[0].i === 0 ? "✓ Hoje é dia! · " : ""}Próximas: ${next.map(fmtDate).join(", ")}` : "⚠ Não cai em nenhum dia dos próximos 2 anos.";
}
function openOccasionEditor(id) {
  occEditing = id;
  const o = id ? allOccasions()[id] || {} : { priority: 5 };
  $("occ-title").textContent = id ? `Ocasião: ${id}` : "Nova ocasião";
  $("occ-id").value = id || "";
  $("occ-id").readOnly = !!id;
  occRules = mergeRules(String(o.when || "").split(",").map((x) => x.trim()).filter(Boolean).map((p) => normalizeRule(ruleFromPattern(p))));
  if (!occRules.length) occRules = [newRule()];
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
  renderRules();
  $("dlg-occ").showModal();
}
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


// ---------- Date-rule builder (no typing: pick a type, then dropdowns) ----------
const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS_PT = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const WD_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const RULE_TYPES = [
  ["annual", "Todo ano"],
  ["once", "Um ano só"],
  ["nth", "Nº dia da semana do mês"],
  ["wdday", "Dia da semana + dia do mês"],
  ["easter", "Páscoa"],
];
const daysIn = (m, y = 2024) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // 2024: leap year, so Feb has 29
const dayMonth = (d, m) => `${d} de ${MONTHS_PT[m - 1]}`;
const fem = (wd) => wd > 0 && wd < 6;                              // segunda…sexta are feminine
const wdName = (wd) => WEEKDAYS_PT[wd] + (fem(wd) ? "-feira" : ""); // "sexta-feira", "domingo"

function ruleFromPattern(p) {
  p = String(p || "").trim().toLowerCase();
  let m;
  if ((m = p.match(/^(\d\d)-(\d\d)(?:\.\.(\d\d)-(\d\d))?$/))) {
    return { type: "annual", fm: +m[1], fd: +m[2], tm: +(m[3] || m[1]), td: +(m[4] || m[2]) };
  }
  if ((m = p.match(/^(\d{4})-(\d\d)-(\d\d)(?:\.\.(\d{4})-(\d\d)-(\d\d))?$/))) {
    return { type: "once", fy: +m[1], fm: +m[2], fd: +m[3], ty: +(m[4] || m[1]), tm: +(m[5] || m[2]), td: +(m[6] || m[3]) };
  }
  if ((m = p.match(/^(\d|last)([a-z]{3})-(\d\d)$/)) && m[2] in WD) return { type: "nth", n: m[1] === "last" ? "last" : +m[1], wd: WD[m[2]], m: +m[3] };
  if ((m = p.match(/^([a-z]{3})-(\d\d?)$/)) && m[1] in WD) return { type: "wdday", wd: WD[m[1]], d: +m[2] };
  if ((m = p.match(/^easter([+-]\d+)?(?:\.\.easter([+-]\d+)?)?$/))) {
    const a = Number(m[1] || 0), b = m[0].includes("..") ? Number(m[2] || 0) : a;
    return { type: "easter", off: a, len: Math.max(1, b - a + 1) };
  }
  return { type: "raw", text: p };
}

function patternFromRule(r) {
  const md = (mo, d) => `${pad2s(mo)}-${pad2s(d)}`;
  const sg = (n) => (n === 0 ? "" : n > 0 ? `+${n}` : `${n}`);
  switch (r.type) {
    case "annual": { const a = md(r.fm, r.fd), b = md(r.tm, r.td); return a === b ? a : `${a}..${b}`; }
    case "once": {
      const a = `${r.fy}-${md(r.fm, r.fd)}`, b = `${r.ty}-${md(r.tm, r.td)}`;
      return a === b ? a : a < b ? `${a}..${b}` : `${b}..${a}`;
    }
    case "nth": return `${r.n === "last" ? "last" : r.n}${WD_CODES[r.wd]}-${pad2s(r.m)}`;
    case "wdday": return `${WD_CODES[r.wd]}-${pad2s(r.d)}`;
    case "easter": return r.len > 1 ? `easter${sg(r.off)}..easter${sg(r.off + r.len - 1)}` : `easter${sg(r.off)}`;
    default: return r.text || "";
  }
}

function describeRule(r) {
  switch (r.type) {
    case "annual": {
      const same = r.fm === r.tm && r.fd === r.td;
      if (same) return `Todo ano, ${dayMonth(r.fd, r.fm)}`;
      const wraps = r.tm * 100 + r.td < r.fm * 100 + r.fd;
      return `Todo ano, de ${dayMonth(r.fd, r.fm)} a ${dayMonth(r.td, r.tm)}${wraps ? " (do ano seguinte)" : ""}`;
    }
    case "once": {
      const a = `${dayMonth(r.fd, r.fm)} de ${r.fy}`, b = `${dayMonth(r.td, r.tm)} de ${r.ty}`;
      return a === b ? `Só em ${a}` : `De ${a} a ${b}`;
    }
    case "nth": return `Todo ano, ${r.n === "last" ? (fem(r.wd) ? "última" : "último") : r.n + (fem(r.wd) ? "ª" : "º")} ${wdName(r.wd)} de ${MONTHS_PT[r.m - 1]}`;
    case "wdday": return `${fem(r.wd) ? "Toda" : "Todo"} ${wdName(r.wd)} que cair no dia ${r.d}`;
    case "easter": {
      const n = Math.abs(r.off);
      const base = r.off === 0 ? "No domingo de Páscoa" : `${n} dia${n > 1 ? "s" : ""} ${r.off < 0 ? "antes" : "depois"} da Páscoa`;
      return r.len > 1 ? `${base}, por ${r.len} dias` : base;
    }
    default: return `Código: ${r.text}`;
  }
}

function describeWhen(when) {
  const parts = String(when || "").split(",").map((x) => x.trim()).filter(Boolean);
  return parts.length ? mergeRules(parts.map(ruleFromPattern)).map(describeRule).join(" + ") : "Sem data";
}

// Joins old-style lists of single days into ranges: "easter-48,easter-47" → one 2-day rule.
function mergeRules(rules) {
  const out = [];
  for (const r of rules) {
    const prev = out[out.length - 1];
    if (prev && prev.type === "easter" && r.type === "easter" && r.off === prev.off + prev.len) { prev.len += r.len; continue; }
    if (prev && prev.type === "annual" && r.type === "annual" && r.fm === r.tm && r.fd === r.td &&
        prev.tm === r.fm && prev.td + 1 === r.fd) { prev.td = r.td; continue; }
    out.push({ ...r });
  }
  return out;
}

function newRule() {
  const t = spToday();
  return { type: "annual", fm: t.m, fd: t.d, tm: t.m, td: t.d };
}
// Fills the fields a type needs, keeping whatever already makes sense.
function normalizeRule(r) {
  const t = spToday();
  const base = {
    annual: { fm: t.m, fd: t.d, tm: t.m, td: t.d },
    once: { fy: t.y, fm: t.m, fd: t.d, ty: t.y, tm: t.m, td: t.d },
    nth: { n: 1, wd: 0, m: t.m },
    wdday: { wd: 5, d: 13 },
    easter: { off: 0, len: 1 },
  }[r.type] || {};
  const out = { ...base, ...r };
  if (out.fd && out.fm) out.fd = Math.min(out.fd, daysIn(out.fm, out.fy));
  if (out.td && out.tm) out.td = Math.min(out.td, daysIn(out.tm, out.ty));
  return out;
}

let occRules = [];
function selectEl(options, value, onChange, cls = "") {
  const sel = document.createElement("select");
  if (cls) sel.className = cls;
  for (const [v, label] of options) sel.add(new Option(label, String(v)));
  sel.value = String(value);
  sel.onchange = () => onChange(sel.value);
  return sel;
}
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

function renderRules() {
  const wrap = $("occ-rules");
  wrap.innerHTML = "";
  occRules.forEach((r, idx) => {
    const card = document.createElement("div");
    card.className = "rule";
    const head = document.createElement("div");
    head.className = "rule-head";
    const types = r.type === "raw" ? RULE_TYPES.concat([["raw", "Código antigo"]]) : RULE_TYPES;
    head.appendChild(selectEl(types, r.type, (v) => { occRules[idx] = normalizeRule({ type: v }); renderRules(); }, "rule-type"));
    if (occRules.length > 1) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "rule-del";
      del.textContent = "×";
      del.setAttribute("aria-label", "Remover");
      del.onclick = () => { occRules.splice(idx, 1); renderRules(); };
      head.appendChild(del);
    }
    card.appendChild(head);

    const body = document.createElement("div");
    body.className = "rule-body";
    const set = (patch) => { occRules[idx] = normalizeRule({ ...r, ...patch }); renderRules(); };
    const label = (txt) => { const s = document.createElement("span"); s.className = "rule-label"; s.textContent = txt; return s; };
    const monthSel = (v, f) => selectEl(MONTHS_PT.map((n, i) => [i + 1, n]), v, (x) => f(+x));
    const daySel = (v, mo, y, f) => selectEl(range(1, daysIn(mo, y)).map((d) => [d, d]), v, (x) => f(+x), "narrow");
    const wdSel = (v, f) => selectEl(WEEKDAYS_PT.map((n, i) => [i, wdName(i)]), v, (x) => f(+x));
    const row = (...els) => { const d = document.createElement("div"); d.className = "rule-row"; els.forEach((e) => d.appendChild(e)); return d; };

    if (r.type === "annual") {
      // Moving the start drags the end along when it was a single day.
      const single = r.fm === r.tm && r.fd === r.td;
      body.append(
        row(label("De"), daySel(r.fd, r.fm, 2024, (v) => set(single ? { fd: v, td: v } : { fd: v })),
          monthSel(r.fm, (v) => set(single ? { fm: v, tm: v } : { fm: v }))),
        row(label("Até"), daySel(r.td, r.tm, 2024, (v) => set({ td: v })), monthSel(r.tm, (v) => set({ tm: v }))),
      );
    } else if (r.type === "once") {
      const single = r.fy === r.ty && r.fm === r.tm && r.fd === r.td;
      const years = range(spToday().y, spToday().y + 3).map((y) => [y, y]);
      body.append(
        row(label("De"), daySel(r.fd, r.fm, r.fy, (v) => set(single ? { fd: v, td: v } : { fd: v })),
          monthSel(r.fm, (v) => set(single ? { fm: v, tm: v } : { fm: v })),
          selectEl(years, r.fy, (v) => set(single ? { fy: +v, ty: +v } : { fy: +v }), "narrow")),
        row(label("Até"), daySel(r.td, r.tm, r.ty, (v) => set({ td: v })), monthSel(r.tm, (v) => set({ tm: v })),
          selectEl(years, r.ty, (v) => set({ ty: +v }), "narrow")),
      );
    } else if (r.type === "nth") {
      body.append(
        row(selectEl([1, 2, 3, 4].map((n) => [n, n + (fem(r.wd) ? "ª" : "º")]).concat([["last", fem(r.wd) ? "última" : "último"]]), r.n, (v) => set({ n: v === "last" ? "last" : +v }), "narrow"),
          wdSel(r.wd, (v) => set({ wd: v }))),
        row(label("de"), monthSel(r.m, (v) => set({ m: v }))),
      );
    } else if (r.type === "wdday") {
      body.append(row(label(fem(r.wd) ? "Toda" : "Todo"), wdSel(r.wd, (v) => set({ wd: v })), label("no dia"),
        selectEl(range(1, 31).map((d) => [d, d]), r.d, (v) => set({ d: +v }), "narrow")));
    } else if (r.type === "easter") {
      const n = Math.abs(r.off), dir = r.off === 0 ? 0 : r.off < 0 ? -1 : 1;
      body.append(
        row(selectEl(range(0, 60).map((x) => [x, x]), n, (v) => set({ off: (dir || (+v ? -1 : 0)) * +v }), "narrow"),
          label("dias"), selectEl([[-1, "antes"], [1, "depois"]], dir || -1, (v) => set({ off: +v * n }), ""), label("da Páscoa")),
        row(label("Dura"), selectEl(range(1, 14).map((x) => [x, x]), r.len, (v) => set({ len: +v }), "narrow"), label("dia(s)")),
      );
    } else {
      const inp = document.createElement("input");
      inp.value = r.text || "";
      inp.oninput = () => { occRules[idx] = ruleFromPattern(inp.value); syncWhen(); };
      body.append(inp);
    }
    card.appendChild(body);
    const desc = document.createElement("div");
    desc.className = "rule-desc";
    desc.textContent = describeRule(r);
    card.appendChild(desc);
    wrap.appendChild(card);
  });
  syncWhen();
}

function syncWhen() {
  $("occ-when").value = occRules.map(patternFromRule).filter(Boolean).join(",");
  renderWhenInfo();
}
$("occ-rule-add").addEventListener("click", () => { occRules.push(newRule()); renderRules(); });

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
  $("adm-version-today").textContent = `Versão de hoje: ${$("version").textContent} · Nome do dia: “${T.one}”${PREVIEW_TERM ? " (prévia)" : ""}`;
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
// Coming back after being in the background: phones pause hidden pages and the live
// connection can silently die, leaving stale data on screen.
//  - away > 1 min  → restart the database connection (everything re-syncs)
//  - away > 30 min → full reload (also picks up new app versions), unless a popup is open
let hiddenAt = 0;
let resyncing = false;
async function resync() {
  if (resyncing) return;
  resyncing = true;
  try { await disableNetwork(db); await enableNetwork(db); } catch (e) { console.warn("resync", e); }
  resyncing = false;
}
function onBack() {
  const away = hiddenAt ? Date.now() - hiddenAt : 0;
  hiddenAt = 0;
  if (away > 30 * 60000 && !document.querySelector("dialog[open]")) { location.reload(); return; }
  if (away > 60000) resync();
  if (!auth.currentUser) return;
  checkGate();
  renderRounds(); // refresh "há X min" / "fecha às"
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
  onBack();
});
// Restored from the browser's back/forward cache (some phones do this instead of reloading).
window.addEventListener("pageshow", (e) => { if (e.persisted) { hiddenAt = hiddenAt || Date.now() - 31 * 60000; onBack(); } });

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
