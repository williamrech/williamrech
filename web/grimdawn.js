// ⚔️ Grim Dawn pack (occasion effect). Loaded only when the effect is on, so nobody else downloads it.
// Background: ash falling and a few embers rising. Tapping empty background does one of:
//  • a loot explosion: items fly out, land with their names in rarity colors, then vanish;
// Tapping the empty background drops loot; riftgates open on their own in the back, above the ＋ button.
// Item sprites are Flare's 3D-rendered loot art (CC-BY-SA, see img/CREDITS.txt); names come from the game's
// Brazilian Portuguese community translation.

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
let seq = 0;

// ---------- Styles (injected once) ----------
const CSS = `
.gd-ash { position: absolute; top: -10px; border-radius: 45% 55% 40% 60%; background: #bdb6ad; pointer-events: none;
  animation: gd-ash-fall linear infinite; will-change: transform; }
@keyframes gd-ash-fall {
  0% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(var(--sway), 27vh) rotate(90deg); }
  50% { transform: translate(calc(var(--sway) * -0.4), 54vh) rotate(200deg); }
  75% { transform: translate(var(--sway), 81vh) rotate(290deg); }
  100% { transform: translate(0, 108vh) rotate(380deg); }
}
.gd-ember { position: absolute; bottom: -8px; border-radius: 50%; background: #c8ffe0; pointer-events: none;
  box-shadow: 0 0 4px 1px #46ff9a, 0 0 10px 2px rgba(70, 255, 154, .35); opacity: 0; will-change: transform, opacity; }
@keyframes gd-ember-rise {
  0% { transform: translate(0, 0); opacity: 0; }
  10% { opacity: 1; } 30% { opacity: .55; } 45% { opacity: .95; } 70% { opacity: .5; }
  100% { transform: translate(var(--sway), -70vh); opacity: 0; }
}
.gd-fx { position: absolute; pointer-events: none; }
.gd-far { position: fixed; left: 0; top: 0; width: 0; height: 0; pointer-events: none; }
.gd-far .gd-rift { mix-blend-mode: screen; opacity: .8; filter: drop-shadow(0 0 10px var(--glow)) drop-shadow(0 0 24px var(--glow)); }
.gd-far canvas.gd-riftgl { position: absolute; pointer-events: none; mix-blend-mode: screen; }
.gd-far .gd-soot { position: absolute; border-radius: 50%; pointer-events: none;
  background: radial-gradient(closest-side, rgba(0,0,0,.85) 35%, rgba(0,0,0,.5) 65%, transparent 100%); }
.gd-portal { position: absolute; border-radius: 50%; overflow: hidden;
  -webkit-mask-image: radial-gradient(closest-side, #000 62%, transparent 100%); mask-image: radial-gradient(closest-side, #000 62%, transparent 100%); }
.gd-portal i { position: absolute; inset: -25%; border-radius: 50%; }
.gd-portal .core { inset: 0; background: radial-gradient(closest-side, #000 0, rgba(0,0,0,.92) 28%, rgba(0,0,0,.35) 55%, transparent 75%); }
.gd-rim { position: absolute; border-radius: 50%; }
.gd-mote { position: absolute; width: 3px; height: 3px; border-radius: 50%; }
.gd-item { position: absolute; width: 0; height: 0; display: grid; place-items: center; will-change: transform; }
.gd-item img { display: block; filter: drop-shadow(0 2px 2px rgba(0, 0, 0, .65)); }
.gd-ground { position: absolute; width: 44px; height: 14px; border-radius: 50%; opacity: 0; }
.gd-ground.pool { filter: blur(3px); mix-blend-mode: screen; }
.gd-twinkle { position: absolute; width: 9px; height: 9px; margin: -4px 0 0 -4px; opacity: 0; filter: drop-shadow(0 0 3px currentColor); }
.gd-twinkle svg { width: 100%; height: 100%; display: block; }
.gd-bit { position: absolute; width: 6px; height: 5px; margin: -3px 0 0 -3px; background: linear-gradient(135deg, #c9c9c4, #6d6d6a);
  border-radius: 30% 60% 40% 50%; box-shadow: 0 1px 1px rgba(0,0,0,.7); }
.gd-label { position: absolute; transform: translateX(-50%); white-space: nowrap; font: 400 13.5px/1.2 "GD Fell", Georgia, "Times New Roman", serif;
  padding: 1px 7px 2px; color: var(--c); opacity: 0; letter-spacing: .02em; text-shadow: 0 1px 0 #000;
  background: color-mix(in srgb, var(--c) 9%, rgba(0, 0, 0, .72)); border: 0; }
.gd-label .dia { font-style: normal; font-size: 9px; margin-right: 6px; vertical-align: 1px; text-shadow: 0 0 4px var(--c); }
.gd-beam { position: absolute; transform-origin: 50% 100%; mix-blend-mode: screen;
  -webkit-mask-image: linear-gradient(to top, #000 0, rgba(0,0,0,.6) 40%, transparent 100%); mask-image: linear-gradient(to top, #000 0, rgba(0,0,0,.6) 40%, transparent 100%); }
.gd-glow { position: absolute; border-radius: 50%; }
.gd-flash { position: absolute; border-radius: 50%; }
`;
function ensureCss() {
  if (document.getElementById("gd-css")) return;
  const s = document.createElement("style");
  s.id = "gd-css";
  s.textContent = CSS + RIFT_CSS;
  document.head.appendChild(s);
}

// ---------- Ash & embers ----------
export function startAsh(layer, scale = 1) {
  ensureCss();
  ensureSkin();
  const k = Math.max(scale, 0.5);
  for (let i = 0; i < Math.round(30 * scale) + 4; i++) {
    const a = document.createElement("i");
    a.className = "gd-ash";
    const w = rnd(2, 5.5) * k, light = Math.random() < 0.3;
    a.style.cssText = `left:${rnd(0, 100)}%;width:${w}px;height:${w * rnd(0.55, 0.9)}px;opacity:${rnd(0.25, 0.6).toFixed(2)};`
      + `background:${light ? "#d8d2c9" : pick(["#8f8981", "#a39d95", "#6f6a64"])};--sway:${rnd(-30, 30) * scale}px;`
      + `animation-duration:${rnd(11, 20) / Math.max(scale, 0.6)}s;animation-delay:${rnd(-20, 0)}s`;
    layer.appendChild(a);
  }
  for (let i = 0; i < Math.round(14 * scale) + 1; i++) setTimeout(() => ember(layer, k), rnd(0, 3000));
}
// One fire speck: random size and brightness, rises a short way while its path jinks left and right,
// flickers, and goes out. Then another one starts somewhere else.
function ember(layer, k) {
  if (!layer.isConnected) return;
  if (document.hidden) { setTimeout(() => ember(layer, k), 1500); return; }
  const e = document.createElement("i");
  e.className = "gd-ember";
  const big = Math.random() < 0.15;
  const w = (big ? rnd(3, 4.5) : rnd(1.3, 2.6)) * k, peak = rnd(0.5, 1);
  const hot = Math.random() < 0.35; // a few burn almost white, most are green
  e.style.cssText = `left:${rnd(3, 97)}%;width:${w}px;height:${w}px;background:${hot ? "#eafff3" : pick(["#9dffc9", "#6ff2a8", "#4fd98c"])}`;
  layer.appendChild(e);
  const life = rnd(1100, 2800), rise = innerHeight * rnd(0.06, 0.24);
  const steps = 4 + Math.floor(rnd(0, 3)), frames = [];
  let x = 0, vx = rnd(-14, 14);
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    if (i) { if (Math.random() < 0.55) vx = rnd(-22, 22); x += vx * rnd(0.6, 1.4); } // change course mid-flight
    const fl = i === 0 ? 0 : i === steps ? 0 : peak * rnd(0.45, 1);              // flicker
    frames.push({ transform: `translate(${x.toFixed(1)}px, ${(-rise * (1 - Math.pow(1 - f, 1.6))).toFixed(1)}px) scale(${(1 - f * 0.6).toFixed(2)})`, opacity: fl, offset: f });
  }
  frames[1].opacity = peak;
  e.animate(frames, { duration: life, easing: "linear", fill: "both" }).onfinish = () => {
    e.remove();
    setTimeout(() => ember(layer, k), rnd(100, 1400));
  };
}

