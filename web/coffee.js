// ☕ The coffee of "passar café" (Espresso pacote, espresso.js): one canvas behind the feed.
// - Liquid: a row of columns (shallow-water flow between neighbours), so pours, taps and tilts make waves that
//   travel, bounce off the screen edges and settle. Gravity follows the phone (like the varal): tilted, the surface
//   stays level with the real world and sloshes back.
// - Stream: a chain of drops falling from a spout at the top under the same gravity, so it curves when the phone
//   tilts and whips when it moves; each drop that reaches the surface adds its coffee there (that's the pour).
// - Foam: a crema layer riding the surface, thick where the stream lands, carried by the flow, squashed on the
//   crests and stretched in the troughs, full of little bubbles that drift and pop. Hot: thick; cold: thin.
// The state lives in this module: it survives the layer being rebuilt, and is gone on reload.
// It only animates while something moves; then it draws one last frame and sleeps (and always in rest mode).

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const GW = 820;         // wave gravity (px/s²): how fast waves travel (lower = a bit thicker, lazier coffee)
const GS = 2300;        // stream gravity (px/s²)
const DX = 4;           // column width (px)
const SUB = 1 / 360;    // simulation step (s)
const FOAM = { hot: [17, 30, 1.25], warm: [9, 18, 0.7], cold: [2.5, 5, 0.12] }; // [rest thickness, max, bubbles per drop]

const C = {
  canvas: null, g: null, dpr: 1, W: 0, H: 0, N: 0,
  h: null, q: null, fm: null,             // depth, flow between i and i+1, foam thickness
  drops: [], spl: [], bubs: [],           // stream drops, splash droplets, bubbles
  gx: 0, gy: 1,                           // gravity in screen coordinates (smoothed)
  lx: 0, ly: 1,                           // the gravity the coffee feels: follows gx/gy with a short delay (body)
  spilled: 0,                             // coffee lost over the top edge
  pouring: false, poured: 0, goal: 0, rate: 0, emitAcc: 0, emitT: 0,
  kind: "warm", onFull: null, onDraw: null, raf: 0, last: 0, liveUntil: 0, resting: false, t: 0,
  listening: false, gotMotion: false, mottle: null,
};

// ---------- gravity from the phone (same reading as the varal) ----------
const toScreen = (dx, dy) => {
  const ang = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) * Math.PI / 180;
  return [dx * Math.cos(ang) + dy * Math.sin(ang), -dx * Math.sin(ang) + dy * Math.cos(ang)];
};
function onMotion(e) {
  let nx, ny;
  if (e.type === "devicemotion") {
    const a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
    C.gotMotion = true; [nx, ny] = toScreen(-a.x / 9.81, a.y / 9.81);
  } else {
    if (C.gotMotion || e.beta == null) return;
    const b = e.beta * Math.PI / 180, g = (e.gamma || 0) * Math.PI / 180;
    [nx, ny] = toScreen(Math.sin(g) * Math.cos(b), Math.sin(b));
  }
  const sx = nx - C.gx, sy = ny - C.gy;
  C.gx += sx * 0.2; C.gy += sy * 0.2;
  if (!C.N || Math.hypot(sx, sy) < 0.03) return;
  if (C.resting && Math.hypot(sx, sy) > 0.25) dispatchEvent(new Event("app-wake")); // a real tilt wakes the app
  if (!C.resting) wake(2500);
}
// The pull we use: flat on a table the phone barely feels "down" along the screen, so keep a gentle one.
function grav() {
  const m = Math.hypot(C.gx, C.gy);
  if (m < 0.15) return [0, 0.6];
  const k = Math.max(m, 0.6) / m;
  return [C.gx * k, C.gy * k];
}

