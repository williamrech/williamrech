// ⚔️ Grim Dawn pack (occasion effect). Loaded only when the effect is on, so nobody else downloads it.
// Background: ash falling and a few embers rising. Tapping empty background does one of:
//  • a loot explosion: items fly out, land with their names in rarity colors, then vanish;
//  • a small red chthonic rift that tears open and closes;
//  • rarely, a riftgate: it opens aether-green, a ring of salt is poured around it and it turns purple.
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

// ---------- Tap ----------
export function grimTap(x, y, layer, force) { // force (tests only): "loot" | "rift" | "gate", lucky: 0..1
  ensureCss();
  if (!force && layer.querySelectorAll(".gd-fx").length >= 4) return; // don't pile up
  const r = force ? { loot: 0, rift: 0.6, gate: 0.9 }[force.kind] : Math.random();
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

// A riftgate: opens aether-green; salt is poured around it; it turns purple; then it closes.
function riftgate(x, y, layer) {
  const w = rnd(96, 124), h = w * 1.5, g = box(layer, x, Math.max(y, h * 0.55 + 10));
  const total = 5200;
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
  // Green and purple portals stacked: the purple one fades in when the ring closes.
  const green = portal(g, w, h, {
    swirl: ["#021208", "#46ff9a", "#0b4a26", "#1fbf62"], streak: "rgba(170, 255, 200, .5)",
    rim: "rgba(150, 255, 190, .8)", glow: "rgba(40, 255, 130, .7)", glow2: "rgba(0, 140, 70, .4)",
  });
  const purple = portal(g, w, h, {
    swirl: ["#0c0216", "#c77bff", "#3c0a6e", "#8a2be2"], streak: "rgba(225, 190, 255, .55)",
    rim: "rgba(220, 170, 255, .85)", glow: "rgba(170, 70, 255, .75)", glow2: "rgba(90, 20, 170, .45)",
  });
  for (const n of [purple.p, purple.rim]) n.style.opacity = "0";
  const openFrames = [
    { transform: "scale(.05, .3)" }, { transform: "scale(1.06, 1.03)", offset: 0.75 }, { transform: "scale(1, 1)" },
  ];
  const all = [green.p, green.rim, purple.p, purple.rim];
  for (const n of all) n.animate(openFrames, { duration: 650, easing: OPEN, fill: "backwards" });
  for (const n of [green.p, green.rim]) n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: "backwards" });
  motes(g, w, h, "#6dffad", 10, 1200);
  // Salt poured: 0.6s → 1.8s.
  maskE.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: 1200, delay: 600, easing: "ease-in-out", fill: "forwards" });
  // Turns purple when the ring closes.
  const turn = 1850;
  for (const n of [purple.p, purple.rim]) n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, delay: turn, fill: "forwards" });
  for (const n of [green.p, green.rim]) n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, delay: turn + 150, fill: "forwards" });
  groundGlow.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: turn, fill: "forwards" });
  flash(g, w * 1.6, "rgba(200, 140, 255, .6)", turn);
  setTimeout(() => motes(g, w, h, "#d6a6ff", 14, 1400), turn);
  // Close.
  const close = 4100;
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
// Base items: name, gender (m/f) for the affixes, drawing.
const BASES = [
  ["Cutelo", "m", "cleaver"], ["Cutelo Enferrujado", "m", "cleaver"], ["Espada Longa", "f", "sword"], ["Florete", "m", "sword"],
  ["Machado de Lenhador", "m", "axe"], ["Machado de Guerra", "m", "axe"], ["Maça Cravejada", "f", "mace"], ["Martelo de Ferreiro", "m", "mace"],
  ["Pistola de Pederneira", "f", "pistol"], ["Bacamarte", "m", "pistol"], ["Adaga Curva", "f", "dagger"], ["Faca de Açougueiro", "f", "dagger"],
  ["Escudo de Carvalho", "m", "shield"], ["Broquel Amassado", "m", "shield"], ["Elmo de Ferro", "m", "helm"], ["Capuz de Couro", "m", "helm"],
  ["Sobretudo de Couro", "m", "chest"], ["Cota de Malha", "f", "chest"], ["Anel de Latão", "m", "ring"], ["Amuleto de Osso", "m", "amulet"],
  ["Cetro Rachado", "m", "scepter"], ["Manoplas de Couro", "fp", "gloves"],
];
const BROKEN = ["Quebrado", "Quebrada", "Quebrados", "Quebradas"];
// Adjectives: [m, f, mp, fp].
const PREFIX_MAGIC = [
  ["Frenético", "Frenética", "Frenéticos", "Frenéticas"], ["Ardente", "Ardente", "Ardentes", "Ardentes"], ["Gélido", "Gélida", "Gélidos", "Gélidas"],
  ["Pesado", "Pesada", "Pesados", "Pesadas"], ["Afiado", "Afiada", "Afiados", "Afiadas"], ["Resistente", "Resistente", "Resistentes", "Resistentes"],
  ["Venenoso", "Venenosa", "Venenosos", "Venenosas"], ["Luminoso", "Luminosa", "Luminosos", "Luminosas"], ["Robusto", "Robusta", "Robustos", "Robustas"],
];
const PREFIX_RARE = [
  ["Demoníaco", "Demoníaca", "Demoníacos", "Demoníacas"], ["Etéreo", "Etérea", "Etéreos", "Etéreas"], ["Sanguinário", "Sanguinária", "Sanguinários", "Sanguinárias"],
  ["Profano", "Profana", "Profanos", "Profanas"], ["Amaldiçoado", "Amaldiçoada", "Amaldiçoados", "Amaldiçoadas"], ["Sepulcral", "Sepulcral", "Sepulcrais", "Sepulcrais"],
];
const SUFFIX_MAGIC = ["do Urso", "da Brasa", "do Corvo", "da Vigília", "do Lobo", "das Cinzas", "do Javali", "da Ferrugem", "do Viajante", "da Geada"];
const SUFFIX_RARE = ["do Vazio", "do Carrasco", "da Peste", "do Inquisidor", "da Tempestade Negra", "do Sangue Antigo", "da Última Vigília", "do Coveiro"];
const EPIC = [
  ["Lâmina do Juramento Partido", "sword"], ["Martelo do Último Vigia", "mace"], ["Bacamarte da Viúva Cinzenta", "pistol"],
  ["Elmo do Bispo Afogado", "helm"], ["Sobretudo do Caçador de Bruxas", "chest"], ["Cutelo da Peste Negra", "cleaver"],
  ["Anel do Agiota Enforcado", "ring"], ["Broquel da Guarnição Esquecida", "shield"], ["Machado do Lenhador Possesso", "axe"],
];
const LEGENDARY = [
  ["Fúria do Deus Esquecido", "sword"], ["Coração do Vazio Faminto", "amulet"], ["Aurora das Cinzas", "scepter"],
  ["Mão do Carrasco Eterno", "gloves"], ["Sétimo Selo", "ring"], ["Trovão do Patriarca Morto", "pistol"], ["Coroa do Rei sem Terra", "helm"],
];
const RECIPES = ["Receita: Unguento Amargo", "Receita: Tônico de Fuligem", "Receita: Óleo de Pólvora", "Diagrama: Relíquia Partida", "Diagrama: Amuleto do Coveiro", "Diagrama: Pedra Rúnica"];
const COMPONENTS = [
  ["Fragmento de Éter", false], ["Presa Lascada", false], ["Sucata", false], ["Pólvora Úmida", false], ["Pele Escamosa", false], ["Osso Ancestral", false],
  ["Selo Rachado", true], ["Cristal de Éter Puro", true], ["Coração Chthônico", true],
];
const g4 = (gender) => ({ m: 0, f: 1, mp: 2, fp: 3 })[gender];