// ---------- The look: a dark backdrop + the app restyled like the game's UI ----------
// No painted scene (drawn cities looked cheap). Instead: near-black with grain, a vignette and a faint aether
// glow from below; cards like item tooltips (bronze-rimmed, square), iron-plate buttons and tabs, an engraved
// serif, rarity-colored titles (purple = for you, yellow = running, grey = ended), deadlines as draining bars.
const FONT = (f) => new URL(`fonts/${f}`, import.meta.url).href;
const GRAIN = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .9 0"/></filter><rect width="180" height="180" filter="url(#n)"/></svg>`);
const SKIN_CSS = () => `
@font-face { font-family: "GD Cinzel"; src: url("${FONT("cinzel.woff")}") format("woff"); font-weight: 400 900; font-display: swap; }
@font-face { font-family: "GD Fell"; src: url("${FONT("fell.woff")}") format("woff"); font-display: swap; }
.gd-backdrop { position: absolute; inset: 0; pointer-events: none; }
.gd-backdrop .glow { position: absolute; inset: 0; background:
  radial-gradient(90% 70% at 50% 40%, transparent 40%, rgba(0, 0, 0, .55) 100%);
  animation: gd-breathe 7s ease-in-out infinite; will-change: opacity; }
@keyframes gd-breathe { 0%, 100% { opacity: .8; } 50% { opacity: 1; } }
.gd-backdrop .grain { position: absolute; inset: 0; background-image: url("${GRAIN}"); background-size: 180px; opacity: .07; mix-blend-mode: overlay; }
.gd-backdrop .mist { position: absolute; left: -30%; right: -30%; bottom: -10%; height: 45%; filter: blur(30px); opacity: .22; will-change: transform;
  background: radial-gradient(40% 50% at 30% 60%, color-mix(in srgb, #46ff9a 30%, var(--bg)), transparent 70%), radial-gradient(35% 45% at 75% 70%, color-mix(in srgb, #46ff9a 22%, var(--bg)), transparent 70%);
  animation: gd-mist 38s ease-in-out infinite alternate; }
@keyframes gd-mist { from { transform: translateX(-4%); } to { transform: translateX(4%); } }
@media (prefers-reduced-motion: reduce) { .gd-backdrop .glow, .gd-backdrop .mist { animation: none; } }

body.gd-skin #decor { display: none; } /* theme drawings (coffee beans…) don't belong here */
body.gd-skin #banner { text-wrap: balance; }
body.gd-skin { --gd-bronze: #6e5832; --gd-bronze-l: #b8975a; --gd-gold: #e9d29a; --gd-text: #dcd6c8; }
/* Cards: item tooltips */
body.gd-skin .round { position: relative; border-radius: 3px; border: 1px solid var(--gd-bronze);
  background: linear-gradient(180deg, rgba(16, 18, 17, .93), rgba(7, 9, 8, .95));
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .9), inset 0 0 0 2px rgba(184, 151, 90, .13), 0 8px 22px rgba(0, 0, 0, .55);
  -webkit-backdrop-filter: none; backdrop-filter: none; }
body.gd-skin .round::before, body.gd-skin .round::after { content: ""; position: absolute; width: 9px; height: 9px; pointer-events: none; opacity: .8; }
body.gd-skin .round::before { top: 4px; left: 4px; border-top: 1px solid var(--gd-bronze-l); border-left: 1px solid var(--gd-bronze-l); }
body.gd-skin .round::after { bottom: 4px; right: 4px; border-bottom: 1px solid var(--gd-bronze-l); border-right: 1px solid var(--gd-bronze-l); }
body.gd-skin .round-title { font-family: "GD Fell", Georgia, serif; font-size: 1.14rem; letter-spacing: .01em; color: #f3d64e; text-shadow: 0 1px 1px #000; }
body.gd-skin .round.ask .round-title { color: #c08cff; text-shadow: 0 0 10px rgba(178, 92, 255, .35), 0 1px 1px #000; }
body.gd-skin .round.closed { opacity: .75; }
body.gd-skin .round.closed .round-title { color: #9c9a94; text-shadow: none; }
body.gd-skin .round-body { color: var(--gd-text); }
body.gd-skin .round-emoji { filter: grayscale(.85) sepia(.45) contrast(1.1) brightness(.9); }
body.gd-skin .round .answers b { color: #f3d64e; }
/* Iron-plate buttons */
body.gd-skin .round .actions button.secondary, body.gd-skin .round .actions .preview-opt {
  border-radius: 2px; border: 1px solid #4a4e4b; color: #ddd6c6;
  background: linear-gradient(180deg, #2f3331, #191b1a 60%, #121413);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08), inset 0 -2px 0 rgba(0, 0, 0, .55), 0 1px 0 rgba(0, 0, 0, .6);
  font-family: "GD Cinzel", Georgia, serif; font-weight: 700; letter-spacing: .05em; }
body.gd-skin .round .actions button.secondary:active { border-color: #46ff9a; box-shadow: inset 0 0 10px rgba(70, 255, 154, .25); }
body.gd-skin .round .actions .preview-opt { opacity: .55; border-style: dashed; }
/* Tabs: an iron bar; the open tab is a bronze-rimmed plate */
body.gd-skin .tabs { border-radius: 3px; border: 1px solid #3c3221; background: linear-gradient(180deg, #121413, #090a0a); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04); }
body.gd-skin .tab { border-radius: 2px; font-family: "GD Cinzel", Georgia, serif; font-weight: 700; letter-spacing: .08em; color: #8d877a; }
body.gd-skin .tab.selected { color: var(--gd-gold); background: linear-gradient(180deg, #2b2519, #16130d);
  box-shadow: inset 0 0 0 1px var(--gd-bronze), inset 0 1px 0 rgba(255, 230, 170, .12), 0 0 12px rgba(233, 210, 154, .06); }
/* Section heads with a bronze rule */
body.gd-skin .feed-head { display: flex; align-items: center; gap: 10px; font-family: "GD Cinzel", Georgia, serif; color: var(--gd-bronze-l); letter-spacing: .14em; }
body.gd-skin .feed-head::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, var(--gd-bronze), transparent); }
/* Header: the day's line engraved, the name chip a nameplate */
body.gd-skin #topbar h1 { font-family: "GD Cinzel", Georgia, serif; font-style: normal; font-size: .86rem; letter-spacing: .1em; color: var(--gd-bronze-l); }
body.gd-skin .me-chip { border-radius: 2px; border: 1px solid var(--gd-bronze); background: linear-gradient(180deg, #1b1d1c, #0b0c0c);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .8), inset 0 1px 0 rgba(255, 230, 170, .08); }
body.gd-skin .me-chip .uname { font-family: "GD Fell", Georgia, serif; }
/* Banner: quest text between two bronze rules */
body.gd-skin #occ-card.banner-occ { background: none; border: 0; box-shadow: none; }
body.gd-skin #banner { font-family: "GD Fell", Georgia, serif; font-style: italic; color: #d8cfb8; position: relative; padding: 8px 6px; }
body.gd-skin #banner::before, body.gd-skin #banner::after { content: ""; display: block; height: 1px; margin: 0 18%;
  background: linear-gradient(90deg, transparent, var(--gd-bronze-l), transparent); }
body.gd-skin #banner::before { margin-bottom: 8px; } body.gd-skin #banner::after { margin-top: 8px; }
/* Deadline: a thin draining bar under the time left */
body.gd-skin .round .deadline { position: relative; padding-bottom: 6px; color: var(--gd-text); }
body.gd-skin .round .deadline[style]::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 3px; border-radius: 1px;
  background: linear-gradient(90deg, #8fd9a8 calc(var(--left) * 100%), rgba(255, 255, 255, .08) 0); box-shadow: 0 0 0 1px rgba(0, 0, 0, .6); }
body.gd-skin .round .deadline.urgent[style]::after { background: linear-gradient(90deg, #e2463a calc(var(--left) * 100%), rgba(255, 255, 255, .08) 0); }
/* The + : a riveted iron disc with an aether glow */
body.gd-skin .fab { border-radius: 50%; color: #aaffd0; border: 2px solid var(--gd-bronze);
  background: radial-gradient(circle at 35% 30%, #4b504d, #1b1d1c 70%);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, .65), 0 6px 18px rgba(0, 0, 0, .6), 0 0 18px rgba(70, 255, 154, .22); text-shadow: 0 0 8px rgba(70, 255, 154, .7); }
/* Toasts: the game's yellow warning text on black */
body.gd-skin #toast { border-radius: 2px; background: rgba(0, 0, 0, .88); border: 1px solid var(--gd-bronze); color: #f3d64e; font-family: "GD Fell", Georgia, serif; font-size: .98rem; }
`;
function ensureSkin() {
  if (document.getElementById("gd-skin-css")) return;
  const st = document.createElement("style"); st.id = "gd-skin-css"; st.textContent = SKIN_CSS(); document.head.appendChild(st);
}
// ---------- The bottom of the screen: Malmouth burning ----------
// The skyline rows (below), the app's fog engine tinted for rolling smoke, and aether lightning far away.
const BOTTOM_CSS = `
.gd-storm { position: absolute; inset: 0; opacity: 0; pointer-events: none; background: radial-gradient(90% 55% at 62% 0, rgba(150, 255, 205, .55), transparent 70%); }
body.gd-skin .fog-strip { filter: blur(14px); }
body.gd-skin .fog-strip path { fill: color-mix(in srgb, #3fe08c 20%, #0b0f0d); }
body.gd-skin .haunt-fog { opacity: .25 !important; }
`;
// ---------- Malmouth skyline ----------
// The user's own painted strips, three of each: cathedral (back), residential (middle), industrial (front).
// Each app open picks one strip per row, a zoom, a slice and maybe a mirror, then it stays put.
// Numbers per strip: natural width, height, and the x range whose ground is solid (so a slice never has gaps).
const CITY = {"gd-city-c1":[1406,307,4,1385],"gd-city-r1":[1740,252,15,1736],"gd-city-i1":[1698,288,17,1667],"gd-city-c2":[1522,313,12,1514],"gd-city-r2":[1616,292,6,1601],"gd-city-i2":[1651,301,2,1648],"gd-city-i3":[1648,316,2,1645],"gd-city-r3":[1644,293,1,1642],"gd-city-c3":[1643,284,1,1641]};
const CITY_CSS = `
.gd-city { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.gd-city .row { position: absolute; left: 0; right: 0; overflow: hidden; }
.gd-city .row img { position: absolute; top: 0; max-width: none; user-select: none; -webkit-user-drag: none; }
.gd-city .seam { position: absolute; left: 0; width: 100%; mix-blend-mode: screen; }
.gd-city .seam.still { background: radial-gradient(ellipse 60% 70% at 50% 100%, rgba(80, 255, 170, .35), rgba(40, 200, 130, .14) 45%, transparent 75%); }
.gd-city .sky { position: absolute; left: -20%; right: -20%; bottom: 14vh; height: 52vh; mix-blend-mode: screen;
  background: radial-gradient(ellipse 55% 60% at 50% 70%, rgba(60, 220, 150, .26), rgba(30, 150, 100, .1) 55%, transparent 80%); }
.gd-city .floor { position: absolute; left: 0; right: 0; bottom: 0; height: 9vh; background: linear-gradient(to top, rgba(6, 12, 10, .85), transparent); }
`;
function startCity(layer) {
  if (!document.getElementById("gd-city-css")) {
    const st = document.createElement("style"); st.id = "gd-city-css"; st.textContent = CITY_CSS; document.head.appendChild(st);
  }
  const vw = innerWidth, vh = innerHeight;
  const city = document.createElement("div");
  city.className = "gd-city";
  city.innerHTML = `<div class="sky"></div>`; // the burning sky glowing behind the cathedral
  // Back to front. Heights are fractions of the screen; the cathedral's top always reaches past half the screen.
  const rows = [
    { k: "c", h: rnd(0.32, 0.37), base: rnd(0.2, 0.24), tone: "brightness(1.02) saturate(.9) blur(.5px)" },
    { k: "r", h: rnd(0.26, 0.31), base: rnd(0.09, 0.12), tone: "brightness(.72) saturate(.95)" },
    { k: "i", h: rnd(0.21, 0.26), base: 0, tone: "brightness(.5) contrast(1.12)" },
  ];
  const c = rows[0];
  if (c.base + c.h < 0.53) c.h = 0.53 - c.base;
  if (c.base + c.h > 0.62) c.h = 0.62 - c.base;
  const seams = [];
  rows.forEach((r, i) => {
    const name = pick(Object.keys(CITY).filter((n) => n[8] === r.k)), [w, h, x0, x1] = CITY[name];
    let H = r.h * vh, sc = H / h;
    if ((x1 - x0) * sc < vw) { sc = vw / (x1 - x0); H = h * sc; } // always wide enough: no gaps
    const off = x0 * sc + rnd(0, (x1 - x0) * sc - vw);
    const row = document.createElement("div");
    row.className = "row";
    const fade = i < 2 ? "-webkit-mask-image:linear-gradient(to top, transparent, #000 14%);mask-image:linear-gradient(to top, transparent, #000 14%);" : "";
    row.style.cssText = `bottom:${r.base * vh}px;height:${H}px;filter:${r.tone};${fade}${Math.random() < 0.5 ? "transform:scaleX(-1);" : ""}`;
    const img = new Image();
    img.src = new URL(`img/${name}.webp`, import.meta.url).href;
    img.alt = ""; img.decoding = "async";
    img.style.cssText = `left:${-off}px;width:${w * sc}px;height:${H}px`;
    row.appendChild(img);
    city.appendChild(row);
    r.H = H; r.el = row;
    // Between this row and the next one in front: a band of green fire, its foot hidden behind the front row.
    if (i < 2) {
      const next = rows[i + 1];
      const band = document.createElement("canvas");
      band.className = "seam";
      const bh = vh * 0.24, bottom = next.base * vh + next.h * vh * 0.12;
      band.style.cssText = `bottom:${bottom}px;height:${bh}px`;
      city.appendChild(band);
      seams.push(band); band.backRow = row; band.tone = r.tone;
    }
  });
  city.insertAdjacentHTML("beforeend", `<div class="floor"></div>`);
  layer.appendChild(city);
  if (!seamFire(seams, vw, vh * 0.24)) seams.forEach((b) => b.classList.add("still")); // no WebGL: a still glow
}

// Green fire burning between the rows: flames flickering up, now and then a flash of light, something bursting,
// or a distant lamp that sputters and goes out. One small GPU shader renders both bands at low resolution
// (fire is soft anyway) and they're copied onto their canvases, ~30 frames a second, paused when hidden.
const FIRE_FS = `precision mediump float;
uniform vec2 res; uniform float t, seed, aspect, flash, bx, bage, lx, ly, lamp;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int k = 0; k < 4; k++) { v += a*n(p); p = p*2.03 + 17.1; a *= .5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / res;
  float x = uv.x * aspect, y = uv.y;
  float patchy = smoothstep(.2, .8, n(vec2(x*.8 + seed, t*.07)));          // stronger and weaker stretches
  float base = .3 + .7*patchy;
  float f = fbm(vec2(x*3. + seed, y*2.2 - t*1.25)) * .7 + fbm(vec2(x*7.5 - seed, y*4.6 - t*2.3)) * .45;
  float flame = smoothstep(.06, .55, f - y*(1.3 - .55*base)) * base;
  float flick = .8 + .2*n(vec2(t*8., seed));
  vec3 col = mix(vec3(.02, .24, .15), vec3(.2, .95, .6), smoothstep(.08, .55, flame));
  col = mix(col, vec3(.86, 1., .93), smoothstep(.62, .95, flame));
  col *= flame * flick * 1.35;
  col += vec3(.08, .55, .34) * exp(-y*3.2) * (.3 + .45*base) * flick * .55;    // glow under the flames
  col += vec3(.45, 1., .75) * flash * (exp(-y*1.5)*1.2 + .2);                     // a flash of light
  if (bage >= 0.) {                                                            // something bursts
    vec2 d = vec2((uv.x - bx)*aspect, y - .42); float r2 = dot(d, d);
    float R = .08 + sqrt(bage)*.7, k = 1. - bage;
    col += (vec3(1., 1., .94)*exp(-r2/(R*R*.08)) * 2. + vec3(.3, 1., .62)*exp(-r2/(R*R)) * 1.1) * k*k;
    col += vec3(.25, .9, .55) * k*k*k * .35;                                     // its light washes the whole band
  }
  vec2 dl = vec2((uv.x - lx)*aspect, y - ly); float l2 = dot(dl, dl);         // a distant lamp
  col += vec3(.78, 1., .72) * lamp * (exp(-l2*5000.) * 1.5 + exp(-l2*300.) * .45);
  col *= smoothstep(1., .62, y) * smoothstep(0., .16, y);   // soft at both edges, never a line
  float a = clamp(max(col.r, max(col.g, col.b)), 0., 1.);
  gl_FragColor = vec4(min(col, vec3(a)), a);
}`;
const lightUp = (band, steps, ms) => {
  const row = band.backRow; if (!row) return;
  row.animate(steps.map(([o, b]) => ({ offset: o, filter: `${band.tone} brightness(${b})` })), { duration: ms, easing: "ease-out" });
};
function seamFire(bands, w, bh) {
  if (!bands.length) return true;
  const Q = 0.5, cw = Math.round(w * Q), ch = Math.round(bh * Q);
  const glc = document.createElement("canvas");
  glc.width = cw; glc.height = ch;
  const gl = glc.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return false;
  const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null; };
  const vs = sh(gl.VERTEX_SHADER, "attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }"), fs = sh(gl.FRAGMENT_SHADER, FIRE_FS);
  if (!vs || !fs) return false;
  const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; for (const k of ["res", "t", "seed", "aspect", "flash", "bx", "bage", "lx", "ly", "lamp"]) U[k] = gl.getUniformLocation(pr, k);
  gl.uniform2f(U.res, cw, ch); gl.uniform1f(U.aspect, w / bh);
  gl.viewport(0, 0, cw, ch);
  const S = bands.map((c, i) => {
    c.width = cw; c.height = ch;
    return { band: c, ctx: c.getContext("2d"), seed: rnd(0, 90) + i * 37, flash: null, burst: null, lamp: { x: rnd(0.1, 0.9), y: rnd(0.38, 0.55), next: performance.now() + rnd(1000, 6000), on: 0, phase: "off" } };
  });
  const now0 = performance.now();
  // Events.
  const FLASH = [[0, 0], [0.05, 1], [0.16, 0.12], [0.26, 0.75], [0.45, 0.18], [1, 0]];
  const env = (k) => { for (let i = 1; i < FLASH.length; i++) if (k <= FLASH[i][0]) { const [a, va] = FLASH[i - 1], [b, vb] = FLASH[i]; return va + (vb - va) * (k - a) / (b - a); } return 0; };
  let nextFlash = now0 + rnd(4000, 9000), nextBurst = now0 + rnd(7000, 14000);
  const lampLevel = (L, t) => {
    if (t < L.next) return L.on;
    if (L.phase === "off") { L.phase = "on"; L.x = rnd(0.08, 0.92); L.y = rnd(0.38, 0.55); L.t0 = t; L.next = t + rnd(6000, 12000); }
    else if (L.phase === "on") { L.phase = "sputter"; L.t0 = t; L.next = t + rnd(1400, 2400); }
    else { L.phase = "off"; L.next = t + rnd(3000, 9000); }
    return L.on;
  };
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let last = 0;
  const frame = (t) => {
    if (!bands[0].isConnected) { const lose = gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext(); return; }
    if (!still) requestAnimationFrame(frame);
    if (document.hidden || t - last < 32) return;
    last = t;
    if (t > nextFlash) {
      const s = pick(S); s.flash = t; nextFlash = t + rnd(6000, 16000);
      lightUp(s.band, [[0, 1], [0.05, 2.1], [0.16, 1.15], [0.26, 1.8], [0.45, 1.2], [1, 1]], 750); // lightning shows the buildings
    }
    if (t > nextBurst) {
      const s = pick(S); s.burst = { t0: t, x: rnd(0.1, 0.9) }; nextBurst = t + rnd(9000, 22000);
      lightUp(s.band, [[0, 1], [0.08, 1.6], [1, 1]], 1600);
    }
    for (const s of S) {
      const fk = s.flash == null ? 1 : (t - s.flash) / 750;
      const fl = fk >= 0 && fk < 1 ? env(fk) * 0.8 : 0;
      if (fk >= 1) s.flash = null;
      let bage = -1;
      if (s.burst) { bage = (t - s.burst.t0) / 1600; if (bage > 1) { s.burst = null; bage = -1; } }
      const L = s.lamp; lampLevel(L, t);
      if (L.phase === "on") L.on = Math.min(1, (t - L.t0) / 400) * (0.9 + 0.1 * Math.random());
      else if (L.phase === "sputter") { const k = (t - L.t0) / (L.next - L.t0); L.on = Math.random() < 0.55 - k * 0.45 ? rnd(0.5, 1) * (1 - k * 0.5) : rnd(0, 0.12); }
      else L.on = 0;
      gl.uniform1f(U.t, (t - now0) / 1000); gl.uniform1f(U.seed, s.seed); gl.uniform1f(U.flash, fl);
      gl.uniform1f(U.bx, s.burst ? s.burst.x : 0); gl.uniform1f(U.bage, bage);
      gl.uniform1f(U.lx, L.x); gl.uniform1f(U.ly, L.y); gl.uniform1f(U.lamp, L.on);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      s.ctx.clearRect(0, 0, cw, ch);
      s.ctx.drawImage(glc, 0, 0);
    }
  };
  requestAnimationFrame(frame);
  return true;
}

export function startScene(layer, helpers = {}) {
  ensureSkin();
  if (!document.getElementById("gd-bottom-css")) {
    const st = document.createElement("style"); st.id = "gd-bottom-css"; st.textContent = BOTTOM_CSS; document.head.appendChild(st);
  }
  layer.insertAdjacentHTML("beforeend", `<div class="gd-backdrop"><div class="glow"></div><div class="grain"></div><div class="gd-storm"></div></div>`);
  const storm = layer.querySelector(".gd-storm");
  startCity(layer);
  if (helpers.fog) helpers.fog(); // rolling smoke strips (pushed by swipes, swelling on scroll)
  // Aether lightning, far off: a double flash every so often.
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const strike = () => {
      if (!storm.isConnected) return;
      if (!document.hidden) storm.animate([{ opacity: 0 }, { opacity: 0.55, offset: 0.08 }, { opacity: 0.08, offset: 0.2 }, { opacity: 0.4, offset: 0.3 }, { opacity: 0 }], { duration: 900, easing: "ease-out" });
      setTimeout(strike, rnd(9000, 24000));
    };
    setTimeout(strike, rnd(5000, 10000));
  }
}

// ---------- Tap ----------
export function grimTap(x, y, layer, force) { // every tap drops loot; force (tests only): { lucky: 0..1 }
  ensureCss();
  if (!force && layer.querySelectorAll(".gd-fx").length >= 4) return; // don't pile up
  loot(x, y, layer, force && force.lucky);
}
// Rifts open on their own and take the ＋ button's place for a while: purple riftgate, green aether-fire
// riftgate or red chthonic tear, all the same size. The ＋ fades out underneath and stays tappable.
export function startRifts(layer) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  ensureCss();
  const spot = document.createElement("div");
  spot.className = "gd-far";
  layer.appendChild(spot);
  const open = () => {
    if (!spot.isConnected) return;
    const fab = document.getElementById("fab");
    const r = fab && fab.getBoundingClientRect();
    const cx = r && r.left + r.width / 2, cy = r && r.top + r.height / 2;
    const shown = r && r.width > 0 && fab.contains(document.elementFromPoint(cx, cy));
    if (!document.hidden && !spot.firstChild && shown) {
      const x = Math.random(), kind = x < 0.4 ? "purple" : x < 0.7 ? "green" : "red";
      spot.style.setProperty("--glow", { purple: "rgba(155, 61, 240, .75)", green: "rgba(60, 240, 150, .7)", red: "rgba(190, 40, 20, .7)" }[kind]);
      spot.style.left = `${cx}px`; spot.style.top = `${r.bottom - 46}px`; // stands where the ＋ stood
      const hold = rnd(5000, 10000), total = RIFT_OPEN + hold + RIFT_CLOSE;
      rift(spot, kind, hold);
      fab.animate([
        { opacity: 1, transform: "scale(1)" },
        { opacity: 0, transform: "scale(.4)", offset: (RIFT_OPEN * 0.7) / total },
        { opacity: 0, transform: "scale(.4)", offset: (RIFT_OPEN + hold + RIFT_CLOSE * 0.4) / total },
        { opacity: 1, transform: "scale(1)" },
      ], { duration: total, easing: "ease-in-out" });
    }
    setTimeout(open, rnd(20000, 40000));
  };
  setTimeout(open, rnd(4000, 9000));
}

function box(layer, x, y) {
  const g = document.createElement("div");
  g.className = "gd-fx";
  g.style.cssText = `left:${x}px;top:${y}px;width:0;height:0`;
  layer.appendChild(g);
  return g;
}
const el = (parent, cls, css, html) => {
  const n = document.createElement(cls === "svg" ? "div" : "i");
  if (cls !== "svg") n.className = cls;
  if (css) n.style.cssText = css;
  if (html) n.innerHTML = html;
  parent.appendChild(n);
  return n;
};