// ---------- size ----------
function fit() {
  const W = C.canvas.clientWidth || innerWidth, H = C.canvas.clientHeight || innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 1.75);
  if (W === C.W && H === C.H && dpr === C.dpr) return;
  C.canvas.width = Math.round(W * dpr); C.canvas.height = Math.round(H * dpr); C.dpr = dpr;
  const N = Math.max(8, Math.round(W / DX) + 1);
  const resample = (a, n) => { const o = new Float32Array(n); if (!a) return o; for (let i = 0; i < n; i++) { const s = (i / (n - 1)) * (a.length - 1), k = Math.floor(s), f = s - k; o[i] = a[k] * (1 - f) + (a[Math.min(k + 1, a.length - 1)] || 0) * f; } return o; };
  C.h = resample(C.h, N); C.fm = resample(C.fm, N); C.q = new Float32Array(N - 1);
  C.W = W; C.H = H; C.N = N;
}
const dx = () => C.W / (C.N - 1);
const col = (x) => clamp(Math.round(x / dx()), 0, C.N - 1);
function hAt(x) { const s = clamp(x / dx(), 0, C.N - 1), k = Math.floor(s), f = s - k; return C.h[k] * (1 - f) + C.h[Math.min(k + 1, C.N - 1)] * f; }
const surfY = (x) => C.H - hAt(x);
function volume() { let v = 0; for (let i = 0; i < C.N; i++) v += C.h[i]; return v * dx(); }