function rollItem() {
  const r = Math.random();
  if (r < 0.07) { const [n, gd, art] = pick(BASES); return { name: `${n} ${BROKEN[g4(gd)]}`, col: COLOR.broken, art, broken: true }; }
  if (r < 0.15) return { name: pick(RECIPES), col: COLOR.recipe, art: "scroll" };
  if (r < 0.27) {
    const [n, rare] = pick(COMPONENTS);
    const partial = !rare && Math.random() < 0.5 ? ` (Parcial ${Math.ceil(rnd(0, 3))}/4)` : "";
    return { name: n + partial, col: rare ? COLOR.rareComponent : COLOR.component, art: "crystal" };
  }
  const [base, gd, art] = pick(BASES), k = g4(gd);
  if (r < 0.62) return { name: base, col: COLOR.common, art };
  if (r < 0.88) return Math.random() < 0.5
    ? { name: `${base} ${pick(PREFIX_MAGIC)[k]}`, col: COLOR.magic, art }
    : { name: `${base} ${pick(SUFFIX_MAGIC)}`, col: COLOR.magic, art };
  const pre = Math.random() < 0.5 ? pick(PREFIX_RARE)[k] : pick(PREFIX_MAGIC)[k];
  return { name: `${base} ${pre} ${pick(SUFFIX_RARE)}`, col: COLOR.rare, art };
}