// Riftgates as they sit in the game: a flat ellipse on the ground seen in perspective, a wide sooty halo
// smudging the ground around it, and a vortex of light swirling in the middle. All light and blur, no outlines.
const RIFT_CSS = `
.gd-rift { position: absolute; left: 0; top: 0; pointer-events: none; }
.gd-rift .salt { position: absolute; border-radius: 50%; transform: scaleY(.32); border-style: dotted; filter: blur(.5px); }
.gd-rift .pit { position: absolute; border-radius: 50%; transform: scaleY(.32); filter: blur(6px); }
.gd-rift .body { position: absolute; border-radius: 50%; transform-origin: 50% 100%;
  -webkit-mask-image: radial-gradient(closest-side, #000 54%, rgba(0,0,0,.45) 78%, transparent 100%);
  mask-image: radial-gradient(closest-side, #000 54%, rgba(0,0,0,.45) 78%, transparent 100%); }
.gd-rift .body i { position: absolute; inset: -18%; border-radius: 50%; display: block; }
.gd-rift .swirl { will-change: transform; animation: gd-spin 2.6s linear infinite; filter: blur(2px); }
.gd-rift .swirl.slow { animation-duration: 5.4s; animation-direction: reverse; filter: blur(5px); }
.gd-rift .hole { inset: 26%; filter: blur(3px); }
.gd-rift .hot { inset: 26%; filter: blur(6px); mix-blend-mode: screen; animation: gd-hot 1.9s ease-in-out infinite alternate; }
.gd-rift .rim { position: absolute; border-radius: 50%; filter: blur(3px); transform-origin: 50% 100%; }
@keyframes gd-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes gd-hot { from { opacity: .5; } to { opacity: 1; } }
.gd-spark { position: absolute; width: 3px; height: 3px; margin: -1.5px 0 0 -1.5px; border-radius: 50%; }
`;
function riftColors(kind) {
  if (kind === "purple") return { hot: "#e7c2ff", mid: "#9b3df0", dim: "#3d0a72", rim: "rgba(214, 160, 255, .8)", spark: "#ffd27a" };
  if (kind === "green") return { hot: "#b6ffe4", mid: "#19c79a", dim: "#06352c", rim: "rgba(150, 255, 200, .8)", spark: "" };
  return { hot: "#ff7a42", mid: "#c4240f", dim: "#450904", rim: "rgba(255, 120, 70, .75)", spark: "" }; // the small chthonic tear
}
// An upright oval of swirling light standing on the ground; a riftgate also has a ring of salt poured flat
// around its foot. The layer's own point is where it meets the ground. Opens, holds, closes.
export function rift(layer, kind, hold = 3400) {
  if (riftGL(layer, kind, hold)) return;
  const c = riftColors(kind), red = kind === "red";
  const W = red ? rnd(22, 30) : rnd(74, 92);          // width of the oval
  const H = red ? W * rnd(3.4, 4.1) : W * 1.5;        // upright: taller than wide
  const g = document.createElement("div");
  g.className = "gd-rift gd-fx";
  layer.appendChild(g);
  const add = (cls, css, html = "") => {
    const n = document.createElement(cls === "salt" || cls === "pit" || cls === "rim" ? "div" : "div");
    n.className = cls; n.style.cssText = css; n.innerHTML = html; g.appendChild(n); return n;
  };
  // The ground: a scorched smudge, and for a riftgate the ring of salt around the foot.
  const sw = W * 2.1;
  const pit = add("pit", `left:${-sw / 2}px;top:${-sw / 2}px;width:${sw}px;height:${sw}px;background:radial-gradient(closest-side, rgba(0,0,0,.85) 30%, rgba(0,0,0,.45) 60%, transparent 85%)`);
  let salt = null;
  if (!red) {
    const rw = W * 1.9;
    salt = add("salt", `left:${-rw / 2}px;top:${-rw / 2}px;width:${rw}px;height:${rw}px;border-width:${Math.max(2.5, W * 0.045)}px;border-color:rgba(238, 232, 214, .9);opacity:0`);
  }
  // The oval of light, standing on that point.
  const body = add("body", `left:${-W / 2}px;top:${-H * 0.9}px;width:${W}px;height:${H}px`);
  const arms = (n) => {
    let st = "";
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 100;
      st += `, transparent ${a0}%, ${c.dim} ${a0 + 2}%, ${c.mid} ${a0 + 6}%, ${c.hot} ${a0 + 9}%, ${c.mid} ${a0 + 13}%, ${c.dim} ${a0 + 18}%, transparent ${a0 + 24}%`;
    }
    return `conic-gradient(from 0deg${st})`;
  };
  const inner = (cls, css) => { const n = document.createElement("i"); n.className = cls; n.style.cssText = css; body.appendChild(n); };
  inner("swirl slow", `background:${arms(2)};opacity:.55`);
  inner("swirl", `background:${arms(3)};opacity:.95`);
  inner("hole", `background:radial-gradient(closest-side, #000 38%, rgba(0,0,0,.62) 64%, transparent 90%);opacity:.6`);
  inner("hot", `background:radial-gradient(closest-side, ${c.hot}, color-mix(in srgb, ${c.mid} 60%, transparent) 45%, transparent 75%)`);
  const rim = add("rim", `left:${-W / 2}px;top:${-H * 0.9}px;width:${W}px;height:${H}px;border:1px solid ${c.rim};box-shadow:0 0 14px 3px ${c.rim}, inset 0 0 18px 4px ${c.rim};opacity:${red ? 0.4 : 0.5}`);
  // Gold motes drifting off a riftgate.
  if (c.spark) for (let i = 0; i < 9; i++) {
    const sp = document.createElement("i");
    sp.className = "gd-spark";
    sp.style.cssText = `background:${c.spark};box-shadow:0 0 5px 1px ${c.spark};opacity:0`;
    g.appendChild(sp);
    const ang = rnd(0, 6.283), r0 = W * rnd(0.3, 0.7);
    sp.animate([
      { transform: `translate(${Math.cos(ang) * r0}px, ${-H * 0.45 + Math.sin(ang) * r0}px)`, opacity: 0 },
      { opacity: 1, offset: 0.25 },
      { transform: `translate(${Math.cos(ang) * r0 * 1.4}px, ${-H * 0.45 + Math.sin(ang) * r0 - rnd(20, 50)}px)`, opacity: 0 },
    ], { duration: rnd(1600, 2600), delay: 500 + rnd(0, hold), easing: "ease-out", fill: "both" });
  }
  // Open: the salt is poured, the oval grows up out of the ground. Then it holds, then it shuts.
  const OPEN_MS = 650, CLOSE_MS = 700, TOTAL = OPEN_MS + hold + CLOSE_MS;
  const t1 = OPEN_MS / TOTAL, t2 = (OPEN_MS + hold) / TOTAL;
  for (const n of [body, rim]) {
    n.animate([
      { transform: "scale(.1, .02)", opacity: 0 },
      { transform: "scale(1.05, 1.03)", opacity: 1, offset: t1 * 0.8 },
      { transform: "scale(1)", opacity: 1, offset: t1 },
      { transform: "scale(1)", opacity: 1, offset: t2 },
      { transform: "scale(.06, .02)", opacity: 0 },
    ], { duration: TOTAL, easing: "ease-in-out", fill: "both" });
  }
  pit.animate([{ opacity: 0 }, { opacity: 1, offset: t1 }, { opacity: 1, offset: t2 }, { opacity: 0 }], { duration: TOTAL, fill: "both" });
  if (salt) salt.animate([
    { opacity: 0, transform: "scaleY(.32) scale(.5)" },
    { opacity: .85, transform: "scaleY(.32) scale(1)", offset: t1 },
    { opacity: .85, offset: t2 },
    { opacity: 0 },
  ], { duration: TOTAL, easing: "ease-out", fill: "both" });
  setTimeout(() => g.remove(), TOTAL + 200);
}

// The riftgate as the game draws it: a narrow upright tear of smoky light, swirling around a hot magenta
// core, ragged dark edges, standing on a scorched patch with gold motes. Drawn by a small GPU shader
// (pure light, no outlines). Returns false where WebGL isn't available, and the CSS version runs instead.
const RIFT_FS = `precision highp float;
uniform vec2 res; uniform float t, o, fade; uniform vec3 cHot, cMid, cDim; uniform vec2 sz; uniform float foot, gold, dpr, fire; uniform vec3 cSpeck;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int k = 0; k < 5; k++) { v += a*n(p); p = p*2.03 + 17.1; a *= .5; } return v; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 ctr = vec2(res.x*.5, foot + sz.y*.5);
  vec2 q = (px - ctr) / (sz*.5);               // the oval is the unit circle here
  q /= max(o, .02);                            // grows open from nothing
  float r = length(q);
  // Vortex: the texture turns faster near the middle, and is warped by itself so it reads as smoke.
  vec2 w = rot(t*1.1 + 1.7*(1. - r)) * q;
  vec2 wp = vec2(w.x*2.8, w.y*.95);
  vec2 warp = vec2(fbm(wp*1.6 + t*.35), fbm(wp*1.6 - t*.3 + 4.));
  float sm = fbm(wp*2.4 + warp*1.8 - vec2(0., t*.6));
  float wisp = fbm(rot(-t*.7 + 1.6*(1. - r))*q*3.1 + warp);
  // Ragged edge.
  float fl = fbm(vec2(q.x*3.2, q.y*1.4 - t*2.4)) * fbm(vec2(q.x*4.2 + 3., q.y*2.2 - t*3.4));
  float rr = r - fire * fl * 1.6 * smoothstep(-.6, 1.1, q.y);     // tongues of fire lick up off the top
  float edge = 1. - smoothstep(.62, 1., rr + (fbm(q*2.7 + t*.5) - .5)*.55);
  // Hot core: a vertical streak, brightest low in the middle.
  float streak = exp(-q.x*q.x*14.) * smoothstep(1., .1, abs(q.y + .15));
  float core = exp(-r*r*3.2);
  vec3 col = cDim * edge * 1.4;
  col += cMid * edge * smoothstep(.35, .8, sm) * 1.6;
  col += cHot * edge * (streak*.9 + core*.5) * (.55 + .7*sm);
  col *= mix(.25, 1.1, smoothstep(.3, .65, wisp));
  col += fire * cHot * edge * smoothstep(.45, .75, fl*1.8) * smoothstep(-.2, .8, q.y) * .6;  // bright flame cores   // dark smoke threads through it
  // Soft halo of light around the tear.
  float hr = max(r - .8, 0.); col += cMid * .2 * exp(-hr*hr*9.) * (1. - edge*.6);
  // A ring of glimmers around it, where the button's rim was, each twinkling on its own.
  for (int k = 0; k < 16; k++) {
    float fk = float(k), a = fk/16.*6.2832 + h(vec2(fk, 3.))*.3;
    vec2 sp = ctr + vec2(cos(a)*sz.x*1.05, sin(a)*sz.y*.6) * (.92 + .16*h(vec2(fk, 9.)));
    float d = length(px - sp) / dpr;
    float tw = .35 + .65*smoothstep(.2, .9, n(vec2(fk*7.3, t*1.7)));
    col += gold * cSpeck * exp(-d*d*.35) * tw * 1.3 * o;
  }
  vec2 uv = px / res; col *= fade * smoothstep(0., .12, uv.x) * smoothstep(1., .88, uv.x) * smoothstep(0., .08, uv.y) * smoothstep(1., .85, uv.y);
  float a = clamp(max(col.r, max(col.g, col.b)), 0., 1.);
  gl_FragColor = vec4(min(col, vec3(a)), a);
}`;
const RIFT_OPEN = 700, RIFT_CLOSE = 650;
const RIFT_GL_COL = {
  purple: { hot: [1.0, 0.55, 1.0], mid: [0.62, 0.2, 1.0], dim: [0.2, 0.03, 0.42] },
  red: { hot: [1.0, 0.62, 0.3], mid: [0.85, 0.16, 0.05], dim: [0.3, 0.03, 0.01] },
  green: { hot: [0.66, 1.0, 0.8], mid: [0.18, 0.92, 0.58], dim: [0.02, 0.3, 0.22] },
};
function riftGL(layer, kind, hold) {
  const red = kind === "red";
  // All three the same size, standing in for the ＋ button; the layer's point is the portal's centre.
  const W = 44, H = 92; // keep H in step with startRifts (r.bottom - H / 2)
  const CW = Math.round(W * 3.2), footY = H * 0.4, CH = Math.round(footY + H * (kind === "green" ? 1.75 : 1.45));
  const cv = document.createElement("canvas");
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr);
  cv.className = "gd-riftgl";
  cv.style.cssText = `left:${-CW / 2}px;top:${-(CH - footY - H / 2)}px;width:${CW}px;height:${CH}px`;
  const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return false;
  const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null; };
  const vs = sh(gl.VERTEX_SHADER, "attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }");
  const fs = sh(gl.FRAGMENT_SHADER, RIFT_FS);
  if (!vs || !fs) return false;
  const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (k) => gl.getUniformLocation(pr, k);
  const col = RIFT_GL_COL[kind] || RIFT_GL_COL.purple;
  gl.uniform2f(U("res"), cv.width, cv.height);
  gl.uniform2f(U("sz"), W * dpr, H * dpr);
  gl.uniform1f(U("foot"), footY * dpr); gl.uniform1f(U("gold"), 1); gl.uniform1f(U("fire"), kind === "green" ? 1 : 0); gl.uniform3fv(U("cSpeck"), kind === "green" ? [0.55, 1, 0.75] : red ? [1, 0.55, 0.3] : [1, 0.78, 0.38]); gl.uniform1f(U("dpr"), dpr);
  gl.uniform3fv(U("cHot"), col.hot); gl.uniform3fv(U("cMid"), col.mid); gl.uniform3fv(U("cDim"), col.dim);
  const uT = U("t"), uO = U("o"), uF = U("fade");
  // A scorched patch under it (drawn normally, so it darkens what's behind).
  const soot = document.createElement("div");
  soot.className = "gd-soot";
  const sw = W * 2.3, shh = H * 1.25;
  soot.style.cssText = `left:${-sw / 2}px;top:${-shh / 2}px;width:${sw}px;height:${shh}px;opacity:0`;
  layer.appendChild(soot); layer.appendChild(cv);
  // Gold motes drifting up off a riftgate.
  const motes = [];
  for (let i = 0; i < 10; i++) {
    const sp = document.createElement("i");
    sp.className = "gd-spark";
    sp.style.cssText = kind === "green" ? "background:#d6ffe8;box-shadow:0 0 5px 1px #3cf096;opacity:0;mix-blend-mode:screen"
      : red ? "background:#ffb07a;box-shadow:0 0 5px 1px #ff5a20;opacity:0;mix-blend-mode:screen"
      : "background:#ffd27a;box-shadow:0 0 5px 1px #ffb640;opacity:0;mix-blend-mode:screen";
    layer.appendChild(sp); motes.push(sp);
    const a = rnd(0, 6.283), x0 = Math.cos(a) * W * 1.05, y0 = Math.sin(a) * H * 0.6;
    sp.animate([
      { transform: `translate(${x0}px, ${y0}px)`, opacity: 0 },
      { opacity: 1, offset: 0.3 },
      { transform: `translate(${x0 * 1.15}px, ${y0 - rnd(25, 60)}px)`, opacity: 0 },
    ], { duration: rnd(1400, 2400), delay: 400 + rnd(0, hold), easing: "ease-out", fill: "both" });
  }
  const OPEN_MS = RIFT_OPEN, CLOSE_MS = RIFT_CLOSE, TOTAL = OPEN_MS + hold + CLOSE_MS;
  soot.animate([{ opacity: 0 }, { opacity: 0.7, offset: OPEN_MS / TOTAL }, { opacity: 0.7, offset: (OPEN_MS + hold) / TOTAL }, { opacity: 0 }], { duration: TOTAL, fill: "both" });
  const t0 = performance.now(), seed = rnd(0, 50);
  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  const frame = (now) => {
    const e = now - t0;
    if (e > TOTAL || !cv.isConnected) {
      cv.remove(); soot.remove(); motes.forEach((m) => m.remove());
      const lose = gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
      return;
    }
    let o, f;
    if (e < OPEN_MS) { o = ease(e / OPEN_MS); f = Math.min(1, e / (OPEN_MS * 0.6)); }
    else if (e < OPEN_MS + hold) { o = 1 + Math.sin(e / 380) * 0.015; f = 1; }
    else { const k = (e - OPEN_MS - hold) / CLOSE_MS; o = 1 - ease(k) * 0.97; f = 1 - k; }
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uT, seed + e / 1000); gl.uniform1f(uO, o); gl.uniform1f(uF, f);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return true;
}

function flash(g, size, color, delay) {
  const f = el(g, "gd-flash", `left:${-size / 2}px;top:${-size / 2}px;width:${size}px;height:${size}px;background:radial-gradient(closest-side, ${color}, transparent);opacity:0`);
  f.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "scale(1)", offset: 0.25 }, { opacity: 0, transform: "scale(1.3)" }],
    { duration: 520, delay, easing: "ease-out", fill: "both" });
}