// ---------- physics ----------
function stepFluid(dt) {
  const { h, q, N } = C, d = dx();
  const ex = C.lx, ey = C.ly, gy = Math.max(ey, 0.1), ratio = clamp(ex / gy, -4, 4); // steep enough to reach the top and spill
  for (let s = 0, n = Math.ceil(dt / SUB), sdt = dt / n; s < n; s++) {
    for (let i = 0; i < N - 1; i++) {
      const ha = (h[i] + h[i + 1]) * 0.5;
      q[i] += sdt * GW * gy * ha * ((h[i] - h[i + 1]) / d + ratio);
      q[i] *= 1 - 1.5 * sdt;
    }
    for (let i = 1; i < N - 2; i++) q[i] += (q[i - 1] + q[i + 1] - 2 * q[i]) * 0.1; // viscosity: no jagged ripples, a little body
    for (let i = 0; i < N - 1; i++) { const m = (h[i + 1] - h[i]) * 0.015; h[i] += m; h[i + 1] -= m; } // surface tension (keeps the volume)
    for (let i = 0; i < N; i++) { // never take more than a column holds
      const outR = i < N - 1 && q[i] > 0 ? q[i] : 0, outL = i > 0 && q[i - 1] < 0 ? -q[i - 1] : 0, out = (outR + outL) * sdt;
      if (out > h[i] * d && out > 0) { const k = (h[i] * d) / out; if (outR) q[i] *= k; if (outL) q[i - 1] *= k; }
    }
    for (let i = 0; i < N; i++) h[i] = Math.max(0, h[i] - (sdt * ((i < N - 1 ? q[i] : 0) - (i > 0 ? q[i - 1] : 0))) / d);
  }
}
// The top of the screen is the cup's rim: coffee that climbs past it is gone (a few drops fly off).
// Upside down, it pours out over the top.
function spill(dt) {
  const { h, H, N } = C, d = dx();
  let lost = 0;
  for (let i = 0; i < N; i++) if (h[i] > H) {
    lost += (h[i] - H) * d; h[i] = H;
    if (Math.random() < 0.15 && C.spl.length < 60) C.spl.push({ x: i * d, y: 3, vx: C.lx * rnd(60, 160), vy: -rnd(40, 120), r: rnd(1.2, 2.6) });
  }
  if (C.ly < -0.3) { // the phone is upside down: it runs out
    const k = Math.min(1, (-C.ly - 0.3) * 1.4 * dt);
    for (let i = 0; i < N; i++) { lost += h[i] * k * d; h[i] -= h[i] * k; }
  }
  if (lost > 0) { C.spilled += lost; wake(1500); }
}
function flowAt(i) { const a = i > 0 ? C.q[i - 1] : 0, b = i < C.N - 1 ? C.q[i] : 0; return (a + b) / 2 / Math.max(C.h[i], 4); }
function stepFoam(dt) {
  const { fm, N, h } = C, d = dx(), [rest, max] = FOAM[C.kind];
  const nf = new Float32Array(N);
  for (let i = 0; i < N; i++) { // carried by the flow (a bit slower than the coffee)
    const src = clamp(i - (flowAt(i) * dt * 0.7) / d, 0, N - 1), k = Math.floor(src), f = src - k;
    nf[i] = fm[k] * (1 - f) + fm[Math.min(k + 1, N - 1)] * f;
  }
  for (let i = 0; i < N; i++) {
    const l = nf[i > 0 ? i - 1 : i], r = nf[i < N - 1 ? i + 1 : i];
    let v = nf[i] + (l + r - 2 * nf[i]) * 0.18; // it spreads out by itself
    if (v > rest) v -= (v - rest) * Math.min(1, 0.35 * dt); // settles to the cup's crema
    fm[i] = h[i] < 1 ? 0 : Math.min(v, max);
  }
}
// A drop lands at x: its coffee goes into the columns around it, with foam, bubbles and sometimes a splash.
function land(x, vy, mass) {
  const k = col(x), d = dx(), spread = 7, [, max, bub] = FOAM[C.kind];
  let wsum = 0; for (let j = -spread; j <= spread; j++) wsum += Math.exp(-(j * j) / 14);
  for (let j = -spread; j <= spread; j++) {
    const i = k + j; if (i < 0 || i >= C.N) continue;
    const w = Math.exp(-(j * j) / 14) / wsum;
    C.h[i] += (mass * w) / d;
    C.fm[i] = Math.min(max * 1.3, C.fm[i] + (mass * w) / d * (C.kind === "cold" ? 0.15 : 1.1));
  }
  // the impact pushes coffee sideways (a dent and a ring of waves)
  const push = mass * Math.min(vy, 1600) * 0.006;
  if (k > 0) C.q[k - 1] -= push; if (k < C.N - 1) C.q[k] += push;
  if (Math.random() < bub) addBubble(x + rnd(-12, 12));
  if (Math.random() < 0.22 && C.spl.length < 60) {
    const [ex, ey] = grav(), sp = rnd(110, 260), side = rnd(-1, 1);
    C.spl.push({ x, y: surfY(x) - 2, vx: -ex * sp + side * 160, vy: -ey * sp, r: rnd(1.1, 2.5) });
  }
}
function addBubble(x, big) {
  if (C.bubs.length >= 170) return;
  const hot = C.kind === "hot";
  C.bubs.push({ x, d: rnd(0.15, 0.85), r: big ? rnd(3, 4.6) : Math.random() < 0.15 ? rnd(2.4, 3.6) : rnd(0.7, 2.2), life: rnd(1.5, hot ? 9 : 5), pop: 0, j: rnd(0, 6.28) });
}
function stepStream(dt) {
  const [ex, ey] = grav();
  if (C.pouring) { // the spout: a steady trickle with a slight wobble
    C.emitT += dt;
    C.emitAcc += dt * 110;
    while (C.emitAcc >= 1) {
      C.emitAcc--;
      if (C.poured >= C.goal) { C.pouring = false; break; }
      const m = C.rate / 110;
      C.poured += m;
      C.drops.push({ x: C.W / 2 + Math.sin(C.emitT * 5.1) * 1.2, y: -6, vx: Math.sin(C.emitT * 2.3) * 3, vy: 70, m, age: 0 });
    }
  }
  const keep = [];
  for (const p of C.drops) {
    p.vx += ex * GS * dt; p.vy += ey * GS * dt;
    p.vx *= 1 - 0.25 * dt; p.vy *= 1 - 0.25 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.age += dt;
    if (p.x < 2) { p.x = 2; p.vx = Math.abs(p.vx) * 0.2; }
    if (p.x > C.W - 2) { p.x = C.W - 2; p.vx = -Math.abs(p.vx) * 0.2; }
    if (p.y >= surfY(p.x) - Math.min(C.fm[col(p.x)], 8) || p.age > 4) land(p.x, p.vy, p.m); else keep.push(p);
  }
  C.drops = keep;
  const ks = [];
  for (const s of C.spl) {
    s.vx += ex * GS * dt; s.vy += ey * GS * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.y >= surfY(s.x) && s.vy > 0) { const k = col(s.x); if (k < C.N - 1) C.q[k] += 4; } else if (s.x > -10 && s.x < C.W + 10 && s.y < C.H + 10) ks.push(s);
  }
  C.spl = ks;
}
function stepBubbles(dt) {
  const d = dx(), keep = [];
  for (const b of C.bubs) {
    if (b.pop) { b.pop += dt; if (b.pop < 0.18) keep.push(b); continue; }
    const i = col(b.x);
    b.x = clamp(b.x + flowAt(i) * dt * 0.7 + Math.sin((C.t + b.j) * 1.7) * 2 * dt, 1, C.W - 1);
    b.d = Math.max(0.05, b.d - dt * 0.03);
    b.life -= dt;
    if (b.life <= 0 || C.fm[i] < b.r * 0.9) { b.pop = 1e-6; if (b.r > 2.5) C.fm[i] = Math.max(0, C.fm[i] - 0.5); }
    keep.push(b);
  }
  C.bubs = keep;
  if (!C.pouring && C.kind === "hot" && performance.now() < C.liveUntil && Math.random() < dt * 5) addBubble(rnd(4, C.W - 4)); // a hot crema keeps fizzing a little
  void d;
}
function energy() { let e = 0; for (let i = 0; i < C.N - 1; i++) e += Math.abs(C.q[i]); return e / C.N; }

