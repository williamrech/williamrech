// 🕸️ Assombrado — a pacote (see PACOTES in app.js): a web in the top-left corner, fog strips along the bottom that a
// sideways swipe pushes and scrolling swells, a spider that drops down now and then, and an eye where you tap.
// Its CSS lives here too and is added when the file arrives.
const CSS = `/* ---------- Assombrado ---------- */
.haunt-web { position: absolute; top: 0; left: 0; width: 160px; height: 160px; color: var(--fg); opacity: .22; }
.haunt-web svg { width: 100%; height: 100%; display: block; }
.haunt-fog {
  position: absolute; left: 0; bottom: -6vh; border-radius: 50%; font-style: normal; will-change: transform; transform-origin: 50% 100%;
  background: radial-gradient(ellipse at 50% 65%, color-mix(in srgb, var(--fg) 30%, transparent), transparent 70%);
  filter: blur(18px);
}
.spider-rig { position: absolute; top: 0; left: 62px; width: 34px; transform-origin: 50% 0; --len: 56px; --t: 0s; }
.spider-rig.down { animation: spider-swing 2.6s ease-in-out infinite alternate; }
@keyframes spider-swing { from { transform: rotate(-4deg); } to { transform: rotate(4deg); } }
.spider-thread { position: absolute; left: 50%; top: 0; width: 1px; height: var(--len); background: color-mix(in srgb, var(--fg) 45%, transparent); transition: height var(--t) ease-in-out; }
.spider { position: absolute; left: 0; top: calc(var(--len) - 6px); width: 34px; height: 34px; padding: 0; border: 0; background: none; min-height: 0;
  color: color-mix(in srgb, var(--fg) 30%, #0b0b0b); pointer-events: auto; cursor: pointer; transition: top var(--t) ease-in-out; }
.spider svg { width: 100%; height: 100%; display: block; filter: drop-shadow(0 0 2px color-mix(in srgb, var(--fg) 40%, transparent)); }
.spider-rig.moving .legs { animation: legs 0.35s ease-in-out infinite alternate; transform-origin: 20px 22px; }
@keyframes legs { to { transform: scaleX(.9) rotate(3deg); } }
.haunt-eye { position: absolute; pointer-events: none; opacity: 0; transform: scaleY(0); animation: eye-life var(--dur, 3000ms) ease-in-out forwards;
  -webkit-mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 55%, transparent 100%); mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 55%, transparent 100%); }
.haunt-eye svg { width: 100%; height: 100%; display: block; overflow: visible; }
.haunt-eye .iris { animation: eye-drift var(--dur, 3000ms) ease-in-out forwards; }
.haunt-eye .pupil { transform-box: fill-box; transform-origin: center; animation: pupil-tight var(--dur, 3000ms) ease-out forwards; filter: drop-shadow(0 0 3px #ff2a1a); }
@keyframes eye-life {
  0% { transform: scaleY(0); opacity: 0; }
  16% { transform: scaleY(1); opacity: .72; }
  64% { transform: scaleY(1); opacity: .72; }
  68% { transform: scaleY(.08); opacity: .72; }
  72% { transform: scaleY(1); opacity: .72; }
  88% { transform: scaleY(1); opacity: .72; }
  100% { transform: scaleY(0); opacity: 0; }
}
@keyframes eye-drift { 0%, 25% { transform: translate(0, 0); } 60% { transform: translate(var(--dx), var(--dy)); } 100% { transform: translate(var(--dx), var(--dy)); } }
@keyframes pupil-tight { 0% { transform: scale(1.5); } 30% { transform: scale(.75); } 100% { transform: scale(.8); } }
.mini-fx .haunt-web { width: 64px; height: 64px; }
.mini-fx .haunt-fog { filter: blur(8px); bottom: -10%; }
.mini-fx .spider-rig { left: 26px; transform: scale(.55); transform-origin: 50% 0; }

/* Assombrado cloud strips (parallax): soft cartoon clouds in theme colors with a glow on top */
.fog-strip { position: absolute; left: 0; bottom: -2vh; transform-origin: 50% 100%; will-change: transform; pointer-events: none; }
.fog-strip svg { width: 100%; height: 100%; display: block; overflow: visible; }
.fog-strip path { fill: color-mix(in srgb, var(--fg) var(--mix), var(--bg)); }
.mini-fx .fog-strip { bottom: -4%; }`;
function ensureCss() {
  if (document.getElementById("haunt-css")) return;
  const s = document.createElement("style");
  s.id = "haunt-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

// Assombrado: corner web, a spider on its thread, fog along the bottom, and an eye where you tap the background.
const WEB_SVG = `<svg viewBox="0 0 160 160" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round">
<g stroke-width="1.3">${[0, 15, 30, 45, 60, 75, 90].map((a) => { const r = (a * Math.PI) / 180; return `<path d="M0 0 L${(160 * Math.cos(r)).toFixed(1)} ${(160 * Math.sin(r)).toFixed(1)}"/>`; }).join("")}</g>
<g stroke-width="1">${[28, 52, 78, 104, 132].map((R) => { let d = ""; for (let i = 0; i <= 6; i++) { const a = (i * 15 * Math.PI) / 180, x = R * Math.cos(a), y = R * Math.sin(a); if (!i) d += `M${x.toFixed(1)} ${y.toFixed(1)}`; else { const m = ((i - 0.5) * 15 * Math.PI) / 180, k = R * 0.9; d += ` Q${(k * Math.cos(m)).toFixed(1)} ${(k * Math.sin(m)).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`; } } return `<path d="${d}"/>`; }).join("")}</g></svg>`;
const SPIDER_SVG = `<svg viewBox="0 0 40 40" aria-hidden="true"><g stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" class="legs">
<path d="M16 18 Q8 12 4 16"/><path d="M16 21 Q7 19 3 23"/><path d="M16 24 Q8 26 5 32"/><path d="M17 26 Q12 31 10 37"/>
<path d="M24 18 Q32 12 36 16"/><path d="M24 21 Q33 19 37 23"/><path d="M24 24 Q32 26 35 32"/><path d="M23 26 Q28 31 30 37"/></g>
<ellipse cx="20" cy="15" rx="4" ry="3.5" fill="currentColor"/><ellipse cx="20" cy="24" rx="6" ry="7" fill="currentColor"/>
<circle cx="18.3" cy="14.4" r="0.9" fill="var(--caramel, #e33)"/><circle cx="21.7" cy="14.4" r="0.9" fill="var(--caramel, #e33)"/></svg>`;
// A bloodshot eye: yellowish white going red at the edges, branching veins, dark iris, glowing red
// pupil (round, or now and then a slit), and a shadowed upper lid. Ids are unique per eye.
function eyeSvg(id, slit) {
  const veins = [
    "M4 25 Q14 22 20 24 Q24 20 30 21", "M4 25 Q12 29 19 28 Q23 32 29 31", "M8 24 Q13 18 21 17",
    "M96 25 Q86 22 80 24 Q76 19 70 20", "M96 25 Q87 29 81 28 Q77 33 71 32", "M92 24 Q86 18 79 16",
  ].map((d, i) => `<path d="${d}" stroke-width="${i % 3 === 2 ? 0.7 : 1}"/>`).join("");
  return `<svg viewBox="0 0 100 50" aria-hidden="true"><defs>
<radialGradient id="sc${id}" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#f1ead2"/><stop offset=".55" stop-color="#e2cfa8"/><stop offset="1" stop-color="#b8483a"/></radialGradient>
<radialGradient id="pu${id}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff5a3c"/><stop offset=".6" stop-color="#c0141b"/><stop offset="1" stop-color="#4a0508"/></radialGradient>
<clipPath id="cl${id}"><path d="M2 25 Q50 -12 98 25 Q50 62 2 25Z"/></clipPath></defs>
<g clip-path="url(#cl${id})"><rect width="100" height="50" fill="url(#sc${id})"/>
<g fill="none" stroke="#a3121a" stroke-opacity=".75" stroke-linecap="round">${veins}</g>
<g class="iris"><circle cx="50" cy="25" r="14" fill="#1e0a0b"/><circle cx="50" cy="25" r="14" fill="none" stroke="#5a1416" stroke-width="2"/>
<g class="pupil">${slit ? `<ellipse cx="50" cy="25" rx="2.6" ry="11" fill="url(#pu${id})"/>` : `<circle cx="50" cy="25" r="6.5" fill="url(#pu${id})"/>`}</g>
<circle cx="45.5" cy="20.5" r="1.8" fill="#fff" opacity=".55"/></g>
<path d="M0 0 H100 V25 Q50 -12 0 25Z" fill="#000" opacity=".0"/><path d="M2 25 Q50 -12 98 25 Q50 4 2 25Z" fill="#000" opacity=".45"/></g>
<path d="M2 25 Q50 -12 98 25" fill="none" stroke="#000" stroke-opacity=".6" stroke-width="2.5"/></svg>`;
}

// Assombrado fog: three cartoon cloud strips sliding in parallax (back: dim, small, slow → front:
// light, big, fast, glowing) over a faint haze. Each strip repeats seamlessly and has its own
// peaks and dips. A sideways swipe pushes them (front most), scrolling makes them swell.
const fogPush = { vx: 0, swell: 0 };
function cloudStripPath(seed) {
  // One seamless 600×200 tile: bumps of different sizes along a wavy line (same height at both ends).
  let r = seed;
  const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const n = 6 + Math.floor(rand() * 3);
  const ys = Array.from({ length: n }, () => 70 + rand() * 80);
  ys.push(ys[0]);
  let x = 0, d = `M0 200 L0 ${ys[0].toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const nx = i === n ? 600 : x + (600 / n) * (0.75 + rand() * 0.5);
    const xr = Math.min(nx, 600);
    const rad = ((xr - x) / 2) * (1.05 + rand() * 0.5);
    d += ` A${rad.toFixed(1)} ${(rad * (0.7 + rand() * 0.5)).toFixed(1)} 0 0 1 ${xr.toFixed(1)} ${ys[i].toFixed(1)}`;
    x = xr;
  }
  return `${d} L600 200 Z`;
}
let fogFilterSeq = 0;
function startFog(layer, scale, still) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  // Sizes are set only when the screen size changes; each frame just moves/stretches (cheap, no re-blur).
  let w = layer.clientWidth || innerWidth, h = layer.clientHeight || innerHeight;
  // Faint haze so the bottom is never empty between peaks.
  const haze = Array.from({ length: 3 }, () => {
    const el = document.createElement("i");
    el.className = "haunt-fog";
    const b = { el, w: rnd(0.6, 1), h: rnd(0.12, 0.24), x: rnd(-0.5, 1), speed: rnd(6, 14) * Math.max(scale, 0.5), period: rnd(9, 16), phase: rnd(0, 6.3), amp: 0.2 };
    el.style.opacity = rnd(0.25, 0.4);
    layer.appendChild(el);
    return b;
  });
  // The three strips.
  const LAYERS = [
    { depth: 0.35, h: 0.2, op: 0.28, speed: 12, glow: 6, mix: 35, seed: 11 },
    { depth: 0.65, h: 0.26, op: 0.38, speed: 22, glow: 10, mix: 55, seed: 47 },
    { depth: 1, h: 0.28, op: 0.42, speed: 36, glow: 16, mix: 75, seed: 83 },
  ];
  const strips = LAYERS.map((L, i) => {
    const el = document.createElement("div");
    el.className = "fog-strip";
    const path = cloudStripPath(L.seed + Math.floor(Math.random() * 1000));
    // Blur + glow are baked into the drawing (drawn once), so moving/breathing it each frame costs almost nothing.
    const fid = `fogf${++fogFilterSeq}`;
    el.innerHTML = `<svg viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="${fid}" x="-5%" y="-80%" width="110%" height="190%">`
      + `<feGaussianBlur in="SourceGraphic" stdDeviation="1"/><feDropShadow dx="0" dy="0" stdDeviation="1" style="flood-color: color-mix(in srgb, var(--crema) 55%, transparent)"/>`
      + `</filter></defs><g filter="url(#${fid})"><path d="${path}"/><path d="${path}" transform="translate(600 0)"/></g></svg>`;
    el.style.setProperty("--mix", `${L.mix}%`);
    el.style.opacity = L.op;
    el.style.zIndex = String(i + 1);
    layer.appendChild(el);
    return { el, L, x: Math.random(), phase: rnd(0, 6.3), period: rnd(8, 14), glow: L.glow * Math.max(scale, 0.5), blurPx: scale < 1 ? 0.8 : 1.5 };
  });
  const size = () => {
    w = layer.clientWidth || innerWidth; h = layer.clientHeight || innerHeight;
    for (const b of haze) { b.el.style.width = `${b.w * w}px`; b.el.style.height = `${Math.max(16, b.h * h)}px`; }
    for (const st of strips) {
      const ph = st.L.h * h, u = 200 / Math.max(ph, 1); // CSS px → drawing units
      st.el.style.height = `${ph}px`; st.el.style.width = `${ph * 6}px`;
      st.el.querySelector("feGaussianBlur").setAttribute("stdDeviation", (st.blurPx * u).toFixed(2));
      const sh = st.el.querySelector("feDropShadow");
      sh.setAttribute("stdDeviation", (st.glow * u).toFixed(2)); sh.setAttribute("dy", (-0.4 * st.glow * u).toFixed(2));
    }
  };
  size();
  if (window.ResizeObserver) new ResizeObserver(size).observe(layer);
  let last = performance.now();
  const frame = (now) => {
    if (!layer.isConnected || !strips[0].el.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    fogPush.vx *= Math.pow(0.25, dt); // momentum fades
    fogPush.swell *= Math.pow(0.3, dt);
    const t = now / 1000;
    for (const b of haze) {
      const bw = b.w * w;
      b.x += ((b.speed + fogPush.vx * 0.2 * scale) * dt) / w;
      if (b.x * w > w + bw * 0.2) b.x = -b.w - 0.1;
      if (b.x * w < -bw * 1.3) b.x = 1;
      b.el.style.transform = `translateX(${(b.x * w).toFixed(1)}px) scaleY(${(1 + b.amp * Math.sin(t * (6.28 / b.period) + b.phase)).toFixed(3)})`;
    }
    for (const st of strips) {
      const ph = st.L.h * h; // strip height
      const tile = ph * 3; // one 600×200 tile at this height
      st.x = (st.x + ((st.L.speed * Math.max(scale, 0.5) + fogPush.vx * st.L.depth * scale) * dt) / tile) % 1;
      if (st.x < 0) st.x += 1;
      const breathe = 1 + 0.08 * Math.sin(t * (6.28 / st.period) + st.phase) + fogPush.swell * st.L.depth;
      st.el.style.transform = `translateX(${(-st.x * tile).toFixed(1)}px) scaleY(${breathe.toFixed(3)})`;
    }
    fogLive = now;
    if (!still) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
// The swipe and scroll only push the fog while it is running.
let fogLive = 0;
const fogOn = () => performance.now() - fogLive < 300;
let fogTouchX = null;
addEventListener("touchstart", (e) => { fogTouchX = e.touches[0] ? e.touches[0].clientX : null; }, { passive: true });
addEventListener("touchmove", (e) => {
  if (!fogOn() || fogTouchX === null || !e.touches[0]) return;
  const x = e.touches[0].clientX;
  fogPush.vx = Math.max(-700, Math.min(700, fogPush.vx + (x - fogTouchX) * 9));
  fogTouchX = x;
}, { passive: true });
let fogLastY = scrollY;
addEventListener("scroll", () => {
  if (fogOn()) fogPush.swell = Math.min(0.8, fogPush.swell + Math.abs(scrollY - fogLastY) / 400);
  fogLastY = scrollY;
}, { passive: true });

function webAndFog(layer, scale, still) {
  const web = document.createElement("div");
  web.className = "haunt-web";
  web.innerHTML = WEB_SVG;
  layer.appendChild(web);
  startFog(layer, scale, still);
}
// The spider hangs from the web; now and then it drops a random distance, swings, and climbs back. Tap: back up.
function spider(layer, scale, still) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rig = document.createElement("div");
  rig.className = "spider-rig";
  rig.innerHTML = `<i class="spider-thread"></i><button type="button" class="spider" aria-label="Aranha">${SPIDER_SVG}</button>`;
  layer.appendChild(rig);
  const rest = 48 * scale + 8;
  const setLen = (px, secs) => { rig.style.setProperty("--t", `${secs}s`); rig.style.setProperty("--len", `${px}px`); };
  setLen(rest, 0);
  const room = () => (scale < 1 ? layer.clientHeight : innerHeight);
  // Climbing back: stop the swing where it is and ease back to hanging straight over the climb (no snap at the top).
  const settle = (secs) => {
    if (!rig.classList.contains("down")) return;
    const cur = getComputedStyle(rig).transform;
    rig.style.transition = "none"; rig.style.transform = cur;
    rig.classList.remove("down");
    rig.style.transform = ""; const base = getComputedStyle(rig).transform;
    rig.style.transform = cur; void rig.offsetWidth;
    rig.style.transition = `transform ${secs}s ease-in-out`; rig.style.transform = base;
    clearTimeout(rig._settle);
    rig._settle = setTimeout(() => { rig.style.transition = ""; rig.style.transform = ""; }, secs * 1000 + 50);
  };
  const cycle = () => {
    if (!rig.isConnected) return;
    if (!document.hidden && !still) {
      // "down": swinging the whole time it's off the web; "moving": legs going while it travels.
      clearTimeout(rig._settle); rig.style.transition = ""; rig.style.transform = "";
      rig.classList.add("moving", "down");
      setLen(rest + room() * rnd(0.18, 0.5), rnd(4, 6.5));
      layer._spiderUp = setTimeout(() => {
        rig.classList.remove("moving");
        layer._spiderUp = setTimeout(() => {
          rig.classList.add("moving");
          const up = rnd(5, 7);
          setLen(rest, up);
          settle(up * 0.8);
          layer._spiderUp = setTimeout(() => rig.classList.remove("moving"), up * 1000);
        }, rnd(3000, 8000));
      }, 6500);
    }
    layer._fxTimer = setTimeout(cycle, rnd(20000, 40000));
  };
  if (!still) layer._fxTimer = setTimeout(cycle, rnd(3000, 8000));
  rig.querySelector(".spider").onclick = () => { // tap: scurries back up
    clearTimeout(layer._spiderUp);
    rig.classList.add("moving");
    setLen(rest, 0.9);
    settle(0.9);
    layer._spiderUp = setTimeout(() => rig.classList.remove("moving"), 1000);
  };
}

let eyeSeq = 0;
export const pacote = {
  back(layer) { ensureCss(); webAndFog(layer, 1, matchMedia("(prefers-reduced-motion: reduce)").matches); }, // web + fog behind the feed
  front(layer, scale, still) { // the spider (in the small preview everything goes in one layer)
    ensureCss();
    if (scale < 1) webAndFog(layer, scale, still);
    spider(layer, scale, still);
  },
  // A tap on the empty background slowly opens an eye there (sometimes a pair): it stares, its pupil tightens,
  // it drifts a little, blinks, and closes. Random size, time and pupil.
  tap(x, y, layer) {
    ensureCss();
    const w = Math.round(34 + Math.random() * 90);
    const ms = Math.round(2000 + Math.random() * 2000);
    const pair = Math.random() < 1 / 6;
    const slit = Math.random() < 0.3;
    const dx = (Math.random() * 2 - 1) * 9, dy = (Math.random() * 2 - 1) * 3;
    const spots = pair ? [[-w * 0.62, 0], [w * 0.62, 0]] : [[0, 0]];
    spots.forEach(([ox, oy], k) => {
      const eye = document.createElement("div");
      eye.className = "haunt-eye";
      eye.style.cssText = `left:${x - w / 2 + ox}px;top:${y - w / 4 + oy}px;width:${w}px;height:${w / 2}px;--dur:${ms}ms;--dx:${dx}px;--dy:${dy}px;animation-delay:${k * 90}ms`;
      eye.innerHTML = eyeSvg(`e${++eyeSeq}`, slit);
      layer.appendChild(eye);
      setTimeout(() => eye.remove(), ms + 300);
    });
  },
};