// ---------- Loot ----------
// Rarity colors (names on the ground, like the game's labels).
const COLOR = {
  broken: "#8a8a86", common: "#ece8e0", magic: "#f3d64e", rare: "#3fe35a", epic: "#52b4f2", legendary: "#b25cff",
  iron: "#a7a7a3", recipe: "#f3b878", component: "#ee8f35", rareComponent: "#efe4b4",
};
// Names from the game's Brazilian Portuguese translation (community localization), by tier:
// base = common, mi = monster infrequent (green), epic (blue), legendary (purple); affixes [m, f, mp, fp].
const N = {"base":[["Punhal","ms","sword"],["Gládio","ms","sword"],["Navalha","fs","sword"],["Espada Curta","fs","sword"],["Talhadora","fs","sword"],["Espada Longa","fs","sword"],["Espada Larga","fs","sword"],["Carniceira","fs","sword"],["Sabre de Abordagem","ms","sword"],["Mutiladora","fs","sword"],["Lâmina Cruel","fs","sword"],["Serra-de-osso","fs","sword"],["Conquistadora","fs","sword"],["Sabre","ms","sword"],["Clava","fs","mace"],["Maça Redonda","fs","mace"],["Maça","fs","mace"],["Maça Flangeada","fs","mace"],["Maço","ms","mace"],["Estrela da Manhã","fs","mace"],["Cassetete","ms","mace"],["Maça Afiada","fs","mace"],["Porrete","ms","mace"],["Martelo de Guerra","ms","mace"],["Maça de Guerra","fs","mace"],["Machado do Lenhador","ms","axe"],["Lâmina Serrilhada","fs","axe"],["Machadinha","fs","axe"],["Machado Duplo","ms","axe"],["Cutelo","ms","axe"],["Machado Afiado","ms","axe"],["Machado de Batalha","ms","axe"],["Machado Crescente","ms","axe"],["Machado Pesado","ms","axe"],["Machado Farpado","ms","axe"],["Pistola Bacamarte","fs","pistol"],["Howdah","fs","pistol"],["Revólver Pimenteiro","ms","pistol"],["Canhão de Mão","ms","pistol"],["Revólver","ms","pistol"],["Revólver de Seis Tiros","ms","pistol"],["Derringer","fs","pistol"],["Repetidora","fs","pistol"],["Revólver com Luneta","ms","pistol"],["Arma Multicano","fs","pistol"],["Mosquete","ms","pistol"],["Rifle de Pederneira","ms","pistol"],["Rifle de Ferrolho","ms","pistol"],["Bacamarte","ms","pistol"],["Rifle Giratório","ms","pistol"],["Rifle de Repetição","ms","pistol"],["Carabina","fs","pistol"],["Rifle de Retrocarga","ms","pistol"],["Canhão Giratório","ms","pistol"],["Espingarda","fs","pistol"],["Espingarda de Combate","fs","pistol"],["Montante","ms","axe"],["Espada de Guerra","fs","axe"],["Espadão","ms","axe"],["Espada Flamígera","fs","axe"],["Machado Grande","ms","axe"],["Machado de Guerra","ms","axe"],["Gadanha","fs","axe"],["Alabarda","fs","axe"],["Malho","ms","axe"],["Marreta","fs","axe"],["Malho de Guerra","ms","axe"],["Escudo de Tábuas","ms","shield"],["Broquel","ms","shield"],["Escudo Redondo","ms","shield"],["Escudo Aquecedor","ms","shield"],["Escudo Torre","ms","shield"],["Escudo Anti-tumulto","ms","shield"],["Escudo de Guerra","ms","shield"],["Égide","fs","shield"],["Tarja","fs","shield"],["Rondache","ms","shield"],["Escudo Pipa","ms","shield"],["Tomo Mofado","ms","scepter"],["Tomo com Capa de Carne","ms","scepter"],["Arquivo com Capa Rúnica","ms","scepter"],["Tomo Sobrenatural","ms","scepter"],["Códice Arcano","ms","scepter"],["Códice Excelso","ms","scepter"],["Osso com Runas","ms","scepter"],["Efígie Demoníaca","fs","scepter"],["Chifre Gravado","ms","scepter"],["Crânio com Glifos","ms","scepter"],["Efígie Selvagem","fs","scepter"],["Efígie Sobrenatural","fs","scepter"],["Efígie Excelsa","fs","scepter"],["Elmo","ms","helm"],["Boina","fs","helm"],["Capacete","ms","helm"],["Máscara","fs","helm"],["Coifa","fs","helm"],["Bacinete","ms","helm"],["Borguinhota","fs","helm"],["Chapéu","ms","helm"],["Semblante","ms","helm"],["Gorro","ms","helm"],["Capuz","ms","helm"],["Testeira","fs","helm"],["Diadema","ms","helm"],["Coroa","fs","helm"],["Espaldares","mp","chest"],["Manto","ms","chest"],["Guarda-ombros","mp","chest"],["Dragonas","fp","chest"],["Placas de Ombros","fp","chest"],["Brafoneiras","fp","chest"],["Roupa","fs","chest"],["Cinta de Tecido","fs","chest"],["Cordão Entrelaçado","ms","chest"],["Faixa de Pele","fs","chest"],["Cinto de Couro","ms","chest"],["Cinto de Corrente","ms","chest"],["Cinta de Infantaria","fs","chest"],["Cinturão de Placas","ms","chest"],["Cinta de Assalto","fs","chest"],["Cinto Imperial","ms","chest"],["Cinto Excelso","ms","chest"],["Luvas","fp","gloves"],["Avambraços","mp","gloves"],["Manoplas","fp","gloves"],["Punhos","mp","gloves"],["Protetores de Mão","mp","gloves"],["Calças","fp","chest"],["Perneiras","fp","chest"],["Envoltório de Pernas","ms","chest"],["Culotes","mp","chest"],["Calções","mp","chest"],["Guarda-pernas","mp","chest"],["Pisantes","mp","boots"],["Botas","fp","boots"],["Grevas","fp","boots"],["Escarpes","mp","boots"],["Botinas","fp","boots"],["Aliança de Cobre","fs","ring"],["Aliança de Prata","fs","ring"],["Aliança de Ouro","fs","ring"],["Aliança com Platina","fs","ring"],["Anel com Ametista","ms","ring"],["Aliança com Pedra Lunar","fs","ring"],["Sinete com Opala","ms","ring"],["Anel com Esmeralda","ms","ring"],["Aliança com Safira","fs","ring"],["Sinete com Topázio","ms","ring"],["Anel com Rubi","ms","ring"],["Aliança Inscrita","fs","ring"],["Sinete com Diamante","ms","ring"],["Anel Imperial","ms","ring"],["Aliança de Obsidiana","fs","ring"],["Sinete Imperial","ms","ring"],["Saco de Sal","ms","amulet"],["Fetiche de Garra","ms","amulet"],["Amuleto de Prata","ms","amulet"],["Fetiche de Crânio","ms","amulet"],["Amuleto de Platina","ms","amulet"],["Patuá de Osso","ms","amulet"],["Amuleto com Pedra Lunar","ms","amulet"],["Pingente com Opala","ms","amulet"],["Colar com Esmeralda","ms","amulet"],["Amuleto com Safira","ms","amulet"],["Pingente com Topázio","ms","amulet"],["Colar com Rubi","ms","amulet"],["Amuleto Inscrito","ms","amulet"],["Pingente com Diamante","ms","amulet"],["Colar Imperial","ms","amulet"],["Amuleto com Obsidiana","ms","amulet"],["Pingente Imperial","ms","amulet"],["Fita","fs","amulet"],["Emblema","ms","amulet"],["Marca","fs","amulet"],["Timbre","ms","amulet"],["Estrela","fs","amulet"],["Timbre Imperial","ms","amulet"],["Estrela Imperial","fs","amulet"]],"mi":[["Lâmina Soberana de Salazar","sword"],["Espada Larga Espectral","sword"],["Espada Longa Espectral","sword"],["Espada Longa Afiada","sword"],["Espada Larga Afiada","sword"],["Conquistadora Afiada","sword"],["Lâmina Pavorosa de Malkadarr","sword"],["Espada Longa Mantícora","sword"],["Talhadora-de-osso","sword"],["Lâmina-de-osso","sword"],["Garra Dermáptera","sword"],["Fatiadora Dermáptera","sword"],["Lâmina do Senhor do Sangue","sword"],["Tocha","mace"],["Veredito do Carcereiro","mace"],["Juízo do Carcereiro","mace"],["Esmagadora de Ossos Troll","mace"],["Trituradora de Ossos Troll","mace"],["Estrela da Manhã Espectral","mace"],["Porrete Espectral","mace"],["Quebradora de Crânios de Kilrian","mace"],["Tocha de Skinner","mace"],["Maça Afiada do Adepto","mace"],["Estrela da Manhã do Adepto","mace"],["Maça Flangeada do Adepto","mace"],["Arma Mutante","mace"],["Porrete Mutante","mace"],["Cutelo Espectral","axe"],["Machado de Batalha Espectral","axe"],["Machado do Mestre Gladiador","axe"],["Cutelo-de-osso","axe"],["Gadanha-de-osso","axe"],["Machado de Olman","axe"],["Cutelo Deformado pelo Éter","axe"],["Pistola de Cano Duplo","pistol"],["Morteiro de Mão","pistol"],["Pistola de Metralha","pistol"],["Pistola Jurassangue","pistol"],["Repetidor Jurassangue","pistol"],["Arma de Francis","pistol"],["Rifle Rotativo","pistol"],["Rifle de Antecarga","pistol"],["Rifle de Metralha","pistol"],["Rifle Carnedisforme","pistol"],["Carabina Carnedisforme","pistol"],["Conflagrador Carnedisforme","pistol"],["Incinerador Carnedisforme","pistol"],["Esmagador de Cabeças Troll","axe"],["Triturador de Crânios Troll","axe"],["Machado Grande Brutal","axe"],["Talhador Brutal","axe"],["Decapitador Brutal","axe"],["Gadanha de Alkamos","axe"],["Machado de Guerra Espectral","axe"],["Espada de Guerra de Alkamos","axe"],["Malho de Guerra Espectral","axe"],["Malho de Guerra do Arconte","axe"],["Rachacrânio Obsidiano","axe"],["Cutelo de Guerra Obsidiano","axe"],["Montante de Hevill","axe"],["Baluarte do Carcereiro","shield"],["Fortaleza do Carcereiro","shield"],["Escudo Espectral","shield"],["Escudo de Guerra Espectral","shield"],["Escudo de Batalha","shield"],["Escudo de Cerco","shield"],["Escudo Soberano","shield"],["Muralha-de-osso Trog","shield"],["Muralha-de-osso Vampírica","shield"],["Guarda Obsidiana","shield"],["Baluarte Obsidiano","shield"],["Escudo Carnedisforme","shield"],["Baluarte Carnedisforme","shield"],["Códice de Zarthuzellan","scepter"],["Tomo de Rolderathis","scepter"],["Efígie do Bruxo","scepter"],["Fragmento Pulsante","scepter"],["Tomo Jurassangue","scepter"],["Códice Jurassangue","scepter"],["Ídolo Tóxico Groble","scepter"],["Efígie Tóxica Groble","scepter"],["Chifre Yeti Lascado","scepter"],["Chifre Yeti","scepter"],["Ídolo Celeste Groble","scepter"],["Efígie Celeste Groble","scepter"],["Ídolo Pétreo Groble","scepter"],["Efígie Pétrea Groble","scepter"],["Ídolo Incandescente Groble","scepter"],["Efígie Incandescente Groble","scepter"],["Ídolo Mortífero Groble","scepter"],["Efígie Mortífera Groble","scepter"],["Olho Contemplador","scepter"],["Olho do Capataz","scepter"],["Osso Conjurante de Karvor","scepter"],["Elmo Incendiário","helm"],["Borguinhota Incendiária","helm"],["Elmo Ascendido","helm"],["Borguinhota Ascendida","helm"],["Coifa do Assassino","helm"],["Gorro do Assassino","helm"],["Capuz do Adepto","helm"],["Elmo do Patrulheiro","helm"],["Testeira do Adepto","helm"],["Borguinhota do Patrulheiro","helm"],["Testeira Ascendida","helm"],["Diadema Ascendido","helm"],["Elmo Carnedisforme","helm"],["Borguinhota Carnedisforme","helm"],["Coroa Espectral","helm"],["Borguinhota de Milton","helm"],["Espaldares Incendiários","chest"],["Placas de Ombros Incendiárias","chest"],["Espaldares Ascendidos","chest"],["Placas de Ombros Ascendidas","chest"],["Espaldares do Assassino","chest"],["Dragonas do Assassino","chest"],["Espaldares de Isaac","chest"],["Manto Assombrado","chest"],["Ombreiras Assombradas","chest"],["Manto Ascendido","chest"],["Dragonas Ascendidas","chest"],["Espaldares Carnedisformes","chest"],["Brafoneiras Carnedisformes","chest"],["Manto de Valdaran","chest"],["Guarda-ombros de Valdaran","chest"],["Guarda-ombros de Benn'Jahr","chest"],["Brafoneiras de Benn'Jahr","chest"],["Guarda-ombros de Moosilauke","chest"],["Brafoneiras de Moosilauke","chest"],["Manto da Donzela de Ferro","chest"],["Guarda-ombros da Donzela de Ferro","chest"],["Manto de Zantarin","chest"],["Guarda-ombros de Zantarin","chest"],["Guarda-ombros de Fabius","chest"],["Brafoneiras de Fabius","chest"],["Corrupção do Logorreano","chest"],["Armadura do Assassino","chest"],["Peitoral do Assassino","chest"],["Gibão Fortificado","chest"],["Agasalho Assombrado","chest"],["Vestimenta Assombrada","chest"],["Agasalho Ascendido","chest"],["Vestimenta Ascendida","chest"],["Couraça Carnedisforme","chest"],["Armadura de Placas Carnedisforme","chest"],["Capote Jurassangue","chest"],["Vestimenta Jurassangue","chest"],["Cinturão do Caçador de Recompensas","chest"],["Faixa da Onda de Choque","chest"],["Cinto do Belicista","chest"],["Faixa de Seda Flamejante","chest"],["Cinturão da Guarda da Geada","chest"],["Faixa de Osso de Espectro","chest"],["Correntes de Ygraad","chest"],["Correntes de Ordas","chest"],["Correntes de Brandis","chest"],["Luvas do Adepto","gloves"],["Manoplas do Escudeiro","gloves"],["Punhos do Adepto","gloves"],["Protetores de Mão do Escudeiro","gloves"],["Guarda-pernas da Seita de Dreeg","chest"],["Guarda-pernas da Seita de Solael","chest"],["Guarda-pernas da Seita de Bysmiel","chest"],["Botas do Adepto","boots"],["Botas do Escudeiro","boots"],["Grevas do Adepto","boots"],["Grevas do Escudeiro","boots"],["Anel de Recordação de Reddan","ring"],["Sinete de Cronley","ring"],["Selo da Família Skinner","ring"],["Anel de Gollus","ring"],["Sinete Jurassangue","ring"],["Anel de Viloth","ring"],["Colar Pútrido","amulet"],["Pingente Vigia da Morte","amulet"],["Colar de Ellena","amulet"],["Fita do Patrulheiro","amulet"],["Emblema do Patrulheiro","amulet"],["Escama de Ikrix","amulet"],["Emblema de Kymon","amulet"],["Signo Jurassangue","amulet"]],"epic":[["Espada Elétrica","sword"],["Mordida do Cão","sword"],["Presságio","sword"],["Loucura","sword"],["Talhadora Sanguinária","sword"],["Garra do Ceifador Sanguinário","sword"],["Sabre do Duelista","sword"],["Censora do Magistrado","sword"],["Estigma das Chamas","sword"],["Ladra de Almas","sword"],["Incêndio Gelado","sword"],["Espinhadora","sword"],["Vocação do Assassino","sword"],["Navalha do Assassino Cego","sword"],["Sabre do Busca-tempestade","sword"],["Navalha de Willie","sword"],["Sabre Sangrento","sword"],["Lamento do Éter","mace"],["Anarquia","mace"],["Toque de Malícia","mace"],["Martelo do Soldado da Guarda","mace"],["Varinha de Madeira Negra","mace"],["Martelo Sagrado da Ira Eterna","mace"],["Tocha Abençoada","mace"],["Esmagador de Espíritos","mace"],["Desafio","mace"],["Árbitra de Aço Etéreo","mace"],["Punho do Assassino Cego","mace"],["Malhete Quebra-ossos","mace"],["Mão Negra de Sanar'Siin","mace"],["Progenitora","mace"],["Repreensão da Guerra","mace"],["Malhete de Barthollem","mace"],["Redentora de Aço Gélido","mace"],["Gume Cruel","axe"],["Toque do Ceifador","axe"],["Banquete de Sangue","axe"],["Cutelo do Ceifador Sanguinário","axe"],["Gume da Tempestade","axe"],["Cutelo de Krieg","axe"],["Maleficus","axe"],["Serra Maldita da Glutonaria","axe"],["Mandíbula Sedenta","axe"],["Gume Imaterial","axe"],["Osso Entalhado das Mil Mortes","axe"],["Profanador de Cadáveres","axe"],["Chonag'Ri","axe"],["Cutelo de Asterkarn","axe"],["Fatiador das Garras Infernais","axe"],["Canhão de Mão de Leander Greene","pistol"],["Espreitadora de Bruxos","pistol"],["Revólver de Orwell","pistol"],["Fúria do Saqueador","pistol"],["Justiça do Saqueador","pistol"],["A Batedora","pistol"],["Revólver da Terceira Companhia","pistol"],["Motim","pistol"],["Vingança do Bandido","pistol"],["Atirador de Lodo","pistol"],["Esfolador de Almas","pistol"],["Revólver da Peste","pistol"],["A Mediadora","pistol"],["Cano Frígido do Implacável Norte","pistol"],["Pacificador de Burrwitch","pistol"],["Injetor do Boticário","pistol"],["Perjura","pistol"],["Esfolador de Cadáveres","pistol"],["Abrasa-terra","pistol"],["Perfuradora Gélida","pistol"],["O Caçador","pistol"],["O Olho","pistol"],["Espingarda da Mandíbula Infernal","pistol"],["Marca do Diabo","pistol"],["Vontade do Destino","pistol"],["O Atirador de Elite Escarlate","pistol"],["Atirador com Núcleo de Sal","pistol"],["Portador da Ira","pistol"],["Trovão","pistol"],["Rifle do Franco-atirador","pistol"],["Repetidor Sulfúreo","pistol"],["Repetidor Furiaço","pistol"],["Repetidor do Guardião das Chamas","pistol"],["Evisceradora Rasga-tripa","axe"],["Massacre","axe"],["Ruína dos Slith","axe"],["Garra do Falcão","axe"],["Tremor","axe"],["O Conduto","axe"],["Dilacerador Fragmósseo","axe"],["Malhete do Punho de Golem","axe"],["Lâmina da Ira","axe"],["A Libertadora do Sítio","axe"],["Repreensão de Alvarick","axe"],["Eviscerador Prismático","axe"],["Espada de Folhas Cortantes","axe"],["Gadanha de Tenebris","axe"],["Campeão da Luz","axe"],["Decapitador do Evocador Selvagem","axe"],["Fornalha de Shar'Zul","axe"],["Ira Lamentosa","axe"],["Eviscerador Estripa-troll","axe"],["Cutelo Abençoado de Mogdrogen","axe"],["Defensor do Cruzamento do Diabo","shield"],["Baluarte Devorador de Espíritos","shield"],["Defensor do Soldado da Guarda","shield"],["Rompe-chamas","shield"],["Sorriso do Diabo","shield"],["Mandíbula da Fera","shield"],["Timbre da Legião Negra","shield"],["Proteção do Lich","shield"],["Baluarte do Fragmento da Manhã","shield"],["Fé do Templário","shield"],["Escudo da Perdição","shield"],["Proteção do Perjuro","shield"],["Elementium","shield"],["Guarda de Ravna","shield"],["O Gladiador","shield"],["Árbitro Brasaguarda","shield"],["Vanguarda da Legião","shield"],["Guarda do Mirmidão","shield"],["Demência","scepter"],["Vontade Esmagadora","scepter"],["Tomo de Maiven","scepter"],["Tomo do Herege","scepter"],["Efígie Malformada","scepter"],["Lamento de Banshee","scepter"],["Garra de Serpe","scepter"],["Grimório Negro de Og'Napesh","scepter"],["Coça-costas de Edrick","scepter"],["Textos Sagrados de Menhir","scepter"],["Nocturnis","scepter"],["Orbe Canalizador do Pacto","scepter"],["Tomo das Pestes","scepter"],["Efígie do Evocador de Tempestades","scepter"],["Rebento da Tempestade","scepter"],["Arquivo do Abrasador","scepter"],["Tomo do Senhor da Morte","scepter"],["Códice de Callidor","scepter"],["Gorro do Berserker","helm"],["Coroa do Submundo","helm"],["Coroa do Comando","helm"],["Cimeira do Templário","helm"],["Elmo do Soldado da Guarda","helm"],["Capa do Explorador","helm"],["Capuz de Maiven","helm"],["Gorro do Ceifador Sanguinário","helm"],["Olho da Observadora","helm"],["Máscara do Delírio","helm"],["Tempestade do Vazio","helm"],["Glória do Cavaleiro de Prata","helm"],["Terror do Bosque","helm"],["Testeira Tece-espíritos","helm"],["Capuz Chispassombra","helm"],["Máscara do Arauto","helm"],["Guarda-rosto da Perdição","helm"],["Gorro do Assassino Cego","helm"],["Olho de Vidro do Franco-atirador","helm"],["Semblante Profano do Pacto","helm"],["Gorro do Paradigma","helm"],["Elmo da Guarda da Aurora","helm"],["Capuz do Miasma","helm"],["Olhos de Chama","helm"],["Gorro do Evocador Selvagem","helm"],["Guarda-rosto Pretoriano","helm"],["Coroa do Fragmento Gélido","helm"],["Testeira da Raiva Ardente","helm"],["Olhos do Ceifador","helm"],["Viseira do Mirmidão","helm"],["Gorro de Mogdrogen","helm"],["Borguinhota do Guardião Feérico","helm"],["O Triunvirato","helm"],["Manto Espinhoso de Costagume","chest"],["Manto Astral","chest"],["Espaldares do Senhor Guerreiro","chest"],["Espaldares do Soldado da Guarda","chest"],["Guarda-ombros do Granadeiro","chest"],["Manto do Olho Choroso","chest"],["Dragonas de Choque","chest"],["Brafoneiras Decoradas","chest"],["Manto do Patrono","chest"],["Guarda-ombros da Perdição","chest"],["Capa do Franco-atirador","chest"],["Manto Profano do Pacto","chest"],["Guarda-ombros do Paradigma","chest"],["Dragonas da Guarda da Aurora","chest"],["Guarda-ombros Sulfúreos","chest"],["Guarda-ombros Pretorianos","chest"],["Manto do Alquimista","chest"],["Manto Jubafria","chest"],["Brafoneiras Amarastanas","chest"],["Brafoneiras do Guardião das Chamas","chest"],["Manto de Callidor","chest"],["Espaldares de Mogdrogen","chest"],["Corselete do Caçador Noturno","chest"],["Jaqueta do Pistoleiro","chest"],["Veste de Malduin","chest"],["Peitoral Forjamaldita","chest"],["Peitoral do Soldado da Guarda","chest"],["Túnica do Explorador","chest"],["Casaco do Ceifador Sanguinário","chest"],["Sobretudo do Fanático","chest"],["Armadura de Carapaça Fundida","chest"],["Traje do Esfolador","chest"],["Couraça de Placas de Obsidiana","chest"],["Gabardina de Magnison","chest"],["Vestimenta do Luto","chest"],["Lorigão de Teia de Aranha","chest"],["Veste da Invocação Impronunciável","chest"],["Jaqueta do Arauto","chest"],["Corselete da Perdição","chest"],["Jaqueta Furtiva do Assassino Cego","chest"],["Casaco do Franco-atirador","chest"],["Armadura da Guarda da Aurora","chest"],["Armadura de Batalha de Zolhan","chest"],["Capote do Miasma","chest"],["Capote Oriental","chest"],["Peles do Evocador Selvagem","chest"],["Casaco do Falabravo","chest"],["Corselete Pretoriano","chest"],["Armadura de Batalha Forjacaótica","chest"],["Jaqueta do Guardião das Chamas","chest"],["Vestimenta de Callidor","chest"],["Corselete do Mirmidão","chest"],["Sobreveste de Mogdrogen","chest"],["Estabilizador de Oldenar","chest"],["Pacote Utilitário de Frizzick","chest"],["Cinto do Alquimista","chest"],["Cinto de Munições do Saqueador","chest"],["Glória do Chefe Guerreiro","chest"],["Troféu do Caçador de Cabeças","chest"],["Cordão do Acólito","chest"],["Faixa de Fios Ctônica","chest"],["Ligações Banhadas em Sangue","chest"],["Cordão do Ancestral","chest"],["Correntes da Angústia","chest"],["Bolsas do Franco-atirador","chest"],["Faixa Beira-céu","chest"],["Cinto do Assombrante","chest"],["Cinturão das Chamas Flagelantes","chest"],["Triunfo do Legionário","chest"],["Correntes Tocadas pela Tempestade","chest"],["Cinturão Litopele","chest"],["Correntes do Ata-almas","chest"],["Faixa de Fios Chamejantes","chest"],["Cinturão de Medotrama","chest"],["Faixa do Equilíbrio","chest"],["Cinturão do Guardião das Chamas","chest"],["Aperto das Sombras","gloves"],["Manoplas do Zelote","gloves"],["Punho do Cria-feitiços","gloves"],["Luvas do Saqueador","gloves"],["Toque da Alma","gloves"],["Braceletes Inscritos","gloves"],["Luvas do Briguento","gloves"],["Braceletes Rúnicos","gloves"],["Manoplas de Aço Negro","gloves"],["Mitenes do Toque da Seda","gloves"],["Luvas do Arauto","gloves"],["Toque do Boticário","gloves"],["Protetores de Mão da Perdição","gloves"],["Manoplas da Guarda da Aurora","gloves"],["Protetores de Mão Ardentes","gloves"],["Luvas do Saque Rápido","gloves"],["Luvas Orientais","gloves"],["Braceletes do Toque do Trovão","gloves"],["Aperto Obsidiano","gloves"],["Toque da Destruição","gloves"],["Aperto do Frio Pavoroso","gloves"],["Perneiras do Andarilho das Brumas","chest"],["Guarda-pernas do Eremita","chest"],["Calças do Explorador","chest"],["Calças Sujas","chest"],["Armadura de Pernas do Templário","chest"],["Coxotes do Valor","chest"],["Envoltório de Pernas Carnívoro","chest"],["Perneiras de Couro Sombrio","chest"],["Guarda-pernas Descomunais","chest"],["Guarda-pernas Orientais","chest"],["Perneiras da Guarda das Lâminas","chest"],["Envoltório de Pernas de Feititrama","chest"],["Botas Fundidas","boots"],["Grevas do Vento","boots"],["Botas da Rapidez Sobre-humana","boots"],["Racha-solos de Pedra","boots"],["Pisantes do Explorador","boots"],["Grevas do Cão Sanguinário","boots"],["A Marcha Final","boots"],["Botas de Couro de Cão Abissal","boots"],["Pisantes Couraçados","boots"],["Grevas do Desordeiro","boots"],["Ataduras Serpentinas","boots"],["Botinas do Profanador","boots"],["Botas Feitissábias","boots"],["Grevas do Senhor da Magia","boots"],["Aliança de Medula","ring"],["Selo com Obsidiana","ring"],["Aliança do Erudito","ring"],["Sinete do Crepúsculo","ring"],["Selo da Guarda Negra","ring"],["Fogo Estelar","ring"],["Selo de Sangue","ring"],["Sinete do Senhor Etéreo","ring"],["Aliança Eterna","ring"],["Oblitorix","ring"],["Aliança das Almas Errantes","ring"],["Sabedoria do Boticário","ring"],["Selo da Coroa Real","ring"],["Joia da Coroa Real","ring"],["Anel da Valentia","ring"],["Sinete da Valentia","ring"],["Mão Direita da Carnificina","ring"],["Mão Esquerda da Carnificina","ring"],["Aliança do Gelo Negro","ring"],["Anel da Intenção Torpe","ring"],["Anel da Onda de Frio","ring"],["Anel da Podridão Eterna","ring"],["Selo do Inferno Ardente","ring"],["Selo da Sentinela","ring"],["Gema da Aceleração","ring"],["Aliança Espinhosa","ring"],["Aliança do Brotar da Vida","ring"],["Sinete Colossal","ring"],["Signo dos Depravados","ring"],["Sinete dos Condenados","ring"],["Signo Mutagênico","ring"],["Signo Amarastano","ring"],["Esmeralda do Pacto Selvagem","ring"],["Signo da Tempestade Etérea","ring"],["Selo da Tempestade Etérea","ring"],["Rubi do Equilíbrio Elemental","ring"],["Safira do Equilíbrio Elemental","ring"],["Amuleto do Olho","amulet"],["Rubi de Alazra","amulet"],["Lua de Sangue","amulet"],["Patuá do Diabo","amulet"],["Lente de Maiven","amulet"],["Fragmento da Deformação","amulet"],["Orgulho do Mestre Guerreiro","amulet"],["Patuá da Pedra Espiritual","amulet"],["Pedra do Vórtice","amulet"],["Proteção contra a Morte","amulet"],["Essência de Beronath","amulet"],["Ruína de Nuram'Siin","amulet"],["Lapis Lupus","amulet"],["Avareza de Androneus","amulet"],["Proteção do Arauto","amulet"],["Olho do Assassino Cego","amulet"],["Pingente da Coroa Real","amulet"],["Pingente da Valentia","amulet"],["Necessidade Miserável","amulet"],["Gema do Evocador de Tempestades","amulet"],["Amuleto do Fragmento Infeccioso","amulet"],["Guarda da Donzela Escudeira","amulet"],["Núcleo Congelado","amulet"],["Amuleto da Terra Abrasada","amulet"],["Amuleto do Pestomante","amulet"],["Fragmento Cerúleo","amulet"],["Coragem Antilâmina","amulet"],["Fragmento de Menhir","amulet"],["Amuleto de Sarça","amulet"],["Gema Locustídea","amulet"],["Proteção Ancestral","amulet"],["Fragmento do Comando","amulet"],["Pingente da Alma","amulet"],["Amuleto da Lâmina Venenosa","amulet"],["Eclipse Arcano","amulet"],["Chama dos Justos","amulet"],["Armadilha de Gelo","amulet"],["Fragmento de Callidor","amulet"],["Esmeralda Vinculativa de Mogdrogen","amulet"],["Amuleto da Tempestade Etérea","amulet"],["Lapis Mantichora","amulet"],["Marca do Assassino de Feras","amulet"],["Emblema da Tenacidade","amulet"],["Insígnia da Justiça","amulet"],["Marca do Ceifador Sanguinário","amulet"],["Coração Carmesim","amulet"],["Marca do Médico de Combate","amulet"],["Marca do Templário","amulet"],["Signo Arcano","amulet"],["Estrela da Vanguarda","amulet"],["Emblema da Companhia Carmesim","amulet"],["Símbolo do Boticário","amulet"],["Signo Profano do Pacto","amulet"],["Fita da Valentia","amulet"],["Insígnia do Encantador","amulet"],["Signo do Herege","amulet"],["Signo da Tempestade","amulet"],["Marca dos Deuses Falsos","amulet"],["Selo Sangrento de Vermentranhas","amulet"],["Signo de Mogdrogen","amulet"],["Marca do Ilusionista","amulet"],["Estrela Negra do Engano","amulet"],["Marca da Ninfa","amulet"],["Estrela dos Céus Congelados","amulet"],["Volcanum","amulet"],["Marca da Vontade de Ferro","amulet"],["Estrela Venerada do Mirmidão","amulet"]],"legendary":[["Aguilhão Carmesim","sword"],["Crystallum","sword"],["Destino Sombrio","sword"],["Distorção Mental","sword"],["Beronath, a Reforjada","sword"],["Canção Sangrenta","sword"],["Nex","sword"],["Ortus","sword"],["Garra Marcada pela Morte","sword"],["Coração da Tempestade","sword"],["Garra do Rapinante","sword"],["Garra da Rainha Louca","sword"],["Navalha da Lâmina Peçonhenta","sword"],["Presságio de Morte","mace"],["Farol do Véu do Inverno","mace"],["Agonia","mace"],["Arauto dos Fins Chamejantes","mace"],["Portadora da Peste de Dreeg","mace"],["Marreta de Quebraurora","mace"],["Punho da Lâmina Peçonhenta","mace"],["Malhete da Guerra","mace"],["Carniceiro de Burrwitch","axe"],["Lua Crescente","axe"],["Brutallax","axe"],["Rachador de Terra","axe"],["Condenação","axe"],["Decapitador Marcado pela Morte","axe"],["Língua do Diabo","pistol"],["Estrago","pistol"],["Exoneradora","pistol"],["Exterminus","pistol"],["Arcanum Sigillis","pistol"],["Revólver do Causamortis","pistol"],["Saraivada do Armeiro","pistol"],["Fogo Cruzado do Armeiro","pistol"],["O Adversário","pistol"],["A Hora dos Bruxos","pistol"],["Cria do Inferno","pistol"],["Vórtice de Almas","pistol"],["Ranca-tripa","pistol"],["Espalha-chamas de Ulzuin","pistol"],["Rifle de Valdun","pistol"],["Repreensão do Punho de Pedra","axe"],["A Guilhotina","axe"],["Alcance da Beladona","axe"],["Força Destruidora de Obsidiana","axe"],["Enxofre Infernal","axe"],["Ladrão de Tempestades","axe"],["Ruína do Rei do Inverno","axe"],["Arcolâmina Temporal","axe"],["Trituradora do Sangue Selvagem","axe"],["Busca-tempestade de Ultos","axe"],["Leviatã","axe"],["Dilaceradora de Almas","axe"],["Devorador de Mundos de Shar'Zul","axe"],["Escudo de Carne","shield"],["A Última Parada","shield"],["O Intocável","shield"],["Vontade dos Vivos","shield"],["Baluarte Rompe-céu","shield"],["Quebra-cercos","shield"],["Vingança de Zolhan","shield"],["Dever de Quebraurora","shield"],["Baluarte de Markovian","shield"],["Tenacidade do Demônio","scepter"],["Vaidade de Aldanar","scepter"],["Códice das Mentiras","scepter"],["Tomo dos Nomes","scepter"],["Orbe Sangrento de Ch'thon","scepter"],["Orador dos Mortos","scepter"],["Olho do Domínio","scepter"],["Tomo dos Ermos Arcanos","scepter"],["Crânio de Gul'Amash","scepter"],["Tomo Infausto de Nar'Adin","scepter"],["Códice das Tormentas Eternas","scepter"],["Consumo de Agrivix","scepter"],["Chama do Invocador","scepter"],["Textos de Iskandra","scepter"],["Orbe da Chama Negra","scepter"],["Códice de Agrivix","scepter"],["Mandíbula do Desespero","helm"],["Máscara Pavorosa de Gurgoth","helm"],["Sussurrante de Segredos","helm"],["Máscara Abissal","helm"],["Testeira da Grande Serpente","helm"],["Máscara da Verdade Infernal","helm"],["Guarda-rosto da Justiça","helm"],["Gorro do Evocador de Feras","helm"],["Máscara do Precursor","helm"],["Chapéu do Assassino de Demônios","helm"],["Chapéu do Clarividente","helm"],["Viseira de Markovian","helm"],["Cimeira de Ulzuin","helm"],["Capuz de Dreeg","helm"],["Capuz Marcado pela Morte","helm"],["Capuz de Iskandra","helm"],["Capuz de Ultos","helm"],["Coroa do Rei do Inverno","helm"],["Chapéu de Trozan","helm"],["Chapéu de Valdun","helm"],["Segredo da Proscrita","helm"],["Olhar Feérico","helm"],["Pacto dos Três","helm"],["Gorro da Lâmina Peçonhenta","helm"],["Semblante da Chama Negra","helm"],["Elmo do Defensor da Luz","helm"],["Guarda-rosto do Cavaleiro Infernal","helm"],["Viseira da Guerra","helm"],["Gorro do Furissangue","helm"],["Manto do Tece-destino","chest"],["Guarda-ombros de Aço Divino","chest"],["Espaldares da Fúria Sanguinária","chest"],["Manto das Chamas Sombrias","chest"],["Brafoneiras de Titã","chest"],["Manto Pavorgélido","chest"],["Manto do Sangue Vil","chest"],["Manto de Carne de Demônio","chest"],["Guarda-ombros da Justiça","chest"],["Ombreiras do Evocador de Feras","chest"],["Guarda-ombros de Quebraurora","chest"],["Manto do Sangue Selvagem","chest"],["Manto do Clarividente","chest"],["Vanguarda de Markovian","chest"],["Guarda-ombros de Ulzuin","chest"],["Manto de Dreeg","chest"],["Guarda-ombros Marcados pela Morte","chest"],["Brafoneiras de Iskandra","chest"],["Espaldares de Ultos","chest"],["Manto de Mogdrogen","chest"],["Manto de Trozan","chest"],["Manto da Chama Negra","chest"],["Dragonas do Defensor da Luz","chest"],["Brafoneiras do Cavaleiro Infernal","chest"],["Manto de Agrivix","chest"],["Brafoneiras da Guerra","chest"],["Guarda-ombros do Furissangue","chest"],["Jaqueta de Escama de Demônio","chest"],["Lorigão da Jaula do Diabo","chest"],["Sudário da Ilusão","chest"],["Vestimenta do Grande Guardião","chest"],["Armadura Pavorosa de Azragor","chest"],["Corselete de Korvoran","chest"],["Traje do Mestre de Demônios","chest"],["Lorigão de Aço Divino","chest"],["Corselete da Justiça","chest"],["Sudário do Evocador de Feras","chest"],["Jaqueta do Assassino de Demônios","chest"],["Capote do Clarividente","chest"],["Armadura de Placas de Markovian","chest"],["Corselete de Ulzuin","chest"],["Vestimenta de Dreeg","chest"],["Jaqueta Marcada pela Morte","chest"],["Vestimenta de Iskandra","chest"],["Couraça de Ultos","chest"],["Couraça da Geada Pavorosa","chest"],["Vestimenta de Trozan","chest"],["Jaqueta de Valdun","chest"],["Armadura do Defensor da Luz","chest"],["Jaqueta do Cavaleiro Infernal","chest"],["Vestimenta de Agrivix","chest"],["Corselete da Guerra","chest"],["Casaco do Furissangue","chest"],["Faixa Quebralâmina","chest"],["Cinturão de Osteotrama","chest"],["Cordão do Vaziomante","chest"],["Cinto das Tripas Enganchadas","chest"],["Engenhosidade do Funileiro","chest"],["Faixa do Senhor do Sangue","chest"],["Cinturão da Ruína do Martelo","chest"],["Correntes de Oleron Reforjadas","chest"],["Tormento de Ulzuin","chest"],["Faixa do Sábio Imortal","chest"],["Cinturão dos Sonhos Roubados","chest"],["Cinta Quebra-feitiços","chest"],["Cinturão de Fios Fantasmas","chest"],["Cinturão do Sangue Selvagem","chest"],["Cinturão do Cavaleiro Infernal","chest"],["Aperto do Poder Desencadeado","gloves"],["Toque do Bosque Eterno","gloves"],["Manoplas de Aço do Vazio","gloves"],["Protetores de Mão de Osso de Serpe","gloves"],["Garras de Geloskorn","gloves"],["Punhos de Presa de Víbora","gloves"],["Alcance Etéreo","gloves"],["Aperto Colossal","gloves"],["Protetores de Mão da Justiça","gloves"],["Aperto do Precursor","gloves"],["Manoplas do Defensor da Luz","gloves"],["Coxotes de Osso de Demônio","chest"],["Perneiras de Osteotrama","chest"],["Perneiras do Sussurro da Morte","chest"],["Coxotes Forjainfernais","chest"],["Perneiras do Tece-destino","chest"],["Envoltório de Pernas de Espectro","chest"],["Perneiras da Harmonia Arcana","chest"],["Guarda-pernas de Pele Espinhosa","chest"],["Envoltório de Pernas de Nidalla","chest"],["Calções de Barbaros","chest"],["Guarda-pernas Selváticos","chest"],["Grevas do Golem","boots"],["Guarda-pés de Escama de Serpe","boots"],["Grevas de Espinhos Envenenados","boots"],["Pisantes do Andarilho do Vazio","boots"],["Botinas Despedaçadoras de Ossos","boots"],["Fantasmandantes","boots"],["Grevas das Tesouras de Vento","boots"],["Botinas de Tempestitã","boots"],["Pisantes do Mago Cinzento","boots"],["Botinas Quebraterra","boots"],["Sinete dos Vencidos","ring"],["Glifo de Kelphat'Zoth","ring"],["Sinete da Vida","ring"],["Aliança do Fluxo Temporal","ring"],["Gritos do Éter","ring"],["Espiral Entrópica","ring"],["Anel da Matriarca Negra","ring"],["Aliança da Assombração Eterna","ring"],["Signo de Belgothian","ring"],["Dualidade de Albrecht","ring"],["Mão Aberta da Misericórdia","ring"],["Punho Cerrado da Vingança","ring"],["Mão Ardente do Invocador","ring"],["Toque Eletrizante do Invocador","ring"],["Toque de Pavor de Alkamos","ring"],["Toque de Angústia de Alkamos","ring"],["Vontade de Bysmiel","amulet"],["Fio da Mortalidade","amulet"],["Avatar da Misericórdia","amulet"],["Rubi Soberano da Dominação","amulet"],["O Inigualável Olho de Beronath","amulet"],["Esmeralda da Fúria Estelar","amulet"],["Essência do Alvorecer Sombrio","amulet"],["Ametista do Elo da Morte","amulet"],["Pedra Celestial de Halakor","amulet"],["Portador da Condenação","amulet"],["Arauto do Apocalipse","amulet"],["Pestilência de Dreeg","amulet"],["Abraço da Noite","amulet"],["Vingador de Cairn","amulet"],["Farol de Quebraurora","amulet"],["Defesa do Assassino de Demônios","amulet"],["Fragmento do Invocador","amulet"],["Gema Negra de Dreeg","amulet"],["Prisma Focalizador de Iskandra","amulet"],["Gema de Ultos","amulet"],["Distinção de Markovian","amulet"],["Coração de Ulzuin","amulet"],["Coração da Montanha","amulet"],["Recompensa de Valdun","amulet"],["Fragmento Arcano de Agrivix","amulet"],["Gema do Furissangue","amulet"],["Marca do Proibido","amulet"],["Emblema da Maestria","amulet"],["Marca do Piroclasma","amulet"],["Signo do Rei Urso","amulet"],["Signo de Sangue de Ch'thon","amulet"],["Timbre do Lobo Atroz","amulet"],["Juramento Imortal","amulet"],["Estratagema de Markovian","amulet"],["Marca dos Sonhos Obscuros","amulet"],["Marca do Anátema","amulet"],["Marca da Divindade","amulet"],["Talismã do Evocador de Feras","amulet"]],"preMagic":[["Iluminante","Iluminante","Iluminantes","Iluminantes"],["Luminoso","Luminosa","Luminosos","Luminosas"],["Argucioso","Arguciosa","Arguciosos","Arguciosas"],["Poderoso","Poderosa","Poderosos","Poderosas"],["Místico","Mística","Místicos","Místicas"],["Vigoroso","Vigorosa","Vigorosos","Vigorosas"],["Energizante","Energizante","Energizantes","Energizantes"],["Agressivo","Agressiva","Agressivos","Agressivas"],["Robusto","Robusta","Robustos","Robustas"],["de Soldado","de Soldado","de Soldado","de Soldado"],["de Demolicionista","de Demolicionista","de Demolicionista","de Demolicionista"],["de Ocultista","de Ocultista","de Ocultista","de Ocultista"],["de Lâmina Noturna","de Lâmina Noturna","de Lâmina Noturna","de Lâmina Noturna"],["de Arcanista","de Arcanista","de Arcanista","de Arcanista"],["Restaurativo","Restaurativa","Restaurativos","Restaurativas"],["de Subjugador","de Subjugador","de Subjugador","de Subjugador"],["de Errante","de Errante","de Errante","de Errante"],["Tenaz","Tenaz","Tenazes","Tenazes"],["Revigorante","Revigorante","Revigorantes","Revigorantes"],["de Xamã","de Xamã","de Xamã","de Xamã"],["Impenetrável","Impenetrável","Impenetráveis","Impenetráveis"],["Isolante","Isolante","Isolantes","Isolantes"],["Resguardador","Resguardadora","Resguardadores","Resguardadoras"],["Neutralizante","Neutralizante","Neutralizantes","Neutralizantes"],["Purificante","Purificante","Purificantes","Purificantes"],["Impérvio","Impérvia","Impérvios","Impérvias"],["Resistente","Resistente","Resistentes","Resistentes"],["Preservador","Preservadora","Preservadores","Preservadoras"],["Ordenado","Ordenada","Ordenados","Ordenadas"],["Amparador","Amparadora","Amparadores","Amparadoras"],["Resoluto","Resoluta","Resolutos","Resolutas"],["Anulador","Anuladora","Anuladores","Anuladoras"],["Prismático","Prismática","Prismáticos","Prismáticas"],["Rijo","Rija","Rijos","Rijas"],["Estancador","Estancadora","Estancadores","Estancadoras"],["Degelador","Degeladora","Degeladores","Degeladoras"],["Durável","Durável","Duráveis","Duráveis"],["Duradouro","Duradoura","Duradouros","Duradouras"],["Impassável","Impassável","Impassáveis","Impassáveis"],["Firme","Firme","Firmes","Firmes"],["Eterno","Eterna","Eternos","Eternas"],["Inquebrável","Inquebrável","Inquebráveis","Inquebráveis"],["Adamantino","Adamantina","Adamantinos","Adamantinas"],["Acérrimo","Acérrima","Acérrimos","Acérrimas"],["Superior","Superior","Superiores","Superiores"],["Triturador","Trituradora","Trituradores","Trituradoras"],["Pungente","Pungente","Pungentes","Pungentes"],["Gelado","Gelada","Gelados","Geladas"],["Ardente","Ardente","Ardentes","Ardentes"],["Envenenado","Envenenada","Envenenados","Envenenadas"],["Carregado","Carregada","Carregados","Carregadas"],["Vampírico","Vampírica","Vampíricos","Vampíricas"],["Drenador","Drenadora","Drenadores","Drenadoras"],["Debilitante","Debilitante","Debilitantes","Debilitantes"],["Corrosivo","Corrosiva","Corrosivos","Corrosivas"],["Deformado","Deformada","Deformados","Deformadas"],["Tocado pelo Vazio","Tocada pelo Vazio","Tocados pelo Vazio","Tocadas pelo Vazio"],["Putrefato","Putrefata","Putrefatos","Putrefatas"]],"preRare":[["de Tirano","de Tirano","de Tirano","de Tirano"],["Inexorável","Inexorável","Inexoráveis","Inexoráveis"],["de Lança-runa","de Lança-runa","de Lança-runa","de Lança-runa"],["de Portador da Peste","de Portador da Peste","de Portador da Peste","de Portador da Peste"],["Barbárico","Barbárica","Barbáricos","Barbáricas"],["Sanguinário","Sanguinária","Sanguinários","Sanguinárias"],["de Oficial","de Oficial","de Oficial","de Oficial"],["Demoníaco","Demoníaca","Demoníacos","Demoníacas"],["Infernal","Infernal","Infernais","Infernais"],["de Encantador","de Encantador","de Encantador","de Encantador"],["Sobrenatural","Sobrenatural","Sobrenaturais","Sobrenaturais"],["Caído dos Céus","Caída dos Céus","Caídos dos Céus","Caídas dos Céus"],["Geoso","Geosa","Geosos","Geosas"],["Terreno","Terrena","Terrenos","Terrenas"],["Tempestuoso","Tempestuosa","Tempestuosos","Tempestuosas"],["de Fogo Infernal","de Fogo Infernal","de Fogo Infernal","de Fogo Infernal"],["de Sortílego","de Sortílego","de Sortílego","de Sortílego"],["de Presa Venenosa","de Presa Venenosa","de Presa Venenosa","de Presa Venenosa"],["de Fogo Etéreo","de Fogo Etéreo","de Fogo Etéreo","de Fogo Etéreo"],["Sinistro","Sinistra","Sinistros","Sinistras"],["Frenético","Frenética","Frenéticos","Frenéticas"],["Glacial","Glacial","Glaciais","Glaciais"],["Fulminado","Fulminada","Fulminados","Fulminadas"],["de Orvalho Congelado","de Orvalho Congelado","de Orvalho Congelado","de Orvalho Congelado"],["Celestial","Celestial","Celestiais","Celestiais"],["Enfurecido","Enfurecida","Enfurecidos","Enfurecidas"],["de Renegado","de Renegado","de Renegado","de Renegado"],["de Lich","de Lich","de Lich","de Lich"],["Harmonioso","Harmoniosa","Harmoniosos","Harmoniosas"],["de Senhor Pavoroso","de Senhor Pavoroso","de Senhor Pavoroso","de Senhor Pavoroso"],["Devastador","Devastadora","Devastadores","Devastadoras"],["Antigo","Antiga","Antigos","Antigas"],["Tormentoso","Tormentosa","Tormentosos","Tormentosas"],["Sobrevivencialista","Sobrevivencialista","Sobrevivencialistas","Sobrevivencialistas"],["Maníaco","Maníaca","Maníacos","Maníacas"],["de Capataz","de Capataz","de Capataz","de Capataz"],["de Paladino","de Paladino","de Paladino","de Paladino"],["Seráfico","Seráfica","Seráficos","Seráficas"],["Consagrado","Consagrada","Consagrados","Consagradas"],["Infectado","Infectada","Infectados","Infectadas"],["Incorruptível","Incorruptível","Incorruptíveis","Incorruptíveis"],["de Portador da Luz","de Portador da Luz","de Portador da Luz","de Portador da Luz"],["Inflexível","Inflexível","Inflexíveis","Inflexíveis"],["Ressonante","Ressonante","Ressonantes","Ressonantes"],["Ameaçador","Ameaçadora","Ameaçadores","Ameaçadoras"],["Formidável","Formidável","Formidáveis","Formidáveis"],["Imponente","Imponente","Imponentes","Imponentes"],["Implacável","Implacável","Implacáveis","Implacáveis"],["de Degolador","de Degolador","de Degolador","de Degolador"],["de Cruento","de Cruento","de Cruento","de Cruento"],["Pétreo","Pétrea","Pétreos","Pétreas"],["de General","de General","de General","de General"],["de Feitor","de Feitor","de Feitor","de Feitor"],["de Dominador","de Dominador","de Dominador","de Dominador"],["de Comando","de Comando","de Comando","de Comando"],["de Lâmina Embruxada","de Lâmina Embruxada","de Lâmina Embruxada","de Lâmina Embruxada"],["de Mestre das Lâminas","de Mestre das Lâminas","de Mestre das Lâminas","de Mestre das Lâminas"],["de Mago de Batalha","de Mago de Batalha","de Mago de Batalha","de Mago de Batalha"],["de Piromante","de Piromante","de Piromante","de Piromante"],["de Sabotador","de Sabotador","de Sabotador","de Sabotador"],["de Feiticeiro","de Feiticeiro","de Feiticeiro","de Feiticeiro"],["de Caçador de Bruxos","de Caçador de Bruxos","de Caçador de Bruxos","de Caçador de Bruxos"],["de Mestre da Magia","de Mestre da Magia","de Mestre da Magia","de Mestre da Magia"],["de Quebra-feitiços","de Quebra-feitiços","de Quebra-feitiços","de Quebra-feitiços"],["de Guerreiro","de Guerreiro","de Guerreiro","de Guerreiro"],["de Incendiário","de Incendiário","de Incendiário","de Incendiário"],["de Herege","de Herege","de Herege","de Herege"],["de Assassino","de Assassino","de Assassino","de Assassino"],["de Mago","de Mago","de Mago","de Mago"],["de Guarda","de Guarda","de Guarda","de Guarda"],["de Elementalista","de Elementalista","de Elementalista","de Elementalista"],["de Conjurador","de Conjurador","de Conjurador","de Conjurador"],["de Embusteiro","de Embusteiro","de Embusteiro","de Embusteiro"],["de Druida","de Druida","de Druida","de Druida"],["de Vidente","de Vidente","de Vidente","de Vidente"],["Inamovível","Inamovível","Inamovíveis","Inamovíveis"],["de Guardião","de Guardião","de Guardião","de Guardião"],["Sobrecarregado","Sobrecarregada","Sobrecarregados","Sobrecarregadas"],["de Cronomante","de Cronomante","de Cronomante","de Cronomante"],["de Senhor Supremo","de Senhor Supremo","de Senhor Supremo","de Senhor Supremo"],["de Mestre da Matilha","de Mestre da Matilha","de Mestre da Matilha","de Mestre da Matilha"],["Cáustico","Cáustica","Cáusticos","Cáusticas"],["de Destruidor","de Destruidor","de Destruidor","de Destruidor"],["de Muralha Ardente","de Muralha Ardente","de Muralha Ardente","de Muralha Ardente"],["de Geada Branca","de Geada Branca","de Geada Branca","de Geada Branca"]],"sufMagic":["da Aptidão","da Fortitude","da Psique","do Lobo","da Raposa","do Javali","da Águia","da Vitalidade","da Sabedoria","da Potência","da Meditação","da Alacridade","da Pressa","da Celeridade","do Zelo","do Ímpeto","do Ataque","da Proteção","da Prontidão","da Desintoxicação","da Coagulação","da Caça","do Homicídio","do Banimento","do Exorcismo","da Ruína","do Congelamento","da Queimadura","do Trovão","da Corrosão","da Decadência","da Peçonha","do Sangue","da Fortificação","dos Acúleos","do Éter","do Vazio","dos Espinhos","da Recomposição","da Renovação","da Tartaruga","do Carcaju","do Texugo","da Serpente","do Mar","da Montanha","do Morcego","da Víbora","do Touro","da Coruja","do Cão Abissal","do Deserto","do Ártico","das Terras Selvagens","do Pântano","do Vento","do Fantasma","da Tecelagem de Feitiços","da Chama","do Resfriamento","da Eletrocussão","do Trauma","das Barricadas"],"sufRare":["da Conflagração","da Insanidade","da Santificação","do Abismo","do Sábio","do Matador","da Voracidade","do Devorador","do Fervor","da Crueldade","da Impiedade","da Raiva Bestial","da Fúria","da Ferocidade","da Matança","da Arremetida","do Incêndio","das Torrentes","do Despedaçamento","da Infecção","da Garra Peçonhenta","da Abominação","da Aniquilação","dos Elementos","da Vinculação","da Aflição","da Escuridão Penetrante","da Tempestade Invernal","das Borrascas","do Furacão","do Equilíbrio Arcano","do Evocador de Chamas","da Labareda Arcana","do Fogo do Vazio","da Queda Celestial","da Malícia de Solael","da Realidade Despedaçada","da Cabala","das Tradições Arcanas","do Muro de Menhir","da Chama de Ulzuin","do Olhar de Dreeg","da Ira de Oleron","do Foco de Albrecht","do Gildam Arcanum","dos Portais Famintos","do Bosque","das Lâminas","do Heroísmo","do Dranghoul","do Selvagem","do Indomável","da Incineração","da Geleira","do Basilisco","dos Slith","das Anomalias","do Adivinho","do Brutamontes de Carne","do Arauto do Vazio","do Aço Equilibrado","da Supremacia","das Sombras","das Farpas Cruéis","da Carnificina","dos Encantamentos","da Perspicácia","dos Fins Ardentes","da Sobrevivência","dos Reis","da Destruição","da Rajada de Amarasta","da Sagacidade de Maiven","dos Ventos Arcanos","do Passopena","do Pé-de-pedra","das Sombras Dançantes","da Resiliência Reptiliana","dos Reflexos Rápidos","da Alacridade de Amarasta","da Guarda de Honra","das Mentes Arcanas","das Tempestades Etéreas","da Má Intenção","da Fúria de Batalha","do Poder Arcano","dos Punhos de Pedra","do Reduto","do Valor","do Protetor","do Oráculo","dos Espectros","da Serenidade","do Profanador","da Vingança","do Guardião","dos Rituais","das Areias","do Frio Mortal","das Tempestades","da Imortalidade","da Corrupção"],"broken":[["Quebrado","Quebrada","Quebrados","Quebradas"],["Despedaçado","Despedaçada","Despedaçados","Despedaçadas"],["Retorcido","Retorcida","Retorcidos","Retorcidas"],["Arruinado","Arruinada","Arruinados","Arruinadas"],["Destruído","Destruída","Destruídos","Destruídas"]],"compA":["Alma Etérea","Amostra de Seda","Aço Abençoado","Aço Gelado","Brasa Incandescente","Carapaça Espinhosa","Carapaça Golpeada","Carapaça Reforçada","Carapaça Rígida","Carapaça Serrilhada","Coração Congelado","Coração Podre","Cálculo Biliar Vitriólico","Dardos com Núcleo de Sílex","Dardos de Aço Etéreo","Dardos do Frio Mortal","Ectoplasma","Escamas Mutantes","Esmeralda Polida","Espectro Vingativo","Espinho Serrilhado","Espinhos Cruéis","Fragmento de Alma","Garra Decepada","Garra Lascada","Gema Radiante","Invólucros Consagrados","Lenitivo Antiveneno","Magnetita Rachada","Mandíbula Cruel","Marca das Ilusões","Marca do Viajante","Munição Tocada pelo Vazio","Munição com Ponta Envenenada","Munição da Ruína do Inferno","Osso Santificado","Pedra Abissal","Pedra Fria","Pedra Protetora","Pedra Rúnica","Pedra da Ira","Pedra de Amolar Abençoada","Pele Coriácea","Pele Densa","Pele Escamosa","Pele Fundida","Pele Hirsuta","Prata Imbuída","Presa Oca","Presa Peçonhenta","Prisma Focalizador","Pó de Cadáver","Restos sem Descanso","Revestimento Balístico","Revestimento Recuperado","Revestimento Resiliente","Sal Purificado","Sangue Turvo","Sebo Negro","Sílex Encantado","Âmbar","Ícore Mutagênico"],"compB":["Alma Despedaçada de Kilrian","Aço Assombrado","Centelha Arcana","Correntes de Oleron","Crânio Pavoroso","Dardos com Núcleo de Prata","Diamante Prismático","Fragmento de Beronath","Inscrição Profana","Lente Arcana","Magnetita Harmonizada","Marca de Dreeg","Marca de Mogdrogen","Marca do Mirmidão","Munição Tocada pelo Diabo","Pedra de Amolar Sangrenta","Placas de Armadura Antiga","Sangue de Oleron","Solo Sagrado","Símbolo de Solael","Tecido Enfeitiçado","Vinculações de Bysmiel"],"recipes":["Receita: Elixir da Caça","Receita: Elixir do Vazio","Receita: Elixir do Éter","Receita: Elixir dos Antigos","Receita: Essência de Geleia Real","Receita: Extrato de Geleia Real","Receita: Lenitivo de Geleia Real","Receita: Unguento da Geada Branca","Receita: Unguento da Guarda do Veneno","Receita: Unguento de Geleia Real","Receita: Unguento do Bebedor de Chamas","Receita: Unguento do Sudário da Geada","Receita: Unguento do Sussurro da Morte","Receita: Unguento do Vínculo de Sangue","Receita: Óleo Arcano","Receita: Óleo de Presa Sanguinária","Receita: Óleo de Presa Venenosa","Receita: Óleo de Rouba-vidas"],"diagrams":["Diagrama: Adaga do Adepto","Diagrama: Aglomerado Etéreo","Diagrama: Alma Etérea","Diagrama: Amostra de Seda","Diagrama: Amuleto do Pestomante Empoderado","Diagrama: Arauto do Apocalipse","Diagrama: Arauto dos Fins Chamejantes","Diagrama: Arcanum Sigillis","Diagrama: Arcobalista dos Rhowari","Diagrama: Arquivo com Glifos","Diagrama: Aço Abençoado","Diagrama: Aço Assombrado","Diagrama: Beronath, a Reforjada","Diagrama: Borguinhota do Patrulheiro","Diagrama: Botas do Adepto","Diagrama: Botas do Escudeiro","Diagrama: Brafoneiras Decoradas","Diagrama: Calças do Explorador","Diagrama: Capuz Marcado pela Morte","Diagrama: Capuz de Dreeg","Diagrama: Capuz de Iskandra","Diagrama: Capuz de Ultos","Diagrama: Capuz do Adepto","Diagrama: Carapaça Espinhosa","Diagrama: Centelha Arcana","Diagrama: Cetro da Tempestade de Fogo","Diagrama: Cetro do Adepto","Diagrama: Cetro do Mestre","Diagrama: Chapéu de Trozan","Diagrama: Chapéu de Valdun","Diagrama: Chapéu do Assassino de Demônios","Diagrama: Chapéu do Clarividente","Diagrama: Chave Esquelética","Diagrama: Chifre Ocultista","Diagrama: Cimeira de Ulzuin","Diagrama: Cinta Quebra-feitiços","Diagrama: Cinta Solar","Diagrama: Cinta da Legião","Diagrama: Cinta da Morte","Diagrama: Cinta do Diabo","Diagrama: Cinta dos Escolhidos","Diagrama: Cinta dos Rhowari","Diagrama: Cinto Solar","Diagrama: Cinto da Legião","Diagrama: Cinto do Belicista","Diagrama: Cinturão Solar","Diagrama: Cinturão da Guarda da Geada","Diagrama: Cinturão da Legião","Diagrama: Cinturão da Morte","Diagrama: Cinturão do Diabo","Diagrama: Cinturão dos Escolhidos","Diagrama: Cinturão dos Rhowari","Diagrama: Clava do Diabo","Diagrama: Condenação","Diagrama: Conquistadora Afiada","Diagrama: Coração Podre","Diagrama: Cordão da Morte","Diagrama: Cordão do Diabo","Diagrama: Cordão do Vaziomante","Diagrama: Cordão dos Escolhidos","Diagrama: Cordão dos Rhowari","Diagrama: Coroa do Rei do Inverno","Diagrama: Correntes de Oleron Reforjadas","Diagrama: Crânio Ocultista","Diagrama: Cuspidor de Dardos Empoderado","Diagrama: Códice Tece-feitiços dos Rhowari","Diagrama: Códice das Tormentas Eternas","Diagrama: Dardos com Núcleo de Prata","Diagrama: Decapitador Brutal","Diagrama: Defensor da Colheita","Diagrama: Defensor do Soldado da Guarda","Diagrama: Diamante Prismático","Diagrama: Efígie Malformada Empoderada","Diagrama: Efígie Ocultista","Diagrama: Elmo do Defensor da Luz","Diagrama: Elmo do Patrulheiro","Diagrama: Emblema da Maestria","Diagrama: Engenhosidade do Funileiro","Diagrama: Escudo Soberano","Diagrama: Escudo de Batalha","Diagrama: Escudo de Cerco","Diagrama: Esmeralda da Fúria Estelar","Diagrama: Espada Larga Afiada","Diagrama: Espada Longa Afiada","Diagrama: Espectro Vingativo","Diagrama: Espreitadora de Bruxos","Diagrama: Essência de Beronath Empoderada","Diagrama: Essência do Alvorecer Sombrio","Diagrama: Estrela da Manhã do Adepto","Diagrama: Faixa da Onda de Choque","Diagrama: Faixa de Fios Chamejantes","Diagrama: Faixa de Fios Ctônica Empoderada","Diagrama: Faixa de Osso de Espectro","Diagrama: Faixa de Seda Flamejante","Diagrama: Faixa do Equilíbrio","Diagrama: Fatiadora da Legião","Diagrama: Fragmento de Beronath","Diagrama: Frio de Olexra","Diagrama: Garra de Basilisco","Diagrama: Gorro da Lâmina Peçonhenta","Diagrama: Gorro de Mogdrogen","Diagrama: Gorro do Assassino Cego","Diagrama: Gorro do Evocador de Feras","Diagrama: Gorro do Furissangue","Diagrama: Grevas do Adepto","Diagrama: Grevas do Escudeiro","Diagrama: Guarda Carmesim dos Escolhidos","Diagrama: Guarda-rosto da Justiça","Diagrama: Gume da Tempestade","Diagrama: Jaqueta do Guardião das Chamas","Diagrama: Lapis Mantichora","Diagrama: Lente de Maiven","Diagrama: Leviatã","Diagrama: Livro de Feitiços com Glifos","Diagrama: Luvas do Adepto","Diagrama: Lâmina Enfeitiçada do Adepto","Diagrama: Lâmina Enfeitiçada do Mestre","Diagrama: Machado Grande Brutal","Diagrama: Mandíbula do Desespero","Diagrama: Manoplas do Escudeiro","Diagrama: Marca da Divindade","Diagrama: Marca da Vontade de Ferro","Diagrama: Marca de Mogdrogen","Diagrama: Marreta Lunar","Diagrama: Maça Afiada do Adepto","Diagrama: Maça Flangeada do Adepto","Diagrama: Morteiro de Mão","Diagrama: Máscara Abissal","Diagrama: Máscara Pavorosa de Gurgoth","Diagrama: Máscara da Verdade Infernal","Diagrama: Máscara do Precursor","Diagrama: O Olho","Diagrama: Olhar Feérico","Diagrama: Olhar da Morte","Diagrama: Olho do Domínio","Diagrama: Osso Santificado","Diagrama: Pacto dos Três","Diagrama: Pedra Protetora","Diagrama: Pedra Rúnica","Diagrama: Pedra de Amolar Abençoada","Diagrama: Pedra de Amolar Sangrenta","Diagrama: Pedra do Vórtice","Diagrama: Peitoral do Soldado da Guarda","Diagrama: Pele Coriácea","Diagrama: Pele Escamosa","Diagrama: Pestilência de Dreeg","Diagrama: Pistola de Cano Duplo","Diagrama: Pistola de Metralha","Diagrama: Prata Imbuída","Diagrama: Presa Oca","Diagrama: Presságio","Diagrama: Presságio Empoderado","Diagrama: Prisma Focalizador","Diagrama: Protetores de Mão do Escudeiro","Diagrama: Punhos do Adepto","Diagrama: Quebra-cercos","Diagrama: Raka'Jax","Diagrama: Relíquia - Acerto de Contas","Diagrama: Relíquia - Aflição de Dreeg","Diagrama: Relíquia - Aniquilação","Diagrama: Relíquia - Antepassado","Diagrama: Relíquia - Ardileza","Diagrama: Relíquia - Assombração","Diagrama: Relíquia - Bastião de Menhir","Diagrama: Relíquia - Borrasca","Diagrama: Relíquia - Calamidade","Diagrama: Relíquia - Cidadela","Diagrama: Relíquia - Conflagração","Diagrama: Relíquia - Corrupção","Diagrama: Relíquia - Desolação","Diagrama: Relíquia - Dizimação de Solael","Diagrama: Relíquia - Dominação de Bysmiel","Diagrama: Relíquia - Equilíbrio","Diagrama: Relíquia - Equilíbrio de Iskandra","Diagrama: Relíquia - Esquecimento","Diagrama: Relíquia - Flagelo","Diagrama: Relíquia - Fortaleza","Diagrama: Relíquia - Força Destruidora","Diagrama: Relíquia - Frio Mortal","Diagrama: Relíquia - Furor","Diagrama: Relíquia - Geleira","Diagrama: Relíquia - Infecção","Diagrama: Relíquia - Inferno","Diagrama: Relíquia - Instinto Primevo","Diagrama: Relíquia - Ira de Oleron","Diagrama: Relíquia - Maldição","Diagrama: Relíquia - Malícia de Agrivix","Diagrama: Relíquia - Matança","Diagrama: Relíquia - Necrose","Diagrama: Relíquia - Nêmesis","Diagrama: Relíquia - Olho da Tempestade","Diagrama: Relíquia - Piroclasma de Ulzuin","Diagrama: Relíquia - Ruína","Diagrama: Relíquia - Sacrifício","Diagrama: Relíquia - Santuário","Diagrama: Relíquia - Selvagem","Diagrama: Relíquia - Talismã da Névoa","Diagrama: Relíquia - Talismã das Lâminas","Diagrama: Relíquia - Talismã do Pilhador","Diagrama: Relíquia - Talismã do Pistoleiro","Diagrama: Relíquia - Talismã do Saqueador","Diagrama: Relíquia - Terror","Diagrama: Relíquia - Tormento","Diagrama: Relíquia - Vingador","Diagrama: Relíquia - Zelo","Diagrama: Relíquia - Árbitro","Diagrama: Relíquia - Égide","Diagrama: Restos sem Descanso","Diagrama: Revestimento Balístico","Diagrama: Revólver de Orwell Empoderado","Diagrama: Revólver de Seis Tiros da Morte","Diagrama: Rifle Rotativo","Diagrama: Rifle de Antecarga","Diagrama: Rifle de Metralha","Diagrama: Rubi do Equilíbrio Elemental","Diagrama: Safira do Equilíbrio Elemental","Diagrama: Sal Purificado","Diagrama: Sangue de Oleron","Diagrama: Sebo Negro","Diagrama: Semblante Profano do Pacto","Diagrama: Semblante da Chama Negra","Diagrama: Signo da Tempestade Empoderado","Diagrama: Sussurrante de Segredos","Diagrama: Talhador Brutal","Diagrama: Testeira da Grande Serpente","Diagrama: Testeira do Adepto","Diagrama: Timbre da Legião Negra Empoderado","Diagrama: Tomo com Glifos","Diagrama: Toque do Ceifador Empoderado","Diagrama: Tormento de Ulzuin","Diagrama: Tremor","Diagrama: Trituradora dos Escolhidos","Diagrama: Túnica do Explorador","Diagrama: Ulda'Jax","Diagrama: Varinha do Adepto","Diagrama: Varinha do Fogo Místico","Diagrama: Vestimenta de Callidor","Diagrama: Viseira da Guerra","Diagrama: Viseira de Markovian","Diagrama: Viseira do Mirmidão"]};
const g4 = (g) => ({ ms: 0, fs: 1, mp: 2, fp: 3 })[g] ?? 0;