// ---------- drawing ----------
function mottle() { // a soft speckled texture for the crema (made once)
  if (C.mottle) return C.mottle;
  const c = document.createElement("canvas"); c.width = c.height = 160;
  const g = c.getContext("2d");
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 160, y = Math.random() * 160, r = rnd(2, 11), light = Math.random() < 0.45;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, light ? "rgba(255,236,200,.5)" : "rgba(70,30,10,.45)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    for (const ox of [-160, 0, 160]) for (const oy of [-160, 0, 160]) { g.save(); g.translate(ox, oy); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore(); }
  }
  return (C.mottle = c);
}
const COLORS = {
  hot: ["#f0c08a", "#c98646", "#7d431f"], warm: ["#d9a46c", "#ad6c38", "#5f3218"], cold: ["#a08b7b", "#6b5444", "#3a2418"],
};
function draw() {
  const { g, W, H, N, h, fm, dpr } = C, d = dx();
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  let minY = H, sum = 0;
  for (let i = 0; i < N; i++) { minY = Math.min(minY, H - h[i] - fm[i]); sum += h[i]; }
  const mean = sum / N;
  if (C.onDraw) C.onDraw((mean / H) * 100);
  if (mean > 0.3) {
    // the coffee
    g.beginPath(); g.moveTo(0, H);
    for (let i = 0; i < N; i++) g.lineTo(i * d, H - h[i]);
    g.lineTo(W, H); g.closePath();
    const top = H - mean - 30, body = g.createLinearGradient(0, Math.min(top, H - 60), 0, H);
    body.addColorStop(0, C.kind === "cold" ? "#2e1b12" : "#4d2912"); body.addColorStop(0.12, "#311709");
    body.addColorStop(0.5, "#170904"); body.addColorStop(1, "#090301");
    g.fillStyle = body; g.fill();
    g.save(); g.clip(); // warm light moving slowly inside it
    for (const [px, py, r, a] of [[0.3 + Math.sin(C.t * 0.23) * 0.12, 0.25, 0.6, 0.14], [0.72 + Math.cos(C.t * 0.17) * 0.1, 0.45, 0.45, 0.08]]) {
      const cx = W * px, cy = H - mean + mean * py, rr = W * r, gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
      gr.addColorStop(0, `rgba(201,139,79,${a})`); gr.addColorStop(1, "rgba(201,139,79,0)");
      g.fillStyle = gr; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    }
    // the shade just under the crema
    g.lineWidth = 14; g.strokeStyle = "rgba(10,4,1,.35)";
    g.beginPath(); for (let i = 0; i < N; i++) g.lineTo(i * d, H - h[i] + 7); g.stroke();
    g.restore();
    // the crema: squashed on crests, stretched in troughs
    const fv = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const curv = (h[i > 0 ? i - 1 : i] + h[i < N - 1 ? i + 1 : i] - 2 * h[i]);
      fv[i] = h[i] < 1 ? 0 : fm[i] * clamp(1 + curv * 0.07, 0.5, 1.7);
    }
    g.beginPath();
    for (let i = 0; i < N; i++) g.lineTo(i * d, H - h[i] - fv[i]);
    for (let i = N - 1; i >= 0; i--) g.lineTo(i * d, H - h[i] + 0.5);
    g.closePath();
    const [c0, c1, c2] = COLORS[C.kind], fmax = FOAM[C.kind][1];
    const cg = g.createLinearGradient(0, H - mean - fmax, 0, H - mean + 2);
    cg.addColorStop(0, c0); cg.addColorStop(0.45, c1); cg.addColorStop(1, c2);
    g.fillStyle = cg; g.fill();
    if (C.kind !== "cold") {
      g.save(); g.clip();
      g.globalAlpha = 0.5;
      g.fillStyle = g.createPattern(mottle(), "repeat");
      const off = (C.t * 6) % 160;
      g.translate(off, 0); g.fillRect(-off, H - mean - fmax * 2, W + 160, fmax * 3 + 40);
      g.restore();
    }
    // its top edge catches the light
    g.beginPath(); for (let i = 0; i < N; i++) g.lineTo(i * d, H - h[i] - fv[i]);
    if (C.kind === "cold") {
      const a = 0.55 + Math.sin(C.t * 2) * 0.25;
      g.strokeStyle = `rgba(127,200,248,${0.12 * a})`; g.lineWidth = 14; g.stroke();
      g.strokeStyle = `rgba(127,200,248,${0.3 * a})`; g.lineWidth = 5; g.stroke();
      g.strokeStyle = "rgba(200,236,255,.85)"; g.lineWidth = 1.4; g.stroke();
    } else {
      g.strokeStyle = "rgba(255,238,210,.55)"; g.lineWidth = 1.2; g.stroke();
    }
    // bubbles
    for (const b of C.bubs) {
      const i = col(b.x), y = H - h[i] - fv[i] + b.d * fv[i];
      if (b.pop) { g.strokeStyle = `rgba(255,240,215,${0.6 * (1 - b.pop / 0.18)})`; g.lineWidth = 0.8; g.beginPath(); g.arc(b.x, y, b.r * (1 + b.pop * 8), 0, 7); g.stroke(); continue; }
      g.fillStyle = "rgba(255,244,225,.14)"; g.strokeStyle = "rgba(255,240,215,.5)"; g.lineWidth = 0.7;
      g.beginPath(); g.arc(b.x, y, b.r, 0, 7); g.fill(); g.stroke();
      if (b.r > 1.6) { g.fillStyle = "rgba(255,250,240,.75)"; g.beginPath(); g.arc(b.x - b.r * 0.35, y - b.r * 0.35, b.r * 0.22, 0, 7); g.fill(); }
    }
  }
  // the stream: thick at the spout, thinner as it speeds up
  const D = C.drops;
  if (D.length > 1) {
    g.lineCap = "round";
    for (const [col0, wk, ox] of [["rgba(201,139,79,.18)", 1.9, 0], ["#6b3617", 1, 0], ["#a35f2c", 0.55, -0.12], ["rgba(255,214,160,.55)", 0.2, -0.28]]) {
      g.strokeStyle = col0;
      for (let i = 1; i < D.length; i++) {
        const a = D[i - 1], b = D[i];
        if (Math.hypot(b.x - a.x, b.y - a.y) > 46) continue; // broken off
        const w = clamp(10 - b.age * 7, 4.5, 10);
        g.lineWidth = w * wk;
        g.beginPath(); g.moveTo(a.x + ox * w, a.y); g.lineTo(b.x + ox * w, b.y); g.stroke();
      }
    }
  }
  g.fillStyle = "#8a4d24";
  for (const s of C.spl) { g.beginPath(); g.arc(s.x, s.y, s.r, 0, 7); g.fill(); }
}

