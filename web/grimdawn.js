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
.gd-ember { position: absolute; bottom: -8px; border-radius: 50%; background: #ffb257; pointer-events: none;
  box-shadow: 0 0 4px 1px #ff6a1a, 0 0 10px 2px rgba(255, 80, 20, .35); animation: gd-ember-rise ease-out infinite; will-change: transform, opacity; }
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
.gd-item { position: absolute; width: 36px; height: 36px; margin: -18px 0 0 -18px; filter: drop-shadow(0 3px 2px rgba(0,0,0,.7)); }
.gd-item svg { width: 100%; height: 100%; display: block; overflow: visible; }
.gd-bit { position: absolute; width: 6px; height: 5px; margin: -3px 0 0 -3px; background: linear-gradient(135deg, #c9c9c4, #6d6d6a);
  border-radius: 30% 60% 40% 50%; box-shadow: 0 1px 1px rgba(0,0,0,.7); }
.gd-label { position: absolute; transform: translateX(-50%); white-space: nowrap; font: 600 11px/1.25 Georgia, "Times New Roman", serif;
  padding: 1px 6px 2px; background: rgba(8, 6, 5, .78); border: 1px solid rgba(255,255,255,.08); border-radius: 2px; opacity: 0;
  text-shadow: 0 1px 1px #000; letter-spacing: .01em; }
.gd-beam { position: absolute; width: 16px; margin-left: -8px; transform-origin: 50% 100%;
  -webkit-mask-image: linear-gradient(to top, #000 0, rgba(0,0,0,.6) 40%, transparent 100%); mask-image: linear-gradient(to top, #000 0, rgba(0,0,0,.6) 40%, transparent 100%); }
.gd-glow { position: absolute; border-radius: 50%; }
.gd-flash { position: absolute; border-radius: 50%; }
`;
function ensureCss() {
  if (document.getElementById("gd-css")) return;
  const s = document.createElement("style");
  s.id = "gd-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ---------- Ash & embers ----------
export function startAsh(layer, scale = 1) {
  ensureCss();
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
  for (let i = 0; i < Math.round(7 * scale) + 1; i++) {
    const e = document.createElement("i");
    e.className = "gd-ember";
    const w = rnd(1.6, 3.2) * k;
    e.style.cssText = `left:${rnd(3, 97)}%;width:${w}px;height:${w}px;--sway:${rnd(-40, 40) * scale}px;`
      + `animation-duration:${rnd(6, 11)}s;animation-delay:${rnd(-11, 0)}s`;
    layer.appendChild(e);
  }
}

// ---------- The city burning on the horizon (behind the feed) ----------
// Inspired by the Malmouth key art: a huge pale domed palace far away, aether flames licking up between
// the layers, Victorian rooftops (mansards, chimney pots, smokestacks) getting darker as they come closer,
// and a black foreground of lamp posts, an iron fence and bare branches. Buildings never move; only the
// flames flicker and the glow breathes. Bottom 30% of the screen; scrolling shifts layers a few px (depth).
const SCENE_CSS = `
.gd-scene { position: absolute; left: 0; right: 0; bottom: 0; height: 30vh; pointer-events: none; --fire: #46ff9a; }
.gd-scene > * { position: absolute; left: 0; bottom: 0; width: 100%; height: 100%; }
.gd-scene svg { display: block; }
.gd-scene .sky { height: 150%; background:
  radial-gradient(55% 45% at 55% 72%, color-mix(in srgb, var(--fire) 55%, transparent), transparent 70%),
  radial-gradient(90% 60% at 50% 100%, color-mix(in srgb, var(--fire) 22%, transparent), transparent 80%); }
.gd-scene .pulse { height: 140%; background: radial-gradient(40% 35% at 55% 78%, color-mix(in srgb, var(--fire) 45%, #fff), transparent 70%);
  opacity: .25; animation: gd-breathe 5s ease-in-out infinite; will-change: opacity; }
@keyframes gd-breathe { 0%, 100% { opacity: .18; } 50% { opacity: .38; } }
.gd-scene .l1 { color: color-mix(in srgb, var(--fire) 42%, var(--bg)); opacity: .85; filter: blur(.8px); }
.gd-scene .l2 { color: color-mix(in srgb, var(--fire) 16%, var(--bg)); filter: drop-shadow(0 -1px 2px color-mix(in srgb, var(--fire) 55%, transparent)); }
.gd-scene .l3 { color: color-mix(in srgb, color-mix(in srgb, var(--fire) 8%, var(--bg)) 70%, black); filter: drop-shadow(0 -1px 1.5px color-mix(in srgb, var(--fire) 35%, transparent)); }
.gd-scene .l4 { color: color-mix(in srgb, var(--bg) 35%, black); }
.gd-scene .lamp { fill: color-mix(in srgb, var(--fire) 60%, #fff); }
.gd-scene .fog { background: linear-gradient(to top, color-mix(in srgb, var(--fire) 18%, transparent), transparent); }
.gd-scene .flames { transform-origin: 50% 100%; will-change: transform, opacity; filter: blur(1.2px) drop-shadow(0 0 6px var(--fire));
  animation: gd-flicker 2.2s ease-in-out infinite alternate; }
.gd-scene .flames path.o { fill: var(--fire); opacity: .55; }
.gd-scene .flames path.i { fill: color-mix(in srgb, var(--fire) 45%, #fff); opacity: .7; }
@keyframes gd-flicker {
  0% { transform: scale(1, 1) skewX(0deg); opacity: .85; }
  30% { transform: scale(1.01, 1.08) skewX(-2deg); opacity: 1; }
  60% { transform: scale(.99, .94) skewX(1.5deg); opacity: .8; }
  100% { transform: scale(1, 1.05) skewX(-1deg); opacity: .95; }
}
@media (prefers-reduced-motion: reduce) { .gd-scene .flames, .gd-scene .pulse { animation: none; } }
`;
function seeded(seed) { let r = seed; return () => ((r = (r * 9301 + 49297) % 233280) / 233280); }
const W = 700, H = 400; // drawn for a phone (about 390×250 px); wider screens crop the sides
const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;
// A Victorian townhouse: body, mansard roof with dormers, chimney stacks with pots; sometimes broken.
function townhouse(R, x, base, w, h) {
  const top = base - h, d = [rect(x, top, w, h)];
  const mh = 14 + R() * 14;
  d.push(`M${x - 2} ${top}L${x + 6} ${top - mh}H${x + w - 6}L${x + w + 2} ${top}Z`);
  for (let k = x + 10; k < x + w - 14; k += 16 + R() * 10) if (R() < 0.6) d.push(rect(k, top - mh * 0.7, 6, mh * 0.6));
  const stacks = 1 + Math.floor(R() * 2);
  for (let i = 0; i < stacks; i++) {
    const cx = x + (i + 0.5) * (w / stacks) + R() * 8 - 4, sh = 22 + R() * 26, sw = 12 + R() * 8;
    d.push(rect(cx - sw / 2, top - mh - sh, sw, sh + mh), rect(cx - sw / 2 - 2, top - mh - sh, sw + 4, 4));
    for (let p = 0; p < 2 + Math.floor(R() * 2); p++) d.push(rect(cx - sw / 2 + 1 + p * 5, top - mh - sh - 7, 3.2, 7));
  }
  if (R() < 0.3) d.push(`M${x + w * 0.55} ${top}L${x + w * 0.7} ${top - 10}L${x + w * 0.8} ${top + 6}Z`);
  return d.join("");
}
const smokestack = (x, base, h, w) => `M${x} ${base}L${x + 2} ${base - h}H${x + w - 2}L${x + w} ${base}Z` + rect(x - 1, base - h - 4, w + 2, 5);
// The palace far away: a stacked city on a hill, a domed hall in the middle, gothic spires around it.
function palace(R) {
  const d = [`M-20 ${H}V320Q150 300 300 268Q380 255 460 268Q600 296 720 318V${H}Z`];
  for (let x = -10; x < W; x += 14 + R() * 18) {
    const hill = 320 - 62 * Math.exp(-(((x - 380) / 170) ** 2));
    const h = 16 + R() * 40;
    d.push(rect(x, hill - h, 12 + R() * 16, h + 30));
    if (R() < 0.3) { const sx = x + 6; d.push(`M${sx - 4} ${hill - h}L${sx} ${hill - h - 30 - R() * 40}L${sx + 4} ${hill - h}Z`); }
  }
  d.push(rect(300, 190, 160, 90), `M308 190L380 160L452 190Z`, rect(334, 140, 92, 52), `M334 142Q334 72 380 62Q426 72 426 142Z`,
    rect(373, 42, 14, 22), `M375 44L380 14L385 44Z`);
  for (const [x, top, w] of [[262, 150, 26], [478, 168, 24], [222, 200, 18], [522, 206, 18], [600, 226, 14], [160, 236, 14]]) {
    d.push(rect(x, top, w, 160), `M${x - 3} ${top}L${x + w / 2} ${top - 46 - R() * 30}L${x + w + 3} ${top}Z`);
  }
  return d.join("");
}
// Flame tongues along a line: an outer flame and a brighter core each.
function flames(seed, base, x0, x1, minH, maxH, peak) {
  const R = seeded(seed); let o = "", i = "";
  for (let x = x0; x < x1; x += 12 + R() * 20) {
    const near = peak == null ? 1 : Math.exp(-(((x - peak) / 160) ** 2)) * 0.7 + 0.3;
    const h = (minH + R() * (maxH - minH)) * near, w = 16 + R() * 26, lean = R() * 16 - 8;
    const tong = (hh, ww) => `M${x - ww / 2} ${base}C${x - ww / 2} ${base - hh * 0.45} ${x + lean - ww * 0.15} ${base - hh * 0.6} ${x + lean} ${base - hh}`
      + `C${x + lean * 0.3 + ww * 0.25} ${base - hh * 0.55} ${x + ww / 2} ${base - hh * 0.4} ${x + ww / 2} ${base}Z`;
    o += tong(h, w); i += tong(h * 0.6, w * 0.45);
  }
  return `<path class="o" d="${o}"/><path class="i" d="${i}"/>`;
}
function bareTree(x, base, s, dir) {
  const R = seeded(Math.round(x * 13 + s * 7)); let d = `M${x} ${base}Q${x + dir * 8 * s} ${base - 60 * s} ${x + dir * 30 * s} ${base - 120 * s}`;
  for (let k = 0; k < 7; k++) {
    const t = 0.3 + R() * 0.65, bx = x + dir * 30 * s * t, by = base - 120 * s * t, len = (30 + R() * 50) * s, ang = (-90 + dir * (20 + R() * 60)) * Math.PI / 180;
    d += `M${bx} ${by}l${(Math.cos(ang) * len).toFixed(1)} ${(Math.sin(ang) * len).toFixed(1)}l${(dir * 8 * s).toFixed(1)} ${(-6 * s).toFixed(1)}`;
  }
  return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${2.2 * s}" stroke-linecap="round"/>`;
}
function lampPost(x, base, h) {
  return rect(x - 2, base - h, 4, h) + `M${x - 9} ${base - h}L${x - 6} ${base - h - 22}H${x + 6}L${x + 9} ${base - h}Z` + `M${x - 7} ${base - h - 22}L${x} ${base - h - 30}L${x + 7} ${base - h - 22}Z`;
}
export function startScene(layer) {
  if (!document.getElementById("gd-scene-css")) {
    const st = document.createElement("style"); st.id = "gd-scene-css"; st.textContent = SCENE_CSS; document.head.appendChild(st);
  }
  const R = seeded(31);
  const svg = (cls, inner) => `<svg class="${cls}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g fill="currentColor">${inner}</g></svg>`;
  // Middle: smokestacks on the left, townhouses, kept low in the center so the palace shows.
  let mid = smokestack(36, 360, 210, 14) + smokestack(70, 360, 240, 16) + smokestack(112, 360, 185, 12);
  for (let x = -10; x < W; ) {
    const w = 46 + R() * 40, center = Math.abs(x + w / 2 - 380) < 130;
    mid += townhouse(R, x, 362, w, center ? 34 + R() * 26 : 70 + R() * 70);
    x += w + 2 + R() * 6;
  }
  mid += `M-20 ${H}V360H720V${H}Z`;
  // Near: tall houses framing both sides, rubble in the middle, two lamp posts.
  const near = townhouse(R, -14, 386, 120, 170) + townhouse(R, 108, 386, 70, 110) + townhouse(R, 540, 386, 80, 130) + townhouse(R, 616, 386, 100, 185)
    + `M180 386L200 372L230 378L262 366L300 376L340 368L380 378L420 370L460 377L500 368L540 386Z` + `M-20 ${H}V384H720V${H}Z`;
  const lamps = lampPost(150, 388, 120) + lampPost(528, 388, 140);
  const lampGlow = `<rect class="lamp" x="145" y="${388 - 120 - 20}" width="10" height="16" rx="2"/><rect class="lamp" x="523" y="${388 - 140 - 20}" width="10" height="16" rx="2"/>`;
  // Foreground: an iron fence with spear tips, bare branches from both edges.
  let fence = `M-20 ${H}V394H720V${H}Z` + rect(-20, 372, 740, 3) + rect(-20, 386, 740, 3);
  for (let x = -4; x < W; x += 13) fence += rect(x, 366, 2.6, 30) + `M${x - 1.6} 367L${x + 1.3} 360L${x + 4.2} 367Z`;
  layer.insertAdjacentHTML("beforeend", `<div class="gd-scene">
<div class="sky"></div><div class="pulse"></div>
${svg("l1 depth", `<path d="${palace(seeded(5))}"/>`)}
${svg("flames f1", flames(17, 300, 120, 660, 40, 120, 380))}
<div class="fog" style="height:22%"></div>
${svg("l2 depth", `<path d="${mid}"/>`)}
${svg("flames f2", flames(29, 362, 200, 540, 18, 50, 360))}
${svg("l3 depth", `<path d="${near}"/><path d="${lamps}"/>${lampGlow}`)}
${svg("l4 depth", `<path d="${fence}"/>${bareTree(-6, 400, 1.3, 1)}${bareTree(706, 400, 1.15, -1)}`)}
</div>`);
  const box = layer.lastElementChild;
  // Each flame band flickers at its own pace.
  box.querySelector(".f2").style.animationDuration = "1.7s";
  box.querySelector(".f2").style.animationDelay = "-.6s";
  // Tiny parallax: near layers move a bit more than far ones as you scroll (a few px at most).
  const layers = [...box.querySelectorAll(".depth")], k = [0.006, 0.014, 0.024, 0.034], max = [4, 9, 15, 20];
  let ticking = false;
  const apply = () => {
    ticking = false;
    if (!box.isConnected) { removeEventListener("scroll", onScroll); return; }
    const y = Math.min(scrollY, 1200);
    layers.forEach((l, i) => { l.style.transform = `translateY(${Math.min(y * k[i], max[i]).toFixed(1)}px)`; });
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } };
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) addEventListener("scroll", onScroll, { passive: true });
  apply();
}

// ---------- Tap ----------
export function grimTap(x, y, layer, force) { // force (tests only): "loot" | "rift" | "gate", lucky: 0..1
  ensureCss();
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
  broken: "#8a8a86", common: "#ece8e0", magic: "#f3d64e", rare: "#45d64f", epic: "#4a90ff", legendary: "#b25cff",
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

  // Landing spots: fanned out sideways, kept on screen.
  const W = layer.clientWidth || innerWidth, H = layer.clientHeight || innerHeight;
  const spread = Math.min(155, 34 * (items.length + 1));
  const spots = items.map((_, i) => {
    const t = items.length === 1 ? 0 : i / (items.length - 1) - 0.5;
    let dx = t * 2 * spread + rnd(-14, 14), dy = (i % 2 ? rnd(28, 70) : rnd(-24, 12));
    dx = Math.max(24 - x, Math.min(W - 24 - x, dx));
    dy = Math.max(60 - y, Math.min(H - 30 - y, dy));
    return { dx, dy };
  });
  // Shuffle so the special one isn't always at the end.
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }

  const FLY = 760, life = items.some((it) => it.beam === "legendary") ? 5200 : items.some((it) => it.beam) ? 4300 : 3300;
  const labels = [];
  items.forEach((it, i) => {
    const { dx, dy } = spots[i];
    const node = el(g, "gd-item", it.beam ? `filter: drop-shadow(0 3px 2px rgba(0,0,0,.7)) drop-shadow(0 0 6px ${it.col})` : "", ART[it.art] || ART.cleaver);
    const peak = -rnd(60, 110), rot = rnd(-200, 200), lie = rnd(-35, 35);
    const delay = i * 40;
    node.animate([
      { transform: "translate(0px, 0px) rotate(0deg) scale(.5)", easing: "cubic-bezier(.3,.7,.6,1)" },
      { transform: `translate(${dx * 0.5}px, ${peak}px) rotate(${rot}deg) scale(1)`, offset: 0.45, easing: "cubic-bezier(.5,0,.9,.5)" },
      { transform: `translate(${dx}px, ${dy}px) rotate(${lie}deg) scale(1)`, offset: 0.84, easing: "ease-out" },
      { transform: `translate(${dx}px, ${dy - 5}px) rotate(${lie * 0.9}deg) scale(1)`, offset: 0.92, easing: "ease-in" },
      { transform: `translate(${dx}px, ${dy}px) rotate(${lie}deg) scale(1)` },
    ], { duration: FLY, delay, fill: "both" });
    if (it.broken) { // broken items crumble right after landing
      node.animate([{ opacity: 1, filter: "grayscale(1)" }, { opacity: 0, filter: "grayscale(1) blur(2px)", transform: `translate(${dx}px, ${dy + 6}px) rotate(${lie}deg) scale(.7)` }],
        { duration: 700, delay: delay + FLY + 700, fill: "forwards" });
    } else {
      node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: life - 500, fill: "forwards" });
    }
    if (it.beam) beam(g, dx, dy, it.beam, delay + FLY - 80, life);
    labels.push({ it, x: dx, y: dy - 30, delay: delay + FLY - 150, broken: it.broken });
  });

  // Iron bits: a little spray of nuggets with one label.
  if (iron) {
    const cx = Math.max(24 - x, Math.min(W - 24 - x, rnd(-30, 30))), cy = Math.max(60 - y, Math.min(H - 30 - y, rnd(8, 30)));
    for (let i = 0; i < Math.min(9, 3 + Math.round(iron / 10)); i++) {
      const b = el(g, "gd-bit");
      const bx = cx + rnd(-12, 12), by = cy + rnd(-5, 5), pk = -rnd(30, 70);
      b.animate([
        { transform: "translate(0,0) rotate(0deg)", easing: "cubic-bezier(.3,.7,.6,1)" },
        { transform: `translate(${bx * 0.5}px, ${pk}px) rotate(${rnd(-300, 300)}deg)`, offset: 0.45, easing: "cubic-bezier(.5,0,.9,.5)" },
        { transform: `translate(${bx}px, ${by}px) rotate(${rnd(-90, 90)}deg)` },
      ], { duration: FLY * 0.85, delay: rnd(0, 120), fill: "both" });
      b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: life - 500, fill: "forwards" });
    }
    labels.push({ it: { name: `${iron} Pedaços de Ferro`, col: COLOR.iron }, x: cx, y: cy - 16, delay: FLY - 100 });
  }

  // Labels: placed above their item, nudged up so they don't overlap (like the game stacking names).
  const placed = [];
  for (const L of labels) {
    const t = el(g, "gd-label", `left:${L.x}px;top:${L.y}px;color:${L.it.col}`);
    t.textContent = L.it.name;
    if (L.it.beam === "legendary") t.style.borderColor = "rgba(178, 92, 255, .55)";
    const w = t.offsetWidth, h = t.offsetHeight || 16;
    const left = Math.max(w / 2 + 4 - x, Math.min(W - w / 2 - 4 - x, L.x)); // keep it on screen
    let top = L.y;
    for (let tries = 0; tries < 12; tries++) {
      const hit = placed.find((p) => Math.abs(p.x - left) < (p.w + w) / 2 + 2 && Math.abs(p.y - top) < h + 1);
      if (!hit) break;
      top = hit.y - h - 2;
    }
    top = Math.max(8 - y, top);
    t.style.left = `${left}px`; t.style.top = `${top}px`;
    placed.push({ x: left, y: top, w });
    const end = L.broken ? L.delay + 150 + 1300 : life;
    t.animate([{ opacity: 0, transform: "translate(-50%, 3px)" }, { opacity: 1, transform: "translate(-50%, 0)" }],
      { duration: 220, delay: L.delay, fill: "forwards" });
    t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: end - 400, fill: "forwards" });
  }
  setTimeout(() => g.remove(), life + 200);
}

// Light beam over an epic (blue) or legendary (purple, taller, with sparkles and a ground glow).
function beam(g, x, y, kind, delay, life) {
  const leg = kind === "legendary";
  const col = leg ? "178, 92, 255" : "74, 144, 255";
  const H = leg ? 210 : 120;
  const glow = el(g, "gd-glow", `left:${x - 30}px;top:${y - 9}px;width:60px;height:18px;background:radial-gradient(closest-side, rgba(${col}, .7), transparent);opacity:0`);
  const b = el(g, "gd-beam", `left:${x}px;top:${y - H}px;height:${H}px;background:linear-gradient(90deg, transparent, rgba(${col}, .55) 30%, rgba(255,255,255,.85) 50%, rgba(${col}, .55) 70%, transparent);opacity:0`);
  const end = life - delay;
  b.animate([
    { opacity: 0, transform: "scaleY(.1)" }, { opacity: 1, transform: "scaleY(1)", offset: 0.08 },
    { opacity: 0.75, transform: "scaleY(1)", offset: 0.5 }, { opacity: 1, transform: "scaleY(1)", offset: 0.75 }, { opacity: 0, transform: "scaleY(1)" },
  ], { duration: end, delay, fill: "both" });
  glow.animate([{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 0.8, offset: 0.8 }, { opacity: 0 }], { duration: end, delay, fill: "both" });
  if (leg) {
    for (let i = 0; i < 12; i++) {
      const s = el(g, "gd-mote", `left:${x + rnd(-10, 10)}px;top:${y}px;background:#f1dcff;box-shadow:0 0 5px 1px rgba(${col}, .9);opacity:0`);
      s.animate([{ transform: "translate(0,0)", opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `translate(${rnd(-14, 14)}px, ${-rnd(60, 180)}px)`, opacity: 0 }],
        { duration: rnd(1200, 2000), delay: delay + rnd(0, end - 1800), easing: "ease-out", fill: "both" });
    }
  }
}

// ---------- Item drawings (32×32, dark outline, worn metal / wood / leather) ----------
const O = `stroke="#120c08" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"`;
const METAL = "#a9a9a2", METAL_D = "#6c6c66", WOOD = "#6b4527", WOOD_L = "#8a5e37", LEATHER = "#5a3a22", BRASS = "#b08a3c", BONE = "#d9cfb6";
const ART = {
  cleaver: `<svg viewBox="0 0 32 32"><path d="M4 6 L22 6 L23 18 Q14 21 5 17 Z" fill="${METAL}" ${O}/><path d="M6 8 L20 8" stroke="#d8d8d0" stroke-width="1"/><circle cx="18" cy="10" r="1.3" fill="#120c08"/><path d="M22 10 L29 9 L29.5 13 L22.5 14 Z" fill="${WOOD}" ${O}/><path d="M9 15 l2 -1 m3 1.5 l2 -1" stroke="#7a2a1c" stroke-width="1.1" opacity=".8"/></svg>`,
  sword: `<svg viewBox="0 0 32 32"><g transform="rotate(45 16 16)"><path d="M16 1.5 L18 5 L18 20 L14 20 L14 5 Z" fill="${METAL}" ${O}/><path d="M16 4 L16 19" stroke="#e4e4dc" stroke-width=".9"/><path d="M10 20 L22 20 L22 22 L10 22 Z" fill="${BRASS}" ${O}/><path d="M14.8 22 L17.2 22 L17.2 28 L14.8 28 Z" fill="${LEATHER}" ${O}/><circle cx="16" cy="29.5" r="1.8" fill="${BRASS}" ${O}/></g></svg>`,
  axe: `<svg viewBox="0 0 32 32"><path d="M8 29 L22 5" stroke="#120c08" stroke-width="4.2" stroke-linecap="round"/><path d="M8 29 L22 5" stroke="${WOOD_L}" stroke-width="2.4" stroke-linecap="round"/><path d="M17 7 Q25 3 29 10 Q26 16 21 15 Z" fill="${METAL}" ${O}/><path d="M25 6 Q28 9 27.5 12" stroke="#e4e4dc" stroke-width="1" fill="none"/></svg>`,
  mace: `<svg viewBox="0 0 32 32"><path d="M7 28 L19 13" stroke="#120c08" stroke-width="4" stroke-linecap="round"/><path d="M7 28 L19 13" stroke="${WOOD}" stroke-width="2.2" stroke-linecap="round"/><path d="M21 4 L23 8 L28 7 L25 11 L29 14 L24 15 L24 20 L20 16 L16 18 L18 13 L14 10 L19 10 Z" fill="${METAL_D}" ${O}/><circle cx="21.5" cy="11.5" r="3.6" fill="${METAL}" ${O}/></svg>`,
  pistol: `<svg viewBox="0 0 32 32"><path d="M3 11 L22 11 L22 15 L3 15 Z" fill="${METAL_D}" ${O}/><path d="M3 12.2 L21 12.2" stroke="#c9c9c2" stroke-width=".9"/><path d="M15 11 L28 10 Q30 13 27 15 L24 16 L27 26 Q25 28 21 27 L19 16 L15 15 Z" fill="${WOOD}" ${O}/><path d="M19 9 L21 6 L22.5 7 L21 10" fill="${METAL}" ${O}/><path d="M19.5 17 Q18 20 20.5 21" fill="none" ${O}/></svg>`,
  dagger: `<svg viewBox="0 0 32 32"><g transform="rotate(-40 16 16)"><path d="M16 3 Q19 9 18 18 L14 18 Q13 9 16 3 Z" fill="${METAL}" ${O}/><path d="M12 18 L20 18 L20 20 L12 20 Z" fill="${METAL_D}" ${O}/><path d="M14.8 20 L17.2 20 L17.2 27 L14.8 27 Z" fill="${BONE}" ${O}/></g></svg>`,
  shield: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12.5" fill="${WOOD}" ${O}/><path d="M9 6.5 L9 25.5 M16 3.5 L16 28.5 M23 6.5 L23 25.5" stroke="#3e2714" stroke-width="1"/><circle cx="16" cy="16" r="12.5" fill="none" stroke="${METAL_D}" stroke-width="2.4"/><circle cx="16" cy="16" r="4" fill="${METAL}" ${O}/><circle cx="14.8" cy="14.8" r="1.1" fill="#e4e4dc"/></svg>`,
  helm: `<svg viewBox="0 0 32 32"><path d="M6 20 Q6 6 16 5 Q26 6 26 20 L26 25 L20 25 L20 18 L12 18 L12 25 L6 25 Z" fill="${METAL}" ${O}/><path d="M16 5 L16 18" stroke="${METAL_D}" stroke-width="1.6"/><path d="M8 12 Q10 8 13 7" stroke="#e4e4dc" stroke-width="1" fill="none"/><path d="M12 18 L20 18 L20 21 L12 21 Z" fill="#1d1712"/></svg>`,
  chest: `<svg viewBox="0 0 32 32"><path d="M9 4 L13 6 Q16 8 19 6 L23 4 L29 9 L26 14 L24 12 L24 28 L8 28 L8 12 L6 14 L3 9 Z" fill="${LEATHER}" ${O}/><path d="M16 8 L16 28" stroke="#2c1b0f" stroke-width="1.2"/><circle cx="14" cy="13" r=".9" fill="${BRASS}"/><circle cx="14" cy="18" r=".9" fill="${BRASS}"/><circle cx="14" cy="23" r=".9" fill="${BRASS}"/><path d="M8 20 L24 20" stroke="#2c1b0f" stroke-width="1.6"/></svg>`,
  ring: `<svg viewBox="0 0 32 32"><ellipse cx="16" cy="19" rx="8.5" ry="7.5" fill="none" stroke="#120c08" stroke-width="5"/><ellipse cx="16" cy="19" rx="8.5" ry="7.5" fill="none" stroke="${BRASS}" stroke-width="2.8"/><path d="M12 11 L16 6 L20 11 L16 14 Z" fill="#8a1f2a" ${O}/><path d="M14 10 L16 7.5" stroke="#ff9aa4" stroke-width=".9"/></svg>`,
  amulet: `<svg viewBox="0 0 32 32"><path d="M6 3 Q16 17 26 3" fill="none" stroke="#120c08" stroke-width="2.6"/><path d="M6 3 Q16 17 26 3" fill="none" stroke="${BRASS}" stroke-width="1.2" stroke-dasharray="1.6 1"/><path d="M16 12 L22 20 L16 29 L10 20 Z" fill="${BONE}" ${O}/><circle cx="16" cy="20" r="2.6" fill="#2b6b4a" ${O}/></svg>`,
  scepter: `<svg viewBox="0 0 32 32"><path d="M8 29 L20 11" stroke="#120c08" stroke-width="3.6" stroke-linecap="round"/><path d="M8 29 L20 11" stroke="${BRASS}" stroke-width="1.8" stroke-linecap="round"/><path d="M19 4 L26 7 L25 13 L19 14 L16 9 Z" fill="${METAL_D}" ${O}/><circle cx="21" cy="9.5" r="2.4" fill="#5ad19a" ${O}/></svg>`,
  gloves: `<svg viewBox="0 0 32 32"><path d="M8 28 L8 17 L6 12 Q6 10 8 10.5 L10 14 L10 6 Q11 4.5 12.5 6 L13 13 L14 4.5 Q15.5 3 17 4.5 L16.6 13 L18.5 6 Q20 5 21 6.5 L19.5 15 L21.5 13 Q23.5 12.5 23 15 L19 22 L19 28 Z" fill="${LEATHER}" ${O}/><path d="M8 24 L19 24" stroke="${METAL_D}" stroke-width="2"/></svg>`,
  boots: `<svg viewBox="0 0 32 32"><path d="M10 3 L18 3 L18 19 Q26 19 28 24 L28 28 L8 28 L8 21 Q10 18 10 14 Z" fill="${LEATHER}" ${O}/><path d="M8 25 L28 25" stroke="#2c1b0f" stroke-width="2"/><path d="M10 9 L18 9" stroke="${BRASS}" stroke-width="1.4"/></svg>`,
  scroll: `<svg viewBox="0 0 32 32"><path d="M7 7 L25 7 L25 25 L7 25 Z" fill="#d9c49a" ${O}/><path d="M5 5.5 Q5 3.5 7 3.5 L25 3.5 Q27 3.5 27 5.5 Q27 7.5 25 7.5 L7 7.5 Q5 7.5 5 5.5 Z" fill="#c8b083" ${O}/><path d="M5 26.5 Q5 24.5 7 24.5 L25 24.5 Q27 24.5 27 26.5 Q27 28.5 25 28.5 L7 28.5 Q5 28.5 5 26.5 Z" fill="#c8b083" ${O}/><path d="M10 11 L22 11 M10 14 L20 14 M10 17 L18 17" stroke="#6b5636" stroke-width="1"/><circle cx="21" cy="20" r="2.8" fill="#8f1d1d" ${O}/></svg>`,
  crystal: `<svg viewBox="0 0 32 32"><path d="M16 3 L22 12 L19 28 L13 28 L10 12 Z" fill="#2ec27e" ${O}/><path d="M16 3 L16 28 M10 12 L22 12" stroke="#0e5a37" stroke-width="1"/><path d="M14 7 L12.5 12" stroke="#c8ffe2" stroke-width="1.1"/><path d="M7 22 L10 16 L12 27 Z" fill="#1f8f5c" ${O}/></svg>`,
};