function rollItem() {
  const r = Math.random();
  if (r < 0.07) { const [n, gd, art] = pick(N.base); return { name: `${n} ${pick(N.broken)[g4(gd)]}`, col: COLOR.broken, art, broken: true }; }
  if (r < 0.15) return Math.random() < 0.3 ? { name: pick(N.recipes), col: COLOR.recipe, art: "scroll" } : { name: pick(N.diagrams), col: COLOR.recipe, art: "scroll" };
  if (r < 0.27) return Math.random() < 0.2 ? { name: pick(N.compB), col: COLOR.rareComponent, art: "crystal" } : { name: pick(N.compA), col: COLOR.component, art: "crystal" };
  const [base, gd, art] = pick(N.base), k = g4(gd);
  if (r < 0.6) return { name: base, col: COLOR.common, art };
  if (r < 0.86) {
    const x = Math.random();
    const name = x < 0.4 ? `${base} ${pick(N.preMagic)[k]}` : x < 0.75 ? `${base} ${pick(N.sufMagic)}` : `${base} ${pick(N.preMagic)[k]} ${pick(N.sufMagic)}`;
    return { name, col: COLOR.magic, art };
  }
  if (Math.random() < 0.3) { const [name, mart] = pick(N.mi); return { name, col: COLOR.rare, art: mart }; } // monster infrequent
  const pre = Math.random() < 0.6 ? pick(N.preRare)[k] : pick(N.preMagic)[k];
  const suf = Math.random() < 0.6 ? pick(N.sufRare) : pick(N.sufMagic);
  return { name: `${base} ${pre} ${suf}`, col: COLOR.rare, art };
}