// ---------- loop ----------
function frame(now) {
  C.raf = 0;
  if (!C.canvas || !C.canvas.isConnected) return;
  const dt = Math.min(0.033, (now - (C.last || now)) / 1000 || 0.016);
  C.last = now; C.t += dt;
  fit();
  { // the coffee follows the phone's gravity with a short delay (~0.3 s): it has some body
    const [ex, ey] = grav(), k = Math.min(1, dt * 3.5);
    C.lx += (ex - C.lx) * k; C.ly += (ey - C.ly) * k;
  }
  stepStream(dt); stepFluid(dt); spill(dt); stepFoam(dt); stepBubbles(dt);
  draw();
  if (!C.pouring && !C.drops.length && C.full === false) { C.full = true; if (C.onFull) C.onFull(); }
  const busy = C.pouring || C.drops.length || C.spl.length || energy() > 3 || performance.now() < C.liveUntil || C.bubs.some((b) => b.pop);
  if (busy && !C.resting && !document.hidden) C.raf = requestAnimationFrame(frame);
  else C.last = 0;
}
function wake(ms = 4000) {
  C.liveUntil = Math.max(C.liveUntil, performance.now() + ms);
  if (!C.raf && !C.resting && C.canvas && C.canvas.isConnected) { C.last = 0; C.raf = requestAnimationFrame(frame); }
}

