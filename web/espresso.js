// ☕ Espresso — a pacote (see PACOTES in app.js, key "espresso"; the "Espresso" tema switches it on).
// Behind the feed: the steaming cup (effects.js "smoke") and "passar café":
//   two LED bars on the sides (20–50% of the screen height, from the bottom): temperature on the left
//   (light from blue to red), water on the right (a steady soft blue).
//   A touch on the empty background sets the bar of that half to the touch's height; a slide moves it.
//   Once both were touched: a faint 10 → 0 in the middle (any touch on the bars starts it again from 10).
//   At 0 a thin stream of coffee falls from the top and fills the screen up to the water level; hot = steam,
//   cold = a blue glow. Full stays full until the app is reloaded (state lives only in this module).
// Hooks: back(layer), front(layer, scale, still), tap, start(ctx)/stop(), rest(on).
const ver = new URL(import.meta.url).search;
const effects = import(new URL("effects.js" + ver, import.meta.url).href);

const CSS = `
.esp{position:absolute;inset:0;z-index:1;pointer-events:none}
.esp-coffee{position:absolute;left:0;right:0;bottom:0;height:0;background:linear-gradient(to bottom,#4a2712 0%,#3a1d0d 6%,#24110a 40%,#120804 75%,#0a0402 100%);box-shadow:0 -8px 40px rgba(201,139,79,.18)}
.esp-coffee.cold{background:linear-gradient(to bottom,#2c1a12 0%,#2a160c 8%,#1d0e07 45%,#0d0603 100%)}
.esp-coffee::before{content:"";position:absolute;inset:0;background:radial-gradient(60% 30% at 30% 25%,rgba(201,139,79,.16),transparent 70%),radial-gradient(50% 25% at 75% 45%,rgba(226,195,155,.08),transparent 70%),radial-gradient(80% 40% at 50% 100%,rgba(0,0,0,.5),transparent 70%)}
.esp-crema{position:absolute;left:0;right:0;top:0;height:11px;background:linear-gradient(to bottom,#cf9d68,#a96a38 50%,#5e3218)}
.esp-coffee.hot .esp-crema{height:16px;background:linear-gradient(to bottom,#e3b07a,#c07d42 45%,#7a4220)}
.esp-coffee.cold .esp-crema{height:4px;background:linear-gradient(to bottom,#8f7a6a,#3a2418)}
.esp-crema::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 40%,rgba(255,240,215,.35) 0 1.5px,transparent 2.5px) 0 0/23px 11px,radial-gradient(circle at 60% 60%,rgba(255,240,215,.25) 0 1px,transparent 2px) 0 0/17px 9px}
.esp-coffee.cold .esp-crema::before{opacity:.2}
.esp-crema::after{content:"";position:absolute;left:0;right:0;top:100%;height:18px;background:linear-gradient(to bottom,rgba(0,0,0,.35),transparent)}
.esp-rim{position:absolute;left:0;right:0;top:0;height:1px;background:rgba(255,236,205,.65)}
.esp-coffee.cold .esp-rim{background:rgba(170,225,255,.8)}
.esp-glow{display:none;position:absolute;left:0;right:0;top:-2px;height:3px;background:#9fdcff;box-shadow:0 0 18px 6px rgba(127,200,248,.55),0 0 60px 20px rgba(127,200,248,.18);animation:esp-glow 3s ease-in-out infinite}
.esp-chill{display:none;position:absolute;inset:0;background:linear-gradient(to bottom,rgba(127,200,248,.2),rgba(127,200,248,0) 45%)}
.esp.full .esp-coffee.cold .esp-glow,.esp.full .esp-coffee.cold .esp-chill{display:block}
.esp-steam{position:absolute;border-radius:50%;background:rgba(242,230,214,.32);filter:blur(10px);opacity:0;animation:esp-rise 3.6s ease-out infinite}
.esp-stream{position:absolute;left:calc(50% - 3px);top:0;width:6px;border-radius:3px;background:repeating-linear-gradient(to bottom,#3b1f10 0,#5a321a 10px,#2a150a 20px);box-shadow:0 0 6px rgba(201,139,79,.35);animation:esp-flow .5s linear infinite}
.esp-ripple{position:absolute;left:50%;width:60px;height:12px;margin-bottom:-6px;border-radius:50%;border:2px solid rgba(226,195,155,.6);animation:esp-ripple 1.1s ease-out infinite}
.esp-target{position:absolute;left:22px;right:22px;border-top:1px dashed rgba(226,195,155,.45)}
.esp-count{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-family:var(--serif,Georgia,serif);font-weight:700;font-size:140px;line-height:1;color:rgba(226,195,155,.18);animation:esp-pulse 1s ease-in-out infinite}
.esp-count.last{font-size:170px;color:rgba(226,195,155,.32)}
.esp-bar{position:absolute;top:50%;bottom:20%;width:24px;border-radius:12px;box-sizing:border-box;background:linear-gradient(to right,rgba(255,255,255,.06),rgba(0,0,0,.35) 40%,rgba(255,255,255,.04));border:1px solid rgba(242,230,214,.10);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),inset 0 0 12px rgba(0,0,0,.6)}
.esp-bar.l{left:6px}.esp-bar.r{right:6px}
.esp-led{position:absolute;left:5px;right:5px;top:6px;bottom:6px;border-radius:3px;background:repeating-linear-gradient(to top,rgba(242,230,214,.07) 0 6px,transparent 6px 9px)}
.esp-lit{position:absolute;inset:0;border-radius:3px;background:repeating-linear-gradient(to top,var(--lit) 0 6px,transparent 6px 9px);clip-path:inset(var(--clip) 0 0 0);filter:drop-shadow(0 0 4px var(--glow)) drop-shadow(0 0 10px var(--glow))}
.esp-cap{position:absolute;left:-2px;right:-2px;height:3px;margin-top:-1px;border-radius:2px;background:#fff;box-shadow:0 0 6px 2px var(--glow),0 0 18px 6px var(--glow)}
.esp-halo{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;background:radial-gradient(circle,var(--glow),transparent 65%);opacity:.28}
.esp-bar.l .esp-halo{left:12px}.esp-bar.r .esp-halo{left:12px}
.esp-bar .esp-lit,.esp-bar .esp-cap{opacity:.45}.esp-bar .esp-halo{opacity:.12}
.esp-bar.on .esp-lit,.esp-bar.on .esp-cap{opacity:1}.esp-bar.on .esp-halo{opacity:.28}
.esp.full .esp-bar .esp-lit,.esp.full .esp-bar .esp-cap{opacity:.6}
.esp.brew ~ .steam-cup,.esp.full ~ .steam-cup{opacity:0;transition:opacity 2s}
@keyframes esp-flow{from{background-position:0 0}to{background-position:0 40px}}
@keyframes esp-rise{0%{transform:translate(-50%,0) scale(.7);opacity:0}25%{opacity:.5}100%{transform:translate(-50%,-120px) scale(1.4);opacity:0}}
@keyframes esp-glow{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes esp-ripple{0%{transform:translateX(-50%) scale(.4);opacity:.9}100%{transform:translateX(-50%) scale(1.6);opacity:0}}
@keyframes esp-pulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.06)}}
`;
function ensureCss() {
  if (document.getElementById("espresso-css")) return;
  const s = document.createElement("style");
  s.id = "espresso-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}
const cup = (layer, scale, still) => effects.then((m) => { if (layer.isConnected) m.startEffect(layer, "smoke", scale, still); });
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const keepAwake = () => dispatchEvent(new Event("app-wake")); // the countdown and the pour shouldn't fall asleep halfway

// ---------- state (until reload) ----------
const S = { temp: 50, water: 50, touched: new Set(), phase: "idle", count: 10, pourStart: 0, pourDur: 0, brewTemp: 50 };
const target = () => 18 + S.water * 0.68; // % of the screen height the coffee reaches
let el = null, layerRef = null, tick = 0, raf = 0;

function build(layer) {
  layerRef = layer;
  const root = document.createElement("div");
  root.className = "esp";
  root.innerHTML = `
    <div class="esp-coffee"><div class="esp-crema"></div><div class="esp-rim"></div><div class="esp-glow"></div><div class="esp-chill"></div></div>
    <div class="esp-steams"></div>
    <div class="esp-pour" hidden><div class="esp-target"></div><div class="esp-stream"></div><div class="esp-ripple"></div></div>
    <div class="esp-count" hidden></div>
    <div class="esp-bar l"><div class="esp-led"><div class="esp-lit"></div><div class="esp-cap"></div></div><div class="esp-halo"></div></div>
    <div class="esp-bar r"><div class="esp-led"><div class="esp-lit"></div><div class="esp-cap"></div></div><div class="esp-halo"></div></div>`;
  layer.prepend(root); // before the cup (the cup fades away while brewing)
  const q = (s) => root.querySelector(s);
  el = { root, coffee: q(".esp-coffee"), steams: q(".esp-steams"), pour: q(".esp-pour"), target: q(".esp-target"), stream: q(".esp-stream"),
    ripple: q(".esp-ripple"), count: q(".esp-count"), barL: q(".esp-bar.l"), barR: q(".esp-bar.r") };
  render();
  if (S.phase === "pour") pourLoop();
  if (S.phase === "count") countLoop();
}
const alive = () => el && el.root.isConnected && layerRef && layerRef.dataset.fx === "espresso-bg";

function tempColors(t) {
  const h = (200 + t * 1.65) % 360; // blue → violet → magenta → red
  return [`hsl(${h} 95% 62%)`, `hsl(${h} 100% 60% / .75)`];
}
function setBar(bar, v, lit, glow) {
  const led = bar.firstElementChild, cap = led.children[1], halo = bar.children[1];
  bar.style.setProperty("--lit", lit); bar.style.setProperty("--glow", glow);
  bar.style.setProperty("--clip", (100 - v) + "%");
  cap.style.top = (100 - v) + "%";
  halo.style.top = `calc(6px + (100% - 12px) * ${(100 - v) / 100})`;
}
function level() {
  if (S.phase === "full") return target();
  if (S.phase !== "pour") return 0;
  return target() * Math.min(1, (performance.now() - S.pourStart) / S.pourDur);
}
function render() {
  if (!el) return;
  const [tl, tg] = tempColors(S.temp);
  setBar(el.barL, S.temp, tl, tg);
  setBar(el.barR, S.water, "hsl(198 90% 70%)", "hsl(198 100% 65% / .45)");
  el.barL.classList.toggle("on", S.touched.has("temp"));
  el.barR.classList.toggle("on", S.touched.has("water"));
  const brewing = S.phase === "pour" || S.phase === "full";
  el.root.classList.toggle("brew", S.phase === "pour");
  el.root.classList.toggle("full", S.phase === "full");
  el.coffee.classList.toggle("hot", brewing && S.brewTemp > 66);
  el.coffee.classList.toggle("cold", brewing && S.brewTemp < 33);
  const lv = level();
  el.coffee.style.height = lv + "%";
  el.pour.hidden = S.phase !== "pour";
  if (S.phase === "pour") {
    el.target.style.bottom = target() + "%";
    el.stream.style.bottom = lv + "%";
    el.ripple.style.bottom = lv + "%";
  }
  // steam on a hot, full cup
  const wantSteam = S.phase === "full" && S.brewTemp > 66 && !reduced();
  if (wantSteam && !el.steams.firstChild) {
    for (const [x, w, h, d] of [[38, 70, 46, 0], [58, 90, 56, 1.2], [24, 60, 40, 2.3], [76, 64, 42, 0.6]]) {
      const s = document.createElement("i");
      s.className = "esp-steam";
      s.style.cssText = `left:${x}%;bottom:${lv}%;width:${w}px;height:${h}px;animation-delay:${d}s`;
      el.steams.appendChild(s);
    }
  } else if (!wantSteam) el.steams.innerHTML = "";
  el.count.hidden = S.phase !== "count";
  if (S.phase === "count") { el.count.textContent = S.count; el.count.classList.toggle("last", S.count <= 3); }
}

// ---------- countdown and pour ----------
function countLoop() {
  clearTimeout(tick);
  tick = setTimeout(() => {
    if (S.phase !== "count") return;
    S.count--;
    keepAwake();
    if (S.count <= 0) startPour(); else countLoop();
    render();
  }, 1000);
}
function startCount() {
  S.phase = "count"; S.count = 10;
  countLoop();
}
function startPour() {
  S.phase = "pour"; S.brewTemp = S.temp;
  S.pourStart = performance.now();
  S.pourDur = Math.max(3000, (target() / 6) * 1000); // about 6% of the screen a second
  if (reduced()) { S.phase = "full"; render(); return; }
  keepAwake();
  pourLoop();
}
function pourLoop() {
  cancelAnimationFrame(raf);
  let lastWake = performance.now();
  const frame = (now) => {
    if (S.phase !== "pour") return;
    if (now - S.pourStart >= S.pourDur) { S.phase = "full"; render(); return; }
    if (now - lastWake > 4000) { keepAwake(); lastWake = now; }
    if (alive()) render();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

// ---------- touch: taps and slides on the empty background ----------
// Only on the main screen, never on cards, buttons, inputs, menus or dialogs; slides there still scroll.
const NOT_BG = "button, a, input, textarea, select, label, summary, dialog, [role=button], [role=menuitem], [contenteditable], .card, li, header, .tabs, .pins, .banner-occ, .pop-menu, .fab";
function isBackground(t) {
  if (!(t instanceof Element) || t.closest(NOT_BG)) return false;
  if (document.querySelector("dialog[open], .pop-menu")) return false;
  const f = document.activeElement;
  if (f && f.matches && f.matches("input, textarea, select, [contenteditable]")) return false;
  const app = document.getElementById("view-app");
  return !!(app && !app.hidden);
}
let drag = null;
function valueAt(bar, y) {
  const r = bar.getBoundingClientRect(), top = r.top + 7, h = r.height - 14;
  return Math.round(Math.max(0, Math.min(100, ((top + h - y) / h) * 100)));
}
function setFrom(key, y) {
  S[key] = valueAt(key === "temp" ? el.barL : el.barR, y);
  S.touched.add(key);
  if (S.touched.size === 2) startCount(); // both set: (re)start the countdown from 10
  render();
}
function onDown(e) {
  if (!alive()) return unlisten();
  if (S.phase === "pour" || S.phase === "full" || !isBackground(e.target)) return;
  const key = e.clientX < innerWidth / 2 ? "temp" : "water";
  drag = { id: e.pointerId, key };
  setFrom(key, e.clientY);
}
function onMove(e) {
  if (!drag || e.pointerId !== drag.id || !alive()) return;
  setFrom(drag.key, e.clientY);
}
function onUp(e) { if (drag && e.pointerId === drag.id) drag = null; }
function onTouchMove(e) { if (drag) e.preventDefault(); } // a slide on the background moves the bar, not the page
let listening = false;
function listen() {
  if (listening) return;
  listening = true;
  addEventListener("pointerdown", onDown, true);
  addEventListener("pointermove", onMove, true);
  addEventListener("pointerup", onUp, true);
  addEventListener("pointercancel", onUp, true);
  addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
}
function unlisten() {
  listening = false; drag = null;
  removeEventListener("pointerdown", onDown, true);
  removeEventListener("pointermove", onMove, true);
  removeEventListener("pointerup", onUp, true);
  removeEventListener("pointercancel", onUp, true);
  removeEventListener("touchmove", onTouchMove, { capture: true });
}

let ctx = null; // set while signed in (start/stop)

export const pacote = {
  back(layer) {
    ensureCss();
    build(layer);
    cup(layer, 1, reduced());
    listen();
  },
  front(layer, scale, still) {
    if (scale < 1) cup(layer, scale, still); // the tema preview: just the cup
  },
  tap() {}, // handled on pointerdown (a tap sets the bar of that half)
  start(c) { ctx = c; },
  stop() { ctx = null; },
  rest() {},
};