function loot(x, y, layer, forceLucky) {
  const g = box(layer, x, y);
  const items = [];
  const n = Math.round(rnd(2, 5));
  for (let i = 0; i < n; i++) items.push(rollItem());
  // Now and then something worth celebrating.
  const lucky = forceLucky ?? Math.random();
  if (lucky < 0.035) { const [name, art] = pick(N.legendary); items.push({ name, col: COLOR.legendary, art, beam: "legendary" }); }
  else if (lucky < 0.13) { const [name, art] = pick(N.epic); items.push({ name, col: COLOR.epic, art, beam: "epic" }); }
  const iron = Math.random() < 0.85 ? Math.round(rnd(4, 60)) : 0;

  // Burst at the tap: a puff of dust and a flash of iron.
  flash(g, 70, "rgba(255, 200, 140, .35)", 0);
  for (let i = 0; i < 8; i++) {
    const d = el(g, "gd-mote", "background:#9b8f80;width:4px;height:4px;opacity:0");
    const a = rnd(0, Math.PI * 2), r = rnd(14, 34);
    d.animate([{ transform: "translate(0,0)", opacity: 0.8 }, { transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r * 0.5 - 6}px)`, opacity: 0 }],
      { duration: rnd(400, 700), easing: "ease-out", fill: "both" });
  }

  // Like a drop in the game: the items land in a pile around the tap, lying flat on the ground with a glow
  // and sparkles in their rarity color; the names stack in a column of dark plates above the pile; epics and
  // legendaries shoot a tall pillar of light.
  const W = layer.clientWidth || innerWidth, H = layer.clientHeight || innerHeight;
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  const entries = items.map((it) => ({ it }));
  if (iron) entries.push({ it: { name: `${iron} Pedaços de Ferro`, col: COLOR.iron }, iron: true });
  const ROW = 22, n2 = entries.length;
  const baseY = Math.max(y - 34, 70 + (n2 - 1) * ROW); // bottom plate; the stack grows upward
  const pileY = Math.min(H - 36, baseY + 56);
  const FLY = 720, life = items.some((it) => it.beam === "legendary") ? 6000 : items.some((it) => it.beam) ? 5000 : 3800;
  entries.forEach((e, i) => {
    const { it } = e, delay = i * 45;
    // Where it lands (relative to the tap).
    const dx = Math.max(26 - x, Math.min(W - 26 - x, rnd(-105, 105))), dy = pileY - y + rnd(-20, 20);
    const glowCol = it.col && it.col !== COLOR.common && it.col !== COLOR.broken && it.col !== COLOR.iron ? it.col : null;
    if (e.iron) {
      for (let k = 0; k < Math.min(9, 3 + Math.round(iron / 10)); k++) {
        const b2 = el(g, "gd-bit"), bx = dx + rnd(-12, 12), by = dy + rnd(-4, 4), pk = -rnd(30, 70);
        b2.animate([
          { transform: "translate(0,0) rotate(0deg)", easing: "cubic-bezier(.3,.7,.6,1)" },
          { transform: `translate(${bx * 0.5}px, ${pk}px) rotate(${rnd(-300, 300)}deg)`, offset: 0.45, easing: "cubic-bezier(.5,0,.9,.5)" },
          { transform: `translate(${bx}px, ${by}px) rotate(${rnd(-90, 90)}deg)` },
        ], { duration: FLY * 0.85, delay: rnd(0, 120), fill: "both" });
        b2.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: life - 500, fill: "forwards" });
      }
    } else {
      // Contact shadow + colored pool of light on the ground.
      const sh = el(g, "gd-ground", `left:${dx - 30}px;top:${dy + 2}px;width:60px;height:18px;background:radial-gradient(closest-side, rgba(0,0,0,.75), transparent)`);
      sh.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, delay: delay + FLY * 0.8, fill: "both" });
      sh.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: life - 450, fill: "forwards" });
      if (glowCol) {
        const pool = el(g, "gd-ground pool", `left:${dx - 30}px;top:${dy - 10}px;width:60px;height:26px;background:radial-gradient(closest-side, ${glowCol}, transparent);`);
        pool.animate([{ opacity: 0 }, { opacity: it.beam ? 0.6 : 0.3 }], { duration: 250, delay: delay + FLY * 0.85, fill: "both" });
        pool.animate([{ opacity: it.beam ? 0.6 : 0.3 }, { opacity: 0 }], { duration: 400, delay: life - 450, fill: "forwards" });
        for (let k = 0; k < (it.beam ? 6 : 3); k++) { // sparkles twinkling on the item
          const sp = el(g, "gd-twinkle", `left:${dx + rnd(-16, 16)}px;top:${dy + rnd(-12, 8)}px;color:${glowCol}`, TWINKLE);
          sp.animate([{ transform: "scale(0) rotate(0deg)", opacity: 0 }, { transform: "scale(1) rotate(40deg)", opacity: 1 }, { transform: "scale(0) rotate(90deg)", opacity: 0 }],
            { duration: rnd(700, 1200), delay: delay + FLY + rnd(0, 900), iterations: Math.max(1, Math.floor((life - FLY - 1200) / 1000)), easing: "ease-in-out", fill: "both" });
        }
      }
      const node = el(g, "gd-item", "", spriteFor(it.art));
      const peak = -rnd(70, 120), rot = rnd(-260, 260), lie = rnd(-70, 70);
      node.animate([
        { transform: "translate(0px, 0px) rotate(0deg) scale(.4)", easing: "cubic-bezier(.3,.7,.6,1)" },
        { transform: `translate(${dx * 0.5}px, ${peak}px) rotate(${rot}deg) scale(1)`, offset: 0.45, easing: "cubic-bezier(.5,0,.9,.5)" },
        { transform: `translate(${dx}px, ${dy}px) scale(1) rotate(${lie}deg)`, offset: 0.86, easing: "ease-out" },
        { transform: `translate(${dx}px, ${dy - 3}px) scale(1) rotate(${lie * 0.94}deg)`, offset: 0.93, easing: "ease-in" },
        { transform: `translate(${dx}px, ${dy}px) scale(1) rotate(${lie}deg)` },
      ], { duration: FLY, delay, fill: "both" });
      if (it.broken) node.animate([{ opacity: 1 }, { opacity: 0, filter: "blur(2px)" }], { duration: 700, delay: delay + FLY + 700, fill: "forwards" });
      else node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: life - 500, fill: "forwards" });
      if (it.beam) beam(g, dx, dy, it.beam, delay + FLY - 80, life, y);
    }
    // Name plate in the stack.
    const t = el(g, "gd-label", `--c:${it.col};visibility:hidden`);
    if (it.col === COLOR.rare && Math.random() < 0.45) t.insertAdjacentHTML("beforeend", `<i class="dia">◆</i>`);
    t.appendChild(document.createTextNode(it.name));
    const w = t.offsetWidth;
    const lx = Math.max(w / 2 + 6 - x, Math.min(W - w / 2 - 6 - x, rnd(-34, 34)));
    t.style.left = `${lx}px`; t.style.top = `${baseY - i * ROW - y}px`; t.style.visibility = "";
    const show = delay + FLY - 150, end = it.broken ? show + 1450 : life;
    t.animate([{ opacity: 0, transform: "translate(-50%, 4px)" }, { opacity: 1, transform: "translate(-50%, 0)" }], { duration: 200, delay: show, fill: "forwards" });
    t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: end - 400, fill: "forwards" });
  });
  setTimeout(() => g.remove(), life + 200);
}
// Item sprites: frames of Flare's 3D-rendered loot art (CC-BY-SA, see img/CREDITS.txt), lying on the ground.
// [file, natural w, h]; drawn at 55% of their natural size, between 22 and 45 px, so a ring stays small next to a sword.
const SPR = {
  sword: [99, 21], sword2: [79, 58], greatsword: [86, 51], dagger: [42, 10], knife: [41, 35], cleaver: [47, 32],
  axe: [97, 36], axe2: [91, 24], mace: [80, 22], hammer: [70, 39], hammer2: [54, 37], club: [54, 19], bow: [60, 46],
  bow2: [88, 56], shield: [56, 81], shield2: [50, 48], buckler: [53, 29], armor: [83, 40], leather: [69, 35],
  cloth: [49, 51], boots: [44, 31], belt: [34, 28], ring: [16, 11], ring2: [16, 14], gem: [39, 33], crystal: [18, 18],
  book: [56, 35], scroll: [67, 58], rod: [71, 26], wand: [40, 13], staff: [82, 73], pouch: [45, 43], potion: [25, 24],
};
// Which sprites stand in for each kind of item (one is picked at random per drop).
const SPRITE_FOR = {
  cleaver: ["cleaver", "axe2"], sword: ["sword", "sword2", "greatsword"], axe: ["axe", "axe2", "cleaver"],
  mace: ["mace", "hammer", "hammer2", "club"], pistol: ["bow", "bow2"], dagger: ["dagger", "knife"],
  shield: ["shield", "shield2", "buckler"], helm: ["armor", "leather"], chest: ["leather", "armor", "cloth"],
  gloves: ["leather", "cloth"], boots: ["boots"], ring: ["ring", "ring2"], amulet: ["gem", "crystal"],
  scepter: ["rod", "wand", "staff"], scroll: ["scroll", "book"], crystal: ["crystal", "gem", "pouch", "potion"],
};
const SPRITE_URL = (n) => new URL(`img/gd-${n}.png`, import.meta.url).href;
function spriteFor(art) {
  const n = pick(SPRITE_FOR[art] || SPRITE_FOR.sword), [w, h] = SPR[n];
  const big = Math.max(w, h), disp = Math.max(22, Math.min(45, big * 0.55)), k = disp / big;
  return `<img src="${SPRITE_URL(n)}" alt="" width="${Math.round(w * k)}" height="${Math.round(h * k)}">`;
}
const TWINKLE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C12.6 8.5 15.5 11.4 24 12C15.5 12.6 12.6 15.5 12 24C11.4 15.5 8.5 12.6 0 12C8.5 11.4 11.4 8.5 12 0Z" fill="currentColor"/></svg>`;

// A pillar of light over an epic (blue) or legendary (purple): thin bright core, wide soft halo, up past the top of the screen.
function beam(g, x, y, kind, delay, life, tapY) {
  const leg = kind === "legendary";
  const col = leg ? "170, 80, 255" : "70, 130, 255";
  const H = Math.max(260, tapY + y + 40);
  const end = life - delay;
  const mk = (w, bg, blur, op) => {
    const b = el(g, "gd-beam", `left:${x}px;top:${y - H}px;height:${H}px;width:${w}px;margin-left:${-w / 2}px;background:${bg};filter:blur(${blur}px);opacity:0`);
    b.animate([{ opacity: 0, transform: "scaleY(.05)" }, { opacity: op, transform: "scaleY(1)", offset: 0.07 }, { opacity: op * 0.8, offset: 0.5 }, { opacity: op, offset: 0.8 }, { opacity: 0, transform: "scaleY(1)" }],
      { duration: end, delay, fill: "both" });
  };
  mk(leg ? 46 : 36, `linear-gradient(90deg, transparent, rgba(${col}, .5), transparent)`, 6, 0.55);
  mk(leg ? 12 : 9, `linear-gradient(90deg, transparent, rgba(${col}, .95) 35%, rgba(235,240,255,.95) 50%, rgba(${col}, .95) 65%, transparent)`, 1.2, 0.9);
  if (leg) for (let i = 0; i < 14; i++) {
    const s2 = el(g, "gd-mote", `left:${x + rnd(-12, 12)}px;top:${y}px;background:#f1dcff;box-shadow:0 0 5px 1px rgba(${col}, .9);opacity:0`);
    s2.animate([{ transform: "translate(0,0)", opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `translate(${rnd(-16, 16)}px, ${-rnd(80, 240)}px)`, opacity: 0 }],
      { duration: rnd(1200, 2200), delay: delay + rnd(0, Math.max(200, end - 2200)), easing: "ease-out", fill: "both" });
  }
}