function loot(x, y, layer, forceLucky) {
  const g = box(layer, x, y);
  const items = [];
  const n = Math.round(rnd(2, 5));
  for (let i = 0; i < n; i++) items.push(rollItem());
  // Now and then something worth celebrating.
  const lucky = forceLucky ?? Math.random();
  if (lucky < 0.035) { const [name, art] = pick(LEGENDARY); items.push({ name, col: COLOR.legendary, art, beam: "legendary" }); }
  else if (lucky < 0.13) { const [name, art] = pick(EPIC); items.push({ name, col: COLOR.epic, art, beam: "epic" }); }
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
    let top = L.y;
    for (let tries = 0; tries < 12; tries++) {
      const hit = placed.find((p) => Math.abs(p.x - L.x) < (p.w + w) / 2 + 2 && Math.abs(p.y - top) < h + 1);
      if (!hit) break;
      top = hit.y - h - 2;
    }
    // Keep it on screen.
    const left = Math.max(w / 2 + 4 - x, Math.min(W - w / 2 - 4 - x, L.x));
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
  scroll: `<svg viewBox="0 0 32 32"><path d="M7 7 L25 7 L25 25 L7 25 Z" fill="#d9c49a" ${O}/><path d="M5 5.5 Q5 3.5 7 3.5 L25 3.5 Q27 3.5 27 5.5 Q27 7.5 25 7.5 L7 7.5 Q5 7.5 5 5.5 Z" fill="#c8b083" ${O}/><path d="M5 26.5 Q5 24.5 7 24.5 L25 24.5 Q27 24.5 27 26.5 Q27 28.5 25 28.5 L7 28.5 Q5 28.5 5 26.5 Z" fill="#c8b083" ${O}/><path d="M10 11 L22 11 M10 14 L20 14 M10 17 L18 17" stroke="#6b5636" stroke-width="1"/><circle cx="21" cy="20" r="2.8" fill="#8f1d1d" ${O}/></svg>`,
  crystal: `<svg viewBox="0 0 32 32"><path d="M16 3 L22 12 L19 28 L13 28 L10 12 Z" fill="#2ec27e" ${O}/><path d="M16 3 L16 28 M10 12 L22 12" stroke="#0e5a37" stroke-width="1"/><path d="M14 7 L12.5 12" stroke="#c8ffe2" stroke-width="1.1"/><path d="M7 22 L10 16 L12 27 Z" fill="#1f8f5c" ${O}/></svg>`,
};