// ---------- the outside ----------
export const coffee = {
  // Put the canvas in `box` (again after the layer is rebuilt; the coffee stays as it was).
  attach(box, { onFull, onDraw } = {}) {
    C.onFull = onFull; C.onDraw = onDraw;
    if (!C.canvas) { C.canvas = document.createElement("canvas"); C.canvas.className = "esp-canvas"; C.g = C.canvas.getContext("2d"); }
    box.prepend(C.canvas);
    C.W = C.H = 0; fit();
    if (!C.listening) { C.listening = true; addEventListener("devicemotion", onMotion); addEventListener("deviceorientation", onMotion); }
    C.last = 0; draw(); wake(1500);
  },
  detach() {
    if (C.listening) { C.listening = false; removeEventListener("devicemotion", onMotion); removeEventListener("deviceorientation", onMotion); }
    cancelAnimationFrame(C.raf); C.raf = 0;
  },
  // Pour until the coffee fills `frac` of the screen; temp 0..100 decides the crema.
  pour(frac, temp, still) {
    fit();
    C.kind = temp > 66 ? "hot" : temp < 33 ? "cold" : "warm";
    C.goal = Math.max(0, frac * C.W * C.H - volume());
    C.poured = 0; C.emitAcc = 0;
    C.rate = Math.max(C.goal / 14, 0.06 * C.W * C.H); // ~6% of the screen a second (at most 14 s)
    C.full = false;
    if (still) { // reduced motion: just there
      const lv = frac * C.H; C.h.fill(lv); C.fm.fill(FOAM[C.kind][0]); C.pouring = false; draw(); C.full = true; if (C.onFull) C.onFull(); return;
    }
    C.pouring = true; wake();
  },
  // A finger on the coffee: waves where it touches; dragging pushes the coffee along.
  poke(x, y, mx = 0, my = 0) {
    if (!C.N || volume() < 1) return;
    const k = col(x), near = clamp(1 - Math.abs(y - surfY(x)) / 260, 0.25, 1);
    const tap = !mx && !my, depth = (tap ? 34 : Math.min(26, 6 + Math.hypot(mx, my) * 1.2)) * near, d = dx();
    let moved = 0; // a dent under the finger; its coffee goes into a ring around it (so it's kept), then waves
    for (let j = -6; j <= 6; j++) { const i = k + j; if (i < 0 || i >= C.N) continue; const take = Math.min(C.h[i], depth * Math.exp(-(j * j) / 10)); C.h[i] -= take; moved += take; }
    const ring = []; for (let j = 7; j <= 13; j++) for (const i of [k - j, k + j]) if (i >= 0 && i < C.N) ring.push(i);
    for (const i of ring) C.h[i] += moved / ring.length;
    if (mx) for (let j = -5; j <= 5; j++) { const i = k + j; if (i >= 0 && i < C.N - 1) C.q[i] += mx * C.h[i] * 1.5; }
    void d;
    if (tap && C.kind !== "cold" && Math.random() < 0.6) addBubble(x, true);
    wake();
  },
  // How much coffee there is, as a share of the screen.
  amount() { return C.N ? volume() / (C.W * C.H) : 0; },
  rest(on) { C.resting = on; if (on) { cancelAnimationFrame(C.raf); C.raf = 0; } else wake(1500); },
};
