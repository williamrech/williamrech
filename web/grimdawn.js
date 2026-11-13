// ⚔️ Grim Dawn pack (occasion effect). Loaded only when the effect is on, so nobody else downloads it.
// Background: ash falling and a few embers rising. Tapping empty background does one of:
//  • a loot explosion: items fly out, land with their names in rarity colors, then vanish;
//  • a small red chthonic rift that tears open and closes;
//  • rarely, a purple riftgate that grows out of the ground while a ring of salt is poured around it.
// Original drawings and names, in the game's mood (Victorian grimdark, iron as money, PT-BR terms).

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
  box-shadow: 0 0 4px 1px #46ff9a, 0 0 10px 2px rgba(70, 255, 154, .35); animation: gd-ember-rise ease-out infinite; will-change: transform, opacity; }
@keyframes gd-ember-rise {
  0% { transform: translate(0, 0); opacity: 0; }
  10% { opacity: 1; } 30% { opacity: .55; } 45% { opacity: .95; } 70% { opacity: .5; }
  100% { transform: translate(var(--sway), -70vh); opacity: 0; }
}
.gd-fx { position: absolute; pointer-events: none; }
.gd-portal { position: absolute; border-radius: 50%; overflow: hidden;
  -webkit-mask-image: radial-gradient(closest-side, #000 62%, transparent 100%); mask-image: radial-gradient(closest-side, #000 62%, transparent 100%); }
.gd-portal i { position: absolute; inset: -25%; border-radius: 50%; }
.gd-portal .core { inset: 0; background: radial-gradient(closest-side, #000 0, rgba(0,0,0,.92) 28%, rgba(0,0,0,.35) 55%, transparent 75%); }
.gd-rim { position: absolute; border-radius: 50%; }
.gd-mote { position: absolute; width: 3px; height: 3px; border-radius: 50%; }
.gd-salt { position: absolute; overflow: visible; }
.gd-item { position: absolute; width: 56px; height: 56px; margin: -28px 0 0 -28px; will-change: transform; }
.gd-item svg { width: 100%; height: 100%; display: block; overflow: visible; filter: url(#gd-solid); }
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
  // Makes flat item drawings read as solid objects: a bevel from the shape's edge, a hard highlight, grit.
  document.body.insertAdjacentHTML("beforeend", `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="gd-solid" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceAlpha" stdDeviation="1.1" result="b"/>
<feDiffuseLighting in="b" surfaceScale="5" diffuseConstant="1.15" lighting-color="#fff" result="d"><feDistantLight azimuth="225" elevation="42"/></feDiffuseLighting>
<feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1.3" k2=".1" k3="0" k4="0" result="lit"/>
<feSpecularLighting in="b" surfaceScale="5" specularConstant=".45" specularExponent="30" lighting-color="#cfd8e2" result="s"><feDistantLight azimuth="225" elevation="50"/></feSpecularLighting>
<feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="4" result="n"/>
<feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 .9" result="grit"/>
<feComposite in="lit" in2="grit" operator="in" result="worn"/>
<feMerge result="m"><feMergeNode in="lit"/></feMerge>
<feBlend in="worn" in2="lit" mode="multiply" result="base"/>
<feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>
<feComposite in="base" in2="s2" operator="arithmetic" k1="0" k2="1" k3=".8" k4="0" result="out"/>
<feComposite in="out" in2="SourceAlpha" operator="in"/>
</filter></svg>`);
  const s = document.createElement("style");
  s.id = "gd-css";
  s.textContent = CSS;
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
  for (let i = 0; i < Math.round(14 * scale) + 1; i++) {
    const e = document.createElement("i");
    e.className = "gd-ember";
    const w = rnd(1.6, 3.2) * k;
    e.style.cssText = `left:${rnd(3, 97)}%;width:${w}px;height:${w}px;--sway:${rnd(-40, 40) * scale}px;`
      + `animation-duration:${rnd(6, 11)}s;animation-delay:${rnd(-11, 0)}s`;
    layer.appendChild(e);
  }
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
  radial-gradient(120% 55% at 50% 112%, color-mix(in srgb, #46ff9a 16%, transparent), transparent 70%),
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
// ---------- The bottom of the screen: what's left of Cairn ----------
// Rolling smoke (the app's fog engine, tinted), then a mound of rubble with skulls, ribs, bones and blood, a
// sword planted in it. A crow flies in and perches on a skull now and then (any tap scares it off), and
// aether lightning flashes far away. Shapes get a stone/bone bevel + grit from an SVG lighting filter.
const f1 = (n) => n.toFixed(1);
function seeded(seed) { let r = seed; return () => ((r = (r * 9301 + 49297) % 233280) / 233280); }
const BOTTOM_CSS = `
.gd-storm { position: absolute; inset: 0; opacity: 0; pointer-events: none; background: radial-gradient(90% 55% at 62% 0, rgba(150, 255, 205, .55), transparent 70%); }
.gd-rubble { position: absolute; left: 0; right: 0; bottom: 0; height: min(27vh, 220px); z-index: 5; pointer-events: none; }
.gd-rubble svg { width: 100%; height: 100%; display: block; overflow: visible; }
.gd-rubble .fade { position: absolute; left: 0; right: 0; bottom: 0; height: 38%; background: linear-gradient(to top, rgba(0,0,0,.75), transparent); }
.gd-crow { transform-box: fill-box; }
.gd-crow .wing { display: none; transform-box: fill-box; transform-origin: 50% 100%; }
.gd-crow.flying .wing { display: inline; animation: gd-flap .28s ease-in-out infinite alternate; }
.gd-crow.flying .perch { display: none; }
.gd-crow.perched .perch { transform-box: fill-box; transform-origin: 45% 100%; animation: gd-peck 7s ease-in-out infinite; }
@keyframes gd-flap { from { transform: scaleY(1); } to { transform: scaleY(-.55); } }
@keyframes gd-peck { 0%, 62%, 74%, 100% { transform: rotate(0); } 66% { transform: rotate(16deg); } 70% { transform: rotate(-5deg); } }
body.gd-skin .fog-strip { filter: blur(14px); }
body.gd-skin .fog-strip path { fill: color-mix(in srgb, #3fe08c 20%, #0b0f0d); }
body.gd-skin .haunt-fog { opacity: .25 !important; }
`;
const STONE_FILTER = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="gd-stone" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceAlpha" stdDeviation="1.3" result="b"/>
<feDiffuseLighting in="b" surfaceScale="6" diffuseConstant="1.1" lighting-color="#e6fff2" result="d"><feDistantLight azimuth="255" elevation="38"/></feDiffuseLighting>
<feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1.5" k2=".1" k3="0" k4="0" result="lit"/>
<feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="7" result="n"/>
<feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.05" result="grit"/>
<feComposite in="lit" in2="grit" operator="in" result="worn"/>
<feBlend in="worn" in2="lit" mode="multiply" result="base"/>
<feComposite in="base" in2="SourceAlpha" operator="in"/>
</filter></svg>`;
function rubbleSvg() {
  const R = seeded(19), F = `filter="url(#gd-stone)"`;
  const rock = (cx, cy, r, fill) => {
    const n = 5 + Math.floor(R() * 3); let d = "";
    for (let k = 0; k < n; k++) { const a = (k / n) * 6.283 + R() * 0.5, rr = r * (0.72 + R() * 0.45); d += `${k ? "L" : "M"}${f1(cx + Math.cos(a) * rr)} ${f1(cy + Math.sin(a) * rr * 0.72)}`; }
    return `<path ${F} d="${d}Z" fill="${fill}"/>`;
  };
  const skull = (x, y, sc, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})"><path ${F} d="M-10 0C-10 -15 10 -15 10 0C10 5 7 7 6.5 9L6 14H-6L-6.5 9C-7 7 -10 5 -10 0Z" fill="#a39a82"/>`
    + `<ellipse cx="-4.2" cy="1" rx="2.9" ry="3.2" fill="#070706"/><ellipse cx="4.2" cy="1" rx="2.9" ry="3.2" fill="#070706"/><path d="M0 5L-1.6 9H1.6Z" fill="#070706"/>`
    + `<path d="M-3.6 10.5V14M-1.2 10.5V14M1.2 10.5V14M3.6 10.5V14" stroke="#1a1814" stroke-width=".8"/></g>`;
  const bone = (x, y, len, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})" ${F}><rect x="0" y="-1.6" width="${len}" height="3.2" rx="1.4" fill="#948b74"/><circle cx="0" cy="-1.8" r="2.4" fill="#948b74"/><circle cx="0" cy="1.8" r="2.4" fill="#948b74"/><circle cx="${len}" cy="-1.8" r="2.4" fill="#948b74"/><circle cx="${len}" cy="1.8" r="2.4" fill="#948b74"/></g>`;
  let o = "";
  const greys = ["#2b2f2d", "#343937", "#242826", "#3a3f3c"], dark = ["#1b1e1d", "#222624", "#151817"];
  for (let x = -12; x < 412; x += 15 + R() * 14) o += rock(x, 98 + R() * 12, 13 + R() * 11, pick2(R, greys)); // back row
  // The sword, planted (its foot is buried by the front rocks).
  o += `<g transform="rotate(10 215 104)"><path ${F} d="M212.6 38H217.4L217 108H213Z" fill="#7b8580"/><path d="M215 40V104" stroke="#2c312f" stroke-width=".7"/>`
    + `<rect ${F} x="203.5" y="34" width="23" height="4.2" rx="1" fill="#5d5340"/><rect x="213.4" y="20" width="3.2" height="14" fill="#2e2219"/><circle ${F} cx="215" cy="18" r="3.3" fill="#5d5340"/>`
    + `<path d="M213.2 60Q214.5 70 213.4 84L214.6 84Q215.6 70 214.4 60Z" fill="#5a0b0b" opacity=".9"/></g>`;
  // Remains.
  o += `<g ${F} fill="none" stroke="#8f8670" stroke-width="2.3" stroke-linecap="round"><path d="M262 104Q282 96 304 102"/>`
    + [0, 1, 2, 3, 4].map((k) => `<path d="M${268 + k * 8} ${102 - k * 0.4}q${3 + k * 0.3} ${-19 + k * 1.5} ${11 - k * 0.6} ${-3 + k * 0.6}"/>`).join("") + `</g>`;
  o += bone(132, 110, 26, -14) + bone(318, 112, 22, 22) + bone(64, 113, 18, 8);
  o += skull(112, 100, 1.05, -16) + skull(176, 108, 0.82, 22) + skull(252, 104, 0.92, -6) + skull(346, 108, 0.75, 14);
  // Blood, pooled dark between the stones and run down a few of them.
  o += `<path d="M96 116Q120 108 150 114Q172 110 196 117Q170 126 140 123Q112 126 96 116Z" fill="#4d0808" opacity=".92"/><path d="M118 114Q134 111 150 115" stroke="#a02020" stroke-width="1" fill="none" opacity=".55"/>`
    + `<path d="M238 116Q262 110 290 116Q268 123 238 116Z" fill="#430707" opacity=".9"/><path d="M110 108q1 6 -.5 10M256 110q1.2 5 0 8M180 114q.8 4 0 7" stroke="#5c0a0a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  for (let x = -16; x < 416; x += 20 + R() * 22) o += rock(x, 124 + R() * 8, 17 + R() * 14, pick2(R, dark)); // front row
  for (let k = 0; k < 16; k++) o += rock(R() * 400, 112 + R() * 14, 2.5 + R() * 3.5, pick2(R, greys)); // debris
  // The crow (starts hidden; perches on a skull).
  o += `<g class="gd-crow" style="display:none" fill="#1a1f1d"><g transform="translate(110 87) scale(1.2)">`
    + `<g class="perch"><path ${F} d="M-13 1L-23 6L-12 -3C-10 -9 -4 -13 3 -13C5 -17 8 -19 11.5 -18C13.5 -17.4 14.4 -16 14.8 -15L20.5 -13.4L14.6 -12.3C14 -9 12 -6 8 -3C4 0 -4 2 -9 1.4Z"/>`
    + `<path d="M-2 0V4M3 -1V4" stroke="#1a1f1d" stroke-width="1.2"/><circle cx="11.6" cy="-15.4" r=".7" fill="#7dffb6"/></g>`
    + `<g class="fly"><path class="wing" d="M-1 -9L-20 -24L-6 -8Z"/><path class="wing" d="M1 -9L20 -24L6 -8Z"/></g>`
    + `</g></g>`;
  return `<svg viewBox="0 -24 400 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${o}</svg>`;
}
const pick2 = (R, arr) => arr[Math.floor(R() * arr.length)];
let scareCrow = null;
function startCrow(box) {
  const crow = box.querySelector(".gd-crow");
  if (!crow || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // While flying it shows a small body with flapping wings; perched, the full bird.
  crow.querySelector(".fly").insertAdjacentHTML("afterbegin", `<ellipse class="wing" style="animation:none" cx="0" cy="-8" rx="6.5" ry="3.2"/><path class="wing" style="animation:none" d="M5 -9L11 -7.5L5 -6.5Z"/>`);
  let timer = 0, state = "away";
  const later = (fn, ms) => { clearTimeout(timer); timer = setTimeout(fn, ms); };
  const leave = () => {
    if (state !== "perched") return;
    state = "leaving"; crow.setAttribute("class", "gd-crow flying");
    crow.animate([{ transform: "translate(0px, 0px)" }, { transform: "translate(-240px, -190px)" }], { duration: 1700, easing: "cubic-bezier(.5,0,.8,.6)", fill: "forwards" })
      .finished.then(() => { crow.style.display = "none"; state = "away"; later(arrive, rnd(25000, 60000)); }, () => {});
  };
  const arrive = () => {
    if (!crow.isConnected) return;
    if (document.hidden) return later(arrive, 8000);
    state = "arriving"; crow.style.display = ""; crow.setAttribute("class", "gd-crow flying");
    crow.animate([{ transform: "translate(210px, -170px)" }, { transform: "translate(0px, 0px)" }], { duration: 2400, easing: "cubic-bezier(.2,.6,.3,1)", fill: "forwards" })
      .finished.then(() => { state = "perched"; crow.setAttribute("class", "gd-crow perched"); later(leave, rnd(18000, 45000)); }, () => {});
  };
  scareCrow = () => { if (crow.isConnected) leave(); };
  later(arrive, rnd(3500, 8000));
}
export function startScene(layer, helpers = {}) {
  ensureSkin();
  if (!document.getElementById("gd-bottom-css")) {
    const st = document.createElement("style"); st.id = "gd-bottom-css"; st.textContent = BOTTOM_CSS; document.head.appendChild(st);
    document.body.insertAdjacentHTML("beforeend", STONE_FILTER);
  }
  layer.insertAdjacentHTML("beforeend", `<div class="gd-backdrop"><div class="glow"></div><div class="mist"></div><div class="grain"></div><div class="gd-storm"></div></div>`);
  const storm = layer.querySelector(".gd-storm");
  if (helpers.fog) helpers.fog(); // rolling smoke strips (pushed by swipes, swelling on scroll)
  layer.insertAdjacentHTML("beforeend", `<div class="gd-rubble">${rubbleSvg()}<div class="fade"></div></div>`);
  startCrow(layer.lastElementChild);
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
export function grimTap(x, y, layer, force) { // force (tests only): "loot" | "rift" | "gate", lucky: 0..1
  ensureCss();
  if (scareCrow) scareCrow();
  if (!force && layer.querySelectorAll(".gd-fx").length >= 4) return; // don't pile up
  let r = force ? { loot: 0, rift: 0.6, gate: 0.9 }[force.kind] : Math.random();
  if (r >= 0.55 && !force && layer.querySelector(".gd-portal")) r = 0; // only one portal at a time: loot instead
  if (r < 0.55) loot(x, y, layer, force && force.lucky);
  else if (r < 0.86) chthonicRift(x, y, layer);
  else riftgate(x, y, layer);
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

// A swirling portal: two counter-rotating streaked layers, a dark void core, a glowing rim and motes sucked in.
function portal(g, w, h, cols) {
  const p = el(g, "gd-portal", `left:${-w / 2}px;top:${-h / 2}px;width:${w}px;height:${h}px`);
  const swirl = (c) => `conic-gradient(from 0deg, ${c[0]}, ${c[1]} 7%, ${c[2]} 16%, ${c[1]} 27%, ${c[0]} 36%, ${c[3]} 46%, ${c[2]} 58%, ${c[1]} 69%, ${c[0]} 80%, ${c[3]} 90%, ${c[0]})`;
  const streak = (c) => `repeating-conic-gradient(from 10deg, transparent 0 9deg, ${c} 11deg, transparent 15deg 26deg)`;
  const a = el(p, "", `background:${swirl(cols.swirl)};filter:blur(1.5px)`);
  const b = el(p, "", `background:${streak(cols.streak)};mix-blend-mode:screen;opacity:.8;filter:blur(.8px)`);
  el(p, "core");
  a.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { duration: 2200, iterations: Infinity });
  b.animate([{ transform: "rotate(360deg) scale(1.1)" }, { transform: "rotate(0deg) scale(1.1)" }], { duration: 1500, iterations: Infinity });
  const rim = el(g, "gd-rim", `left:${-w / 2}px;top:${-h / 2}px;width:${w}px;height:${h}px;border:1.5px solid ${cols.rim};`
    + `box-shadow:0 0 10px 2px ${cols.glow}, 0 0 28px 6px ${cols.glow2}, inset 0 0 12px 2px ${cols.glow}`);
  return { p, rim, a, b };
}
function motes(g, w, h, color, n, ms) {
  for (let i = 0; i < n; i++) {
    const ang = rnd(0, Math.PI * 2), d = rnd(0.9, 1.6);
    const m = el(g, "gd-mote", `background:${color};box-shadow:0 0 4px 1px ${color}`);
    m.animate([
      { transform: `translate(${Math.cos(ang) * w * d}px, ${Math.sin(ang) * h * d * 0.8}px) scale(1)`, opacity: 0 },
      { opacity: 1, offset: 0.3 },
      { transform: "translate(0, 0) scale(.3)", opacity: 0 },
    ], { duration: rnd(600, 1100), delay: rnd(0, ms), easing: "cubic-bezier(.5,0,.9,.6)", fill: "both" });
  }
}
const OPEN = "cubic-bezier(.2,1.5,.4,1)";

// Small red tear into the Void.
function chthonicRift(x, y, layer) {
  const w = rnd(46, 70), h = w * rnd(1.45, 1.7), g = box(layer, x, y);
  const { p, rim } = portal(g, w, h, {
    swirl: ["#160002", "#ff3a1c", "#5c0207", "#b80d14"], streak: "rgba(255, 140, 90, .55)",
    rim: "rgba(255, 110, 70, .8)", glow: "rgba(255, 30, 20, .75)", glow2: "rgba(160, 0, 10, .45)",
  });
  const life = rnd(1900, 2600);
  const frames = [
    { transform: "scale(.04, .25)", opacity: 0 },
    { transform: "scale(1.08, 1.02)", opacity: 1, offset: 0.13 },
    { transform: "scale(1, 1)", opacity: 1, offset: 0.2 },
    { transform: "scale(.96, 1.03)", opacity: 1, offset: 0.55 },
    { transform: "scale(1.02, .98)", opacity: 1, offset: 0.82 },
    { transform: "scale(.02, .6)", opacity: 0 },
  ];
  for (const n of [p, rim]) n.animate(frames, { duration: life, easing: "ease-in-out", fill: "both" });
  motes(g, w, h, "#ff5a32", 12, life * 0.7);
  flash(g, w * 1.3, "rgba(255, 60, 30, .55)", life - 260);
  setTimeout(() => g.remove(), life + 400);
}

// A riftgate: grows while the salt ring is poured, flares when the ring closes, then shuts.
function riftgate(x, y, layer) {
  const w = rnd(96, 124), h = w * 1.5, g = box(layer, x, Math.max(y, h * 0.55 + 10));
  const total = 5000;
  // Salt ring on the ground, drawn in perspective around the portal's foot.
  const rx = w * 1.05, ry = w * 0.3, cy = h * 0.47, id = `gds${++seq}`;
  const svgW = rx * 2 + 20, svgH = ry * 2 + 20;
  const salt = el(g, "svg", `position:absolute;left:${-svgW / 2}px;top:${cy - svgH / 2}px;width:${svgW}px;height:${svgH}px`,
    `<svg class="gd-salt" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" aria-hidden="true">
<defs><mask id="${id}"><ellipse cx="${svgW / 2}" cy="${svgH / 2}" rx="${rx}" ry="${ry}" fill="none" stroke="#fff" stroke-width="16" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></mask>
<radialGradient id="${id}g"><stop offset="0" stop-color="#b45cff" stop-opacity=".45"/><stop offset="1" stop-color="#b45cff" stop-opacity="0"/></radialGradient></defs>
<ellipse class="gd-groundglow" cx="${svgW / 2}" cy="${svgH / 2}" rx="${rx * 0.95}" ry="${ry * 0.95}" fill="url(#${id}g)" opacity="0"/>
<g mask="url(#${id})" fill="none" stroke-linecap="round">
<ellipse cx="${svgW / 2}" cy="${svgH / 2}" rx="${rx}" ry="${ry}" stroke="#ece6d8" stroke-width="3.2" stroke-dasharray="0.1 3.1"/>
<ellipse cx="${svgW / 2}" cy="${svgH / 2}" rx="${rx - 3}" ry="${ry - 1.5}" stroke="#d6cfbf" stroke-width="2" stroke-dasharray="0.1 4.3" stroke-dashoffset="2"/>
<ellipse cx="${svgW / 2}" cy="${svgH / 2}" rx="${rx + 3}" ry="${ry + 1.5}" stroke="#fffaf0" stroke-width="1.4" stroke-dasharray="0.1 6.5" opacity=".8"/>
</g></svg>`);
  const maskE = salt.querySelector("mask ellipse"), groundGlow = salt.querySelector(".gd-groundglow");
  // The portal grows out of the ground while the salt is poured around it (same 1.6s), then flares when the ring closes.
  const gate = portal(g, w, h, {
    swirl: ["#0c0216", "#c77bff", "#3c0a6e", "#8a2be2"], streak: "rgba(225, 190, 255, .55)",
    rim: "rgba(220, 170, 255, .85)", glow: "rgba(170, 70, 255, .75)", glow2: "rgba(90, 20, 170, .45)",
  });
  const all = [gate.p, gate.rim];
  const pour = 1600;
  for (const n of all) {
    n.style.transformOrigin = "50% 88%";
    n.animate([
      { transform: "scale(.06, .04)", opacity: 0 },
      { transform: "scale(.3, .22)", opacity: 1, offset: 0.12 },
      { transform: "scale(.7, .62)", offset: 0.55 },
      { transform: "scale(1.05, 1.03)", offset: 0.9 },
      { transform: "scale(1, 1)", opacity: 1 },
    ], { duration: pour, easing: "ease-out", fill: "backwards" });
  }
  motes(g, w, h, "#d6a6ff", 10, pour);
  maskE.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: pour, easing: "ease-in-out", fill: "forwards" });
  const turn = pour;
  groundGlow.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: turn, fill: "forwards" });
  flash(g, w * 1.6, "rgba(200, 140, 255, .6)", turn - 80);
  for (const n of all) n.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.7)" }, { filter: "brightness(1)" }], { duration: 500, delay: turn - 80 });
  setTimeout(() => motes(g, w, h, "#d6a6ff", 14, 1400), turn);
  // Close.
  const close = 3900;
  for (const n of all) n.animate([{ transform: "scale(1, 1)", filter: "brightness(1)" }, { transform: "scale(1.04, 1)", filter: "brightness(1.8)", offset: 0.3 }, { transform: "scale(.02, .5)", filter: "brightness(1)" }],
    { duration: 520, delay: close, easing: "ease-in", fill: "forwards" });
  flash(g, w * 1.2, "rgba(220, 180, 255, .55)", close + 380);
  salt.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 800, delay: close + 300, fill: "forwards" });
  setTimeout(() => g.remove(), total + 300);
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
      const node = el(g, "gd-item", "", ART[it.art] || ART.cleaver);
      const peak = -rnd(70, 120), rot = rnd(-260, 260), lie = rnd(-70, 70);
      node.animate([
        { transform: "translate(0px, 0px) rotate(0deg) scale(.4)", easing: "cubic-bezier(.3,.7,.6,1)" },
        { transform: `translate(${dx * 0.5}px, ${peak}px) rotate(${rot}deg) scale(1)`, offset: 0.45, easing: "cubic-bezier(.5,0,.9,.5)" },
        { transform: `translate(${dx}px, ${dy}px) scale(1, .78) rotate(${lie}deg)`, offset: 0.86, easing: "ease-out" },
        { transform: `translate(${dx}px, ${dy - 3}px) scale(1, .78) rotate(${lie * 0.94}deg)`, offset: 0.93, easing: "ease-in" },
        { transform: `translate(${dx}px, ${dy}px) scale(1, .78) rotate(${lie}deg)` },
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

// ---------- Item drawings (32×32, dark outline, worn metal / wood / leather) ----------
const O = `stroke="none"`;
const METAL = "#6f777e", METAL_D = "#3d4349", WOOD = "#3a2a1d", WOOD_L = "#4a3625", LEATHER = "#3b2b20", BRASS = "#7d6638", BONE = "#9f967f";
const ART = {
  cleaver: `<svg viewBox="0 0 32 32"><path d="M4 6 L22 6 L23 18 Q14 21 5 17 Z" fill="${METAL}" ${O}/><path d="M6 8 L20 8" stroke="#aeb6bd" stroke-width="1"/><circle cx="18" cy="10" r="1.3" fill="#2a2724"/><path d="M22 10 L29 9 L29.5 13 L22.5 14 Z" fill="${WOOD}" ${O}/><path d="M9 15 l2 -1 m3 1.5 l2 -1" stroke="#7a2a1c" stroke-width="1.1" opacity=".8"/></svg>`,
  sword: `<svg viewBox="0 0 32 32"><g transform="rotate(45 16 16)"><path d="M16 1.5 L18 5 L18 20 L14 20 L14 5 Z" fill="${METAL}" ${O}/><path d="M16 4 L16 19" stroke="#aeb6bd" stroke-width=".9"/><path d="M10 20 L22 20 L22 22 L10 22 Z" fill="${BRASS}" ${O}/><path d="M14.8 22 L17.2 22 L17.2 28 L14.8 28 Z" fill="${LEATHER}" ${O}/><circle cx="16" cy="29.5" r="1.8" fill="${BRASS}" ${O}/></g></svg>`,
  axe: `<svg viewBox="0 0 32 32"><path d="M8 29 L22 5" stroke="#15181a" stroke-width="4.2" stroke-linecap="round"/><path d="M8 29 L22 5" stroke="${WOOD_L}" stroke-width="2.4" stroke-linecap="round"/><path d="M17 7 Q25 3 29 10 Q26 16 21 15 Z" fill="${METAL}" ${O}/><path d="M25 6 Q28 9 27.5 12" stroke="#aeb6bd" stroke-width="1" fill="none"/></svg>`,
  mace: `<svg viewBox="0 0 32 32"><path d="M7 28 L19 13" stroke="#15181a" stroke-width="4" stroke-linecap="round"/><path d="M7 28 L19 13" stroke="${WOOD}" stroke-width="2.2" stroke-linecap="round"/><path d="M21 4 L23 8 L28 7 L25 11 L29 14 L24 15 L24 20 L20 16 L16 18 L18 13 L14 10 L19 10 Z" fill="${METAL_D}" ${O}/><circle cx="21.5" cy="11.5" r="3.6" fill="${METAL}" ${O}/></svg>`,
  pistol: `<svg viewBox="0 0 32 32"><path d="M3 11 L22 11 L22 15 L3 15 Z" fill="${METAL_D}" ${O}/><path d="M3 12.2 L21 12.2" stroke="#aeb6bd" stroke-width=".9"/><path d="M15 11 L28 10 Q30 13 27 15 L24 16 L27 26 Q25 28 21 27 L19 16 L15 15 Z" fill="${WOOD}" ${O}/><path d="M19 9 L21 6 L22.5 7 L21 10" fill="${METAL}" ${O}/><path d="M19.5 17 Q18 20 20.5 21" fill="none" ${O}/></svg>`,
  dagger: `<svg viewBox="0 0 32 32"><g transform="rotate(-40 16 16)"><path d="M16 3 Q19 9 18 18 L14 18 Q13 9 16 3 Z" fill="${METAL}" ${O}/><path d="M12 18 L20 18 L20 20 L12 20 Z" fill="${METAL_D}" ${O}/><path d="M14.8 20 L17.2 20 L17.2 27 L14.8 27 Z" fill="${BONE}" ${O}/></g></svg>`,
  shield: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12.5" fill="${WOOD}" ${O}/><path d="M9 6.5 L9 25.5 M16 3.5 L16 28.5 M23 6.5 L23 25.5" stroke="#3e2714" stroke-width="1"/><circle cx="16" cy="16" r="12.5" fill="none" stroke="${METAL_D}" stroke-width="2.4"/><circle cx="16" cy="16" r="4" fill="${METAL}" ${O}/><circle cx="14.8" cy="14.8" r="1.1" fill="#e4e4dc"/></svg>`,
  helm: `<svg viewBox="0 0 32 32"><path d="M6 20 Q6 6 16 5 Q26 6 26 20 L26 25 L20 25 L20 18 L12 18 L12 25 L6 25 Z" fill="${METAL}" ${O}/><path d="M16 5 L16 18" stroke="${METAL_D}" stroke-width="1.6"/><path d="M8 12 Q10 8 13 7" stroke="#aeb6bd" stroke-width="1" fill="none"/><path d="M12 18 L20 18 L20 21 L12 21 Z" fill="#1d1712"/></svg>`,
  chest: `<svg viewBox="0 0 32 32"><path d="M9 4 L13 6 Q16 8 19 6 L23 4 L29 9 L26 14 L24 12 L24 28 L8 28 L8 12 L6 14 L3 9 Z" fill="${LEATHER}" ${O}/><path d="M16 8 L16 28" stroke="#2c1b0f" stroke-width="1.2"/><circle cx="14" cy="13" r=".9" fill="${BRASS}"/><circle cx="14" cy="18" r=".9" fill="${BRASS}"/><circle cx="14" cy="23" r=".9" fill="${BRASS}"/><path d="M8 20 L24 20" stroke="#2c1b0f" stroke-width="1.6"/></svg>`,
  ring: `<svg viewBox="0 0 32 32"><ellipse cx="16" cy="19" rx="8.5" ry="7.5" fill="none" stroke="#15181a" stroke-width="5"/><ellipse cx="16" cy="19" rx="8.5" ry="7.5" fill="none" stroke="${BRASS}" stroke-width="2.8"/><path d="M12 11 L16 6 L20 11 L16 14 Z" fill="#6a1820" ${O}/><path d="M14 10 L16 7.5" stroke="#ff9aa4" stroke-width=".9"/></svg>`,
  amulet: `<svg viewBox="0 0 32 32"><path d="M6 3 Q16 17 26 3" fill="none" stroke="#15181a" stroke-width="2.6"/><path d="M6 3 Q16 17 26 3" fill="none" stroke="${BRASS}" stroke-width="1.2" stroke-dasharray="1.6 1"/><path d="M16 12 L22 20 L16 29 L10 20 Z" fill="${BONE}" ${O}/><circle cx="16" cy="20" r="2.6" fill="#1f5038" ${O}/></svg>`,
  scepter: `<svg viewBox="0 0 32 32"><path d="M8 29 L20 11" stroke="#15181a" stroke-width="3.6" stroke-linecap="round"/><path d="M8 29 L20 11" stroke="${BRASS}" stroke-width="1.8" stroke-linecap="round"/><path d="M19 4 L26 7 L25 13 L19 14 L16 9 Z" fill="${METAL_D}" ${O}/><circle cx="21" cy="9.5" r="2.4" fill="#2f8a66" ${O}/></svg>`,
  gloves: `<svg viewBox="0 0 32 32"><path d="M8 28 L8 17 L6 12 Q6 10 8 10.5 L10 14 L10 6 Q11 4.5 12.5 6 L13 13 L14 4.5 Q15.5 3 17 4.5 L16.6 13 L18.5 6 Q20 5 21 6.5 L19.5 15 L21.5 13 Q23.5 12.5 23 15 L19 22 L19 28 Z" fill="${LEATHER}" ${O}/><path d="M8 24 L19 24" stroke="${METAL_D}" stroke-width="2"/></svg>`,
  boots: `<svg viewBox="0 0 32 32"><path d="M10 3 L18 3 L18 19 Q26 19 28 24 L28 28 L8 28 L8 21 Q10 18 10 14 Z" fill="${LEATHER}" ${O}/><path d="M8 25 L28 25" stroke="#2c1b0f" stroke-width="2"/><path d="M10 9 L18 9" stroke="${BRASS}" stroke-width="1.4"/></svg>`,
  scroll: `<svg viewBox="0 0 32 32"><path d="M7 7 L25 7 L25 25 L7 25 Z" fill="#8f8263" ${O}/><path d="M5 5.5 Q5 3.5 7 3.5 L25 3.5 Q27 3.5 27 5.5 Q27 7.5 25 7.5 L7 7.5 Q5 7.5 5 5.5 Z" fill="#7a6d51" ${O}/><path d="M5 26.5 Q5 24.5 7 24.5 L25 24.5 Q27 24.5 27 26.5 Q27 28.5 25 28.5 L7 28.5 Q5 28.5 5 26.5 Z" fill="#7a6d51" ${O}/><path d="M10 11 L22 11 M10 14 L20 14 M10 17 L18 17" stroke="#6b5636" stroke-width="1"/><circle cx="21" cy="20" r="2.8" fill="#6a1818" ${O}/></svg>`,
  crystal: `<svg viewBox="0 0 32 32"><path d="M16 3 L22 12 L19 28 L13 28 L10 12 Z" fill="#1f7a55" ${O}/><path d="M16 3 L16 28 M10 12 L22 12" stroke="#0e5a37" stroke-width="1"/><path d="M14 7 L12.5 12" stroke="#c8ffe2" stroke-width="1.1"/><path d="M7 22 L10 16 L12 27 Z" fill="#17603f" ${O}/></svg>`,
};
